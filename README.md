# a2a-x402-wallet

A monorepo for an x402 payment signing service supporting the A2A (Agent-to-Agent) protocol.

Users connect their wallet via the web app and perform x402 payment signing through the CLI. AI Agents can use the CLI as a Tool to automatically generate signed `PaymentPayload` objects whenever x402 payment is required.

## Structure

```
a2a-x402-wallet/
├── apps/
│   ├── web/          # Next.js web app (Privy wallet, signing API)
│   └── cli/          # CLI tool (a2a-wallet)
├── packages/
│   └── x402/         # Shared x402 protocol types and utilities
└── docs/
    ├── a2a-x402-spec-v0.2.md   # A2A x402 protocol specification
    └── cli-requirements.md     # CLI requirements document
```

## How It Works

```
User (web login)
  └─► Issue accessToken (JWT)
        └─► Save token to CLI
              └─► Agent or user calls CLI to sign
                    └─► Web app API signs via Privy wallet
                          └─► Return PaymentPayload
```

1. User logs in with Privy (social or email) and delegates their embedded wallet to the backend
2. Issue accessToken (JWT) and save it to the CLI
3. Call `a2a-wallet sign` to request x402 signing
4. Web app performs EIP-712 signing via the user's wallet and returns a `PaymentPayload`

## Quick Start

### Install dependencies

```bash
pnpm install
```

### Run the web app

```bash
cd apps/web
cp .env.example .env
# Fill in environment variables
pnpm dev
```

### Build the CLI

```bash
pnpm --filter a2a-x402-wallet-cli build
npm install -g ./apps/cli
```

See each app's README for details:
- [apps/web/README.md](apps/web/README.md) — Web app
- [apps/cli/README.md](apps/cli/README.md) — CLI

## Packages

| Package | Description |
|---------|-------------|
| `apps/web` | Next.js wallet service (Privy + x402 signing API) |
| `apps/cli` | x402 signing CLI tool (`a2a-wallet`) |
| `packages/x402` | Shared x402 protocol types and utilities |

## References

- [x402 Protocol](https://x402.org)
- [A2A Protocol](https://a2a-protocol.org)
- [A2A x402 Extension Spec v0.2](docs/a2a-x402-spec-v0.2.md)
