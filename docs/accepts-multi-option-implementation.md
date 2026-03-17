# x402 `accepts` 다중 결제 옵션 — 구현 분석 및 요구사항 명세

> 기준 스펙: A2A x402 Extension v0.2
> 작성일: 2026-03-16

---

## 1. 개요

x402 프로토콜에서 Merchant Agent는 단일 결제 수단을 강제하지 않는다. 대신
`x402PaymentRequiredResponse` 객체 안의 **`accepts` 배열**을 통해 복수의
`PaymentRequirements` 옵션을 제공하고, Client Agent는 그 중 하나를 선택하여 서명한다.

CLI의 사용자는 Agent이므로, 옵션 선택은 Agent가 직접 수행한다. 이 문서는 표준 스펙의
데이터 구조와 현재 구현의 차이를 분석하고, 완전한 구현을 위해 필요한 작업을 기술한다.

---

## 2. 표준 스펙 구조 분석

### 2.1 `x402PaymentRequiredResponse`

Merchant가 Client에게 전달하는 최상위 결제 요청 객체다.

```json
{
  "x402Version": 1,
  "accepts": [
    {
      "scheme": "exact",
      "network": "base",
      "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913",
      "payTo": "0xMerchantWalletAddress",
      "maxAmountRequired": "120000000"
    },
    {
      "scheme": "exact",
      "network": "base-sepolia",
      "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      "payTo": "0xMerchantWalletAddress",
      "maxAmountRequired": "120000000"
    }
  ]
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `x402Version` | `number` | 필수 | 프로토콜 버전 (현재 `1`) |
| `accepts` | `PaymentRequirements[]` | 필수 | Merchant가 수락 가능한 결제 옵션 목록 |

### 2.2 `PaymentRequirements` (단일 옵션)

`accepts` 배열의 각 원소. 현재 `packages/x402/src/index.ts`에 정의된 타입과 동일하다.

```typescript
interface PaymentRequirements {
  scheme: string;              // 결제 방식. 현재 "exact"만 지원
  network: string;             // 블록체인 네트워크 (e.g. "base", "base-sepolia")
  asset: `0x${string}`;        // ERC-20 토큰 컨트랙트 주소
  payTo: `0x${string}`;        // 수신 지갑 주소 (Merchant)
  maxAmountRequired: string;   // 최대 결제 금액 (토큰 최소 단위)
  maxTimeoutSeconds?: number;  // 서명 유효 시간 (초)
  resource?: string;           // 결제 대상 리소스 URI
  description?: string;        // 사람이 읽을 수 있는 설명
  mimeType?: string;
  outputSchema?: unknown;
  estimatedProcessingTime?: number;
  extra?: Record<string, unknown>; // EIP-712 도메인 메타데이터 등
}
```

### 2.3 Standalone Flow에서의 전달 위치

```
task.status.message.metadata
  ├── "x402.payment.status": "payment-required"
  └── "x402.payment.required": x402PaymentRequiredResponse   ← accepts 배열 포함
```

### 2.4 Embedded Flow (AP2)에서의 전달 위치

```
task.artifacts[].parts[].data
  └── "ap2.mandates.CartMandate"
        └── payment_request.method_data[].data
              └── x402PaymentRequiredResponse   ← accepts 배열 포함
```

---

## 3. 현재 구현과 표준의 차이 (Gap Analysis)

### 3.1 `packages/x402` — 타입 누락

**현재 상태:** `PaymentRequirements` 단일 타입만 export됨.

**누락 타입:**
```typescript
// 존재하지 않음
interface X402PaymentRequiredResponse {
  x402Version: number;
  accepts: PaymentRequirements[];
}
```

**영향:** 이 타입이 없으면 Merchant 구현체와 Client Agent 파싱 로직 모두 자체적으로
정의해야 하므로 상호운용성이 깨진다.

---

### 3.2 `apps/web` — `/api/x402/sign` 엔드포인트

**현재 상태:**
```typescript
// apps/web/src/app/api/x402/sign/route.ts:63-66
const body = await req.json() as {
  paymentRequirements?: PaymentRequirements;  // 단일 객체만 수신
  validForSeconds?: number;
};
```

Agent가 `accepts` 배열에서 선택한 하나의 `PaymentRequirements`를 직접 전달하는
방식이므로 **이 엔드포인트 자체는 변경 불필요하다.**

Agent는 다음 순서로 동작한다:
1. `x402PaymentRequiredResponse`에서 `accepts` 배열을 수신
2. Agent가 자체 판단으로 옵션 하나를 선택
3. 선택한 `PaymentRequirements` 하나를 `/api/x402/sign`에 전달
4. 서명된 `PaymentPayload`를 수신하여 Merchant에게 제출

---

## 4. 구현 요구사항

### 4.1 `packages/x402` — 타입 추가

#### 4.1.1 `X402PaymentRequiredResponse` 타입 추가

```typescript
export interface X402PaymentRequiredResponse {
  x402Version: number;
  accepts: PaymentRequirements[];
}
```

이 타입을 export하면 Agent 구현체와 Merchant 구현체가 공통 타입을 참조할 수 있다.

---

### 4.2 Merchant Agent 측 구현 참고사항

이 저장소는 주로 Client(Agent) 측이지만, `accepts` 배열을 올바르게 구성하는 Merchant
구현체를 위한 참고 가이드.

#### 4.2.1 `accepts` 배열 구성 원칙

- **mainnet 옵션은 testnet 옵션보다 앞에** 배치한다 (Agent가 별도 선호 로직 없을 때 첫 번째 선택).
- **같은 네트워크 내에서** USDC를 먼저, 다른 스테이블코인을 뒤에 배치한다.
- 동일한 `payTo` 주소라도 네트워크별로 별개의 옵션을 제공해야 한다.

```json
{
  "x402Version": 1,
  "accepts": [
    {
      "scheme": "exact",
      "network": "base",
      "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "payTo": "0xMerchant",
      "maxAmountRequired": "1000000",
      "extra": { "name": "USDC", "version": "2" }
    },
    {
      "scheme": "exact",
      "network": "base-sepolia",
      "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      "payTo": "0xMerchant",
      "maxAmountRequired": "1000000",
      "extra": { "name": "USDC", "version": "2" }
    }
  ]
}
```

#### 4.2.2 `extra` 필드 활용

EIP-712 서명 시 토큰 컨트랙트의 도메인 메타데이터(`name`, `version`)가 필요하다.
Merchant는 이를 `extra` 필드에 포함시켜야 Agent가 별도 온체인 조회 없이 서명할 수 있다.

```json
"extra": {
  "name": "USDC",
  "version": "2"
}
```

> 현재 `packages/x402`의 `getTokenMetadata()`는 알려진 USDC 주소에 대해서만 자동으로
> 메타데이터를 반환한다. 커스텀 토큰은 반드시 `extra`를 통해 제공해야 한다.

#### 4.2.3 Merchant의 taskId 기반 상태 관리

Merchant는 `taskId`를 키로 하여 원래 전송한 `accepts` 배열을 저장해야 한다.
Client Agent로부터 `payment-submitted`를 수신했을 때:

1. `taskId`로 원래 `accepts` 배열 조회
2. 수신한 `PaymentPayload`의 `(network, asset, payTo, amount)`가 `accepts` 배열의
   어느 옵션과 일치하는지 확인
3. 일치하는 옵션으로만 settlement 처리

---

## 5. 타입 정의 전체 요약

`packages/x402/src/index.ts`에 추가되어야 할 타입:

```typescript
export interface X402PaymentRequiredResponse {
  x402Version: number;
  accepts: PaymentRequirements[];
}
```

---

## 6. A2A 메타데이터 키 요약

| 키 | 위치 | 값 타입 | 설명 |
|----|------|---------|------|
| `x402.payment.status` | `message.metadata` | `string` | 결제 상태 |
| `x402.payment.required` | `message.metadata` | `X402PaymentRequiredResponse` | Standalone Flow 요청 |
| `x402.payment.payload` | `message.metadata` | `PaymentPayload` | Standalone Flow 응답 |
| `x402.payment.receipts` | `message.metadata` | `X402SettleResponse[]` | 정산 결과 |
| `x402.payment.error` | `message.metadata` | `string` | 에러 코드 |

**`x402.payment.status` 값:**

```
payment-required → payment-submitted → payment-verified → payment-completed
                → payment-rejected
                                                         → payment-failed
```

---

## 7. 구현 우선순위 및 작업 목록

| 우선순위 | 작업 | 위치 |
|---------|------|------|
| P0 | `X402PaymentRequiredResponse` 타입 export | `packages/x402` |
| P1 | Merchant 측 `accepts` 배열 검증 로직 (taskId 기반) | Merchant 구현체 |

---

## 8. 참고 자료

- [A2A x402 Extension Spec v0.2](../docs/a2a-x402-spec-v0.2.md)
- [x402 Protocol Specification — Data Types](https://github.com/coinbase/x402?tab=readme-ov-file#data-types)
- [EIP-3009: Transfer With Authorization](https://eips.ethereum.org/EIPS/eip-3009)
- [EIP-712: Typed structured data hashing and signing](https://eips.ethereum.org/EIPS/eip-712)
