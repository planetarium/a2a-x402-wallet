# a2a-x402-wallet

> **Personal Agent Tool for the Agent First Ecosystem**
>
> `a2a-x402-wallet` is purpose-built for AI agents operating in the Agent First service ecosystem. It provides a fast, frictionless way for personal agents to authenticate, pay, and interact with other agents and services — all without manual intervention.

## Key Capabilities

| Feature | Description |
|---------|-------------|
| **A2A Standard** | Full support for the Agent-to-Agent (A2A) protocol — enabling seamless interoperability between agents and services |
| **X402 Payments** | Inter-agent payment signing via the x402 HTTP payment protocol — agents can pay other agents or services autonomously |
| **A2A Agent Connectivity** | Connect to external A2A agents via device flow OAuth2 — authenticate once and interact seamlessly across sessions |
| **CLI as Agent Tool** | The `a2a-wallet` CLI is designed to be used directly by AI agents as a tool, enabling fully automated signing workflows |

Users create a local wallet with the CLI and perform x402 payment signing locally. AI Agents can use the CLI as a Tool to automatically generate signed `PaymentPayload` objects whenever x402 payment is required. A custodial option is also available via the web app for users who prefer server-side signing.

## Security Warning

> [!WARNING]
> **Using this tool involves real cryptographic keys and on-chain assets. Read this section carefully before proceeding.**

### Local Wallet

The local wallet stores your private key as a **plain file on disk** (`~/.a2a-wallet/`). When used as an AI agent tool, the agent runtime has full access to the local filesystem and can read this file.

- **Do NOT store significant amounts of assets** in a local wallet used with this CLI.
- **Do NOT import or restore a wallet that holds significant assets** into this CLI.
- Any key stored here is only as secure as the machine and any agent/process that has filesystem access.
- If a private key is leaked or stolen, **all assets in that wallet are unrecoverable**. Responsibility lies entirely with the user.

### Custodial Wallet

The custodial wallet option uses [Privy](https://privy.io) for server-side key management. While Privy is a reputable provider, **this project does not guarantee the security of your custodial wallet**. The key management infrastructure is operated by a third party and by this project's web service.

- **Do NOT store significant amounts of assets** in the custodial wallet.
- Security incidents, service outages, or misconfigurations could result in loss of funds. Responsibility lies entirely with the user.

**These wallets are intended for small, automated micro-payments. Treat them as hot wallets with a limited balance — not as a primary or savings wallet.**

### Legal Notice

> [!CAUTION]
> **This software is experimental and intended for testing and development purposes only. Do not use it with production funds or significant on-chain assets.**

THIS SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. IN NO EVENT SHALL THE AUTHORS, CONTRIBUTORS, OR OPERATORS OF THIS PROJECT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING OUT OF THE USE OF THIS SOFTWARE, INCLUDING BUT NOT LIMITED TO LOSS OF FUNDS, LOSS OF DATA, UNAUTHORIZED ACCESS TO CRYPTOGRAPHIC KEYS, OR SERVICE INTERRUPTION.

By using this software, you acknowledge and agree that:

- You are using **experimental software** entirely at your own risk.
- You will **not store significant assets** in any wallet managed by this tool.
- Any loss of funds resulting from use of this software — including key theft, service failure, software bugs, or misuse — is **solely your responsibility**.
- The project maintainers provide **no guarantees** of security, uptime, or correctness.

## Quick Start

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

### Install the Agent Skill

```bash
npx skills add planetarium/a2a-x402-wallet
```

Supports Claude Code, Cursor, GitHub Copilot, Gemini CLI, and any [Agent Skills](https://agentskills.io)-compatible runtime.

### Run the web app

```bash
cd apps/web
cp .env.example .env
# Fill in environment variables (see apps/web/README.md)
pnpm db:migrate   # requires DATABASE_URL
pnpm dev
```

See each app's README for details:
- [apps/web/README.md](apps/web/README.md) — Web app
- [apps/cli/README.md](apps/cli/README.md) — CLI

## Structure

```
a2a-x402-wallet/
├── apps/
│   ├── web/          # Next.js web app (Privy wallet, signing API, settings)
│   └── cli/          # CLI tool (a2a-wallet)
├── packages/
│   └── x402/         # Shared x402 protocol types and utilities
├── skills/
│   └── a2a-wallet/   # Agent Skill (YAML + Markdown, for Claude Code etc.)
└── docs/
    ├── a2a-x402-spec-v0.2.md         # A2A x402 protocol specification
    └── siwe-bearer-auth/v0.1/SPEC.md # SIWE Bearer Auth extension spec
```

## How It Works

**Local wallet (default)**

```
User runs `wallet create`
  └─► Private key stored locally (~/.a2a-wallet/)
        └─► Agent or user calls CLI to sign
              └─► CLI signs locally with the private key
                    └─► Return PaymentPayload
```

**Custodial wallet (optional)**

```
User logs in via `wallet connect` (web app)
  └─► Issue accessToken (JWT)
        └─► Save token to CLI
              └─► Agent or user calls CLI to sign
                    └─► Web app API signs via Privy wallet
                          └─► Return PaymentPayload
```

**Local wallet steps:**
1. Run `a2a-wallet wallet create` to generate a local key (set as default automatically)
2. Call `a2a-wallet x402 sign` — signing happens locally, no network request required

**Custodial wallet steps:**
1. User logs in with Privy (social or email) and delegates their embedded wallet to the backend
2. Issue accessToken (JWT) and save it to the CLI via `wallet connect`
3. Call `a2a-wallet x402 sign` to request x402 signing
4. Web app performs EIP-712 signing via the user's wallet and returns a `PaymentPayload`

## Connecting to A2A Agents

To authenticate with an A2A agent and send messages:

```bash
# 1. Authenticate (device flow)
a2a-wallet a2a auth https://my-agent.example.com
# → open URL in browser (user_code is shown in URL), then:
a2a-wallet a2a auth https://my-agent.example.com --user-code WDJB-MJHT

# 2. Send a message
a2a-wallet a2a send https://my-agent.example.com "Hello"
```

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
