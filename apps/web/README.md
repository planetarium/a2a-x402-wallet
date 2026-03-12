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

### `POST /api/faucet`

Sends 1 testnet USDC (Base Sepolia) to the authenticated user's wallet. Rate-limited to prevent abuse.

**Authorization**: Privy token

**Request**: no body

**Response**:
```json
{ "transaction": "0x..." }
```

**Errors**:
- `400` — Wallet balance is already above the threshold (0.1 USDC)
- `401` — Invalid Privy token
- `500` — Transfer failed

---

### `POST /api/graphql`

GraphQL API for user settings and payment limits. Uses `graphql-yoga`.

**Authorization**: Privy token

**Queries**:
- `userSettings` — Returns `{ jwtExpiresIn }` (current per-user JWT expiry override; `null` means server default)
- `paymentLimits` — Returns list of `{ network, asset, maxAmount, isDefault }` entries

**Mutations**:
- `setJwtExpiresIn(value: String)` — Set or clear per-user JWT expiry override. Format: `5m`, `1h`, `24h`, `7d`. Pass `null` to revert to server default.
- `setPaymentLimit(network, asset, maxAmount)` — Upsert a payment limit for a token
- `deletePaymentLimit(network, asset)` — Remove a payment limit

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

## A2A Agent

The web app exposes itself as an A2A agent, allowing CLI tools and other agents to connect and interact with it. External clients can discover the agent's capabilities via its agent card, authenticate using the A2A device flow, and send A2A messages using the obtained token.

- **Agent card**: `GET /.well-known/agent.json` — returns the AgentCard declaring the device flow security scheme
- **A2A endpoint**: `POST /api/a2a` — A2A JSON-RPC endpoint (requires Bearer token obtained via A2A device flow)

### A2A Device Flow

A flow that lets an external CLI or agent authenticate with this web app as an A2A service. Follows [RFC 8628](https://www.rfc-editor.org/rfc/rfc8628) (OAuth 2.0 Device Authorization Grant).

#### `POST /a2a/device/start`

Creates an A2A device session for external clients to authenticate.

**Request** (`application/x-www-form-urlencoded`):
```
client_id=a2a-wallet
```

**Response**:
```json
{
  "device_code": "uuid-v4",
  "user_code": "WDJB-MJHT",
  "verification_uri": "https://…/a2a/login",
  "verification_uri_complete": "https://…/a2a/login?user_code=WDJB-MJHT",
  "expires_in": 300,
  "interval": 5
}
```

---

#### `POST /a2a/device/token`

Polls for login completion (RFC 8628 token endpoint).

**Request** (`application/x-www-form-urlencoded`):
```
grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Adevice_code
&device_code=uuid-v4
&client_id=a2a-wallet
```

**Response (pending)** — HTTP 400:
```json
{ "error": "authorization_pending" }
```

**Response (complete)** — HTTP 200:
```json
{ "access_token": "sk-…", "token_type": "bearer" }
```

**Response (expired)** — HTTP 400:
```json
{ "error": "expired_token" }
```

**Other errors** — HTTP 400: `slow_down`, `access_denied`, `invalid_request`

---

#### `GET /a2a/login?user_code=<user_code>`

Login page shown in the browser when the user opens the `verification_uri_complete` URL.

---

To connect using the CLI:
```bash
a2a-wallet a2a auth https://your-app.example.com
```

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
| `JWT_EXPIRATION_TIME` | Server-default accessToken expiry (default: `5m`). Users can override this per-account in Settings. |
| `NEXT_PUBLIC_APP_URL` | Public URL of this app, used to build device-login URLs (required in production) |
| `DATABASE_URL` | PostgreSQL connection string (used for device code store, payment limits, and user settings) |
| `FAUCET_ADMIN_WALLET_ID` | Privy wallet ID of the faucet admin wallet (Base Sepolia) |
| `FAUCET_ADMIN_ADDRESS` | Ethereum address corresponding to `FAUCET_ADMIN_WALLET_ID` |

### 3. Set up the database

A PostgreSQL database is required for the device code store, payment limits, and user settings.

```bash
# Run database migrations
pnpm db:migrate
```

### 4. Run development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), log in, and delegate your wallet.

### 5. Build

```bash
pnpm build
```

## Tech Stack

- **Next.js 15** (App Router)
- **Privy** — Embedded wallets, social login, server-side signing
- **PostgreSQL** — Device code store, payment limits, user settings
- **Drizzle ORM** — Database schema and migrations
- **graphql-yoga** — GraphQL API for settings/limits
- **jose** — JWT signing and verification
- **Tailwind CSS**
- **TypeScript**
