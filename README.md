# a2a-x402-wallet

> **Personal Agent Tool for the Agent First Ecosystem**
>
> `a2a-x402-wallet` is purpose-built for AI agents operating in the Agent First service ecosystem. It provides a fast, frictionless way for personal agents to authenticate, pay, and interact with other agents and services — all without manual intervention.

## Key Capabilities

| Feature | Description |
|---------|-------------|
| **A2A Standard** | Full support for the Agent-to-Agent (A2A) protocol — enabling seamless interoperability between agents and services |
| **X402 Payments** | Inter-agent payment signing via the x402 HTTP payment protocol — agents can pay other agents or services autonomously |
| **SIWE Authentication** | Sign-In With Ethereum (SIWE) support — cryptographically proves agent identity without passwords |
| **CLI as Agent Tool** | The `a2a-wallet` CLI is designed to be used directly by AI agents as a tool, enabling fully automated signing workflows |

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
3. Call `a2a-wallet x402 sign` to request x402 signing
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

### Install the CLI

**macOS / Linux**

```bash
curl -fsSL https://raw.githubusercontent.com/planetarium/a2a-x402-wallet/main/scripts/install.sh | sh
```

**Windows** — Download `a2a-wallet-windows-x64.exe` from the [Releases](https://github.com/planetarium/a2a-x402-wallet/releases/latest) page, rename it to `a2a-wallet.exe`, and place it in a folder on your PATH.

**Build from source** (requires Node.js >= 22)

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
