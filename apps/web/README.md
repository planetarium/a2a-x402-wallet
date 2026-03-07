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

All endpoints require an `Authorization: Bearer <token>` header unless stated otherwise.

### Device Flow (agent / headless login)

A two-step flow that lets an agent obtain a token without a local callback server.
Implemented as a simplified [RFC 8628](https://www.rfc-editor.org/rfc/rfc8628) Device Authorization Grant using a UUID nonce.

```
1. CLI calls POST /api/auth/device/start  →  receives { nonce, loginUrl }
2. Agent relays loginUrl to the user
3. User opens loginUrl in a browser, signs in, and delegates their wallet
4. Browser calls POST /api/auth/device/complete (same-origin only) to exchange the Privy token
5. CLI polls GET /api/auth/device/poll?nonce=… until status === "complete"
6. CLI saves the returned token
```

#### `POST /api/auth/device/start`

Creates a device login session and returns a login URL. No authentication required.

**Request**: no body

**Response**:
```json
{ "nonce": "uuid-v4", "loginUrl": "https://…/device-login?nonce=uuid-v4" }
```

---

#### `GET /api/auth/device/poll?nonce=<nonce>`

Polls for login completion. No authentication required.

**Response (pending)**:
```json
{ "status": "pending" }
```

**Response (complete)**:
```json
{ "status": "complete", "token": "eyJhbGci…" }
```

**Errors**:
- `400` — Missing or invalid `nonce` query parameter (must be a UUID v4)
- `404` — Nonce expired or not found

---

#### `POST /api/auth/device/complete`

Completes the device session by exchanging a Privy token for an accessToken.
**Same-origin requests only** — the `Origin` header must match the server's own host (CSRF protection).

**Request body**:
```json
{ "nonce": "uuid-v4", "privyToken": "<privy-access-token>" }
```

**Response**:
```json
{ "ok": true }
```

**Errors**:
- `400` — Missing `nonce` or `privyToken`, or no delegated embedded wallet
- `401` — Invalid Privy token
- `403` — Request origin does not match server origin
- `404` — Nonce expired or not found

---

### `POST /api/sign`

Signs an arbitrary message with the user's embedded wallet (EIP-191 personal_sign).

**Authorization**: accessToken (JWT)

**Request body**:
```json
{ "message": "Hello, world!" }
```

| Field | Required | Description |
|-------|----------|-------------|
| `message` | Yes | Arbitrary string to sign |

**Response**:
```json
{ "signature": "0x..." }
```

**Errors**:
- `400` — Missing `message`
- `401` — Missing or expired token
- `500` — Signing failed

---

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
| `JWT_EXPIRATION_TIME` | accessToken expiry (default: `5m`) |
| `NEXT_PUBLIC_APP_URL` | Public URL of this app, used to build device-login URLs (required in production) |

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
