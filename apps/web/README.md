# a2a-x402-wallet-web

An x402 payment signing service built with Next.js App Router, using Privy embedded wallets for server-side signing.

Users log in via the web, delegate their wallet to the backend, and receive an accessToken (JWT). The CLI or an Agent uses this token to call the signing API, which performs EIP-712 signing on behalf of the user and returns a `PaymentPayload`.

## How It Works

```
1. User logs in with Privy (social or email)
2. Embedded wallet is created and delegated to the backend
3. Call /api/auth/token with Privy token → receive accessToken (JWT)
4. Call /api/x402/sign with accessToken → receive PaymentPayload
```

## API

All endpoints require an `Authorization: Bearer <token>` header.

### `POST /api/auth/token`

Exchanges a Privy auth token for an accessToken (JWT). Requires a delegated embedded wallet.

**Authorization**: Privy token

**Request**: no body

**Response**:
```json
{ "token": "eyJhbGci..." }
```

**Errors**:
- `400` — No delegated embedded wallet found
- `401` — Invalid Privy token

---

### `GET /api/me`

Returns the authenticated user's information for the current accessToken.

**Authorization**: accessToken (JWT)

**Response**:
```json
{ "user": { ... } }
```

---

### `POST /api/x402/sign`

Signs x402 `PaymentRequirements` and returns a `PaymentPayload`. Uses ERC-3009 TransferWithAuthorization (EIP-712).

**Authorization**: accessToken (JWT)

**Request body**:
```json
{
  "paymentRequirements": {
    "scheme": "exact",
    "network": "base",
    "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913",
    "payTo": "0xMerchantAddress",
    "maxAmountRequired": "120000000"
  },
  "validForSeconds": 3600
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `scheme` | Yes | Must be `"exact"` |
| `network` | Yes | `base`, `base-sepolia`, `ethereum`, `optimism`, `arbitrum` |
| `asset` | Yes | ERC-20 token contract address |
| `payTo` | Yes | Merchant wallet address |
| `maxAmountRequired` | Yes | Payment amount in token's smallest unit (string) |
| `validForSeconds` | No | Signature validity duration in seconds (default: `3600`) |

**Response**:
```json
{
  "x402Version": 1,
  "scheme": "exact",
  "network": "base",
  "payload": {
    "signature": "0x...",
    "authorization": {
      "from": "0xUserWallet",
      "to": "0xMerchantAddress",
      "value": "120000000",
      "validAfter": "0",
      "validBefore": "1234567890",
      "nonce": "0x..."
    }
  }
}
```

**Errors**:
- `400` — Missing required fields or unsupported scheme/network
- `401` — Missing or expired token
- `500` — Signing failed

---

## Setup

### 1. Install dependencies

```bash
# From the monorepo root
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy app ID (client-side) |
| `PRIVY_APP_ID` | Privy app ID (server-side) |
| `PRIVY_APP_SECRET` | Privy app secret |
| `PRIVY_AUTHORIZATION_KEY_ID` | Privy delegation signing key ID (server-side) |
| `NEXT_PUBLIC_PRIVY_AUTHORIZATION_KEY_ID` | Privy delegation signing key ID (client-side) |
| `PRIVY_AUTHORIZATION_PRIVATE_KEY` | Private key for delegation signing |
| `JWT_SECRET` | Secret for signing accessTokens |
| `JWT_EXPIRATION_TIME` | accessToken expiry (default: `3650d`) |

### 3. Run development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), log in, and delegate your wallet.

### 4. Build

```bash
pnpm build
```

## Tech Stack

- **Next.js 16** (App Router)
- **Privy** — Embedded wallets, social login, server-side signing
- **jose** — JWT signing and verification
- **Tailwind CSS**
- **TypeScript**
