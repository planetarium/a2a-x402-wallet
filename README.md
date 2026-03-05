# a2a-x402-wallet

A Next.js wallet service that enables backend signing of Ethereum messages via [Privy](https://privy.io) embedded wallets. Designed for agent-to-agent (A2A) payment flows using the [x402](https://x402.org) protocol.

## How It Works

1. User logs in with Privy (social or email)
2. User delegates their embedded wallet to the backend signer
3. Backend receives a JWT and can sign messages on behalf of the user

## API

All endpoints require a `Bearer` token in the `Authorization` header.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/token` | Privy token | Exchange Privy auth token for a JWT (requires delegated wallet) |
| `GET` | `/api/me` | JWT | Get current user info |
| `POST` | `/api/sign` | JWT | Sign a message with the user's delegated wallet |

### `POST /api/sign`
```json
// Request
{ "message": "hello" }

// Response
{ "signature": "0x..." }
```

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy app ID (public) |
| `PRIVY_APP_ID` | Privy app ID (server) |
| `PRIVY_APP_SECRET` | Privy app secret |
| `PRIVY_AUTHORIZATION_KEY_ID` | Privy authorization key ID |
| `NEXT_PUBLIC_PRIVY_AUTHORIZATION_KEY_ID` | Privy authorization key ID (public) |
| `PRIVY_AUTHORIZATION_PRIVATE_KEY` | Private key for server-side signing delegation |
| `JWT_SECRET` | Secret for signing JWTs |
| `JWT_EXPIRATION_TIME` | JWT expiry (default: `3650d`) |

### 3. Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), log in, and delegate your wallet to the backend.
