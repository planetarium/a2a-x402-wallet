---
name: a2a-wallet
description: >
  Use the a2a-wallet CLI to interact with A2A agents — send messages, stream responses,
  and manage tasks. Also supports x402 payment signing and local wallet management.
  Trigger when the user needs to: send a message to an A2A agent, search for or discover agents
  in the registry, sign an x402 payment, manage local wallets, check their wallet address or
  balance, or configure the a2a-wallet CLI.
compatibility: >
  Requires a2a-wallet CLI to be installed. macOS (Apple Silicon, Intel),
  Linux (x64, arm64), Windows (x64). See INSTALL.md for setup instructions.
metadata:
  author: planetarium
  repository: https://github.com/planetarium/a2a-x402-wallet
---

# a2a-wallet Skill

If a command fails with a "command not found" error, refer to **[INSTALL.md](./INSTALL.md)** in this directory and guide the user through installation.

## Commands

| Command | Description |
|---------|-------------|
| `a2a` | A2A protocol client: `auth`, `list`, `disconnect`, `card`, `send`, `stream`, `tasks`, `cancel` |
| `registry` | Agent registry: `search` (find agents), `register` (register an agent by agent card URL) |
| `x402 sign` | Sign x402 PaymentRequirements → A2A message metadata (for paywalled agents) |
| `wallet` | Manage local wallets: `create`, `import`, `list`, `use`, `export`, `connect`, `disconnect` |
| `status` | Show default wallet address and web app URL |
| `config` | Get or set config values (`token`, `url`) |
| `balance` | Show USDC balance for the active wallet on a given network |
| `faucet` | Request testnet USDC (Base Sepolia) directly from the CLI — no browser or auth required |
| `update` | Update the CLI binary |

## Finding Agents

Use the `registry search` command to discover A2A agents by keyword or capability:

Examples:
```bash
a2a-wallet registry search --json "image generation"
```

The registry returns matching agents with their name, description, and `agentCardUrl`. You can pass the `agentCardUrl` directly to any agent command — no need to strip the path:

```bash
# Inspect before interacting
a2a-wallet a2a card https://my-agent.example.com/.well-known/agent-card.json

# Send a message using the agentCardUrl from registry search
a2a-wallet a2a send https://my-agent.example.com/.well-known/agent-card.json "Hello"
```

To register a new agent in the registry:
```bash
a2a-wallet registry register <agent-card-url>
```

---

## Sending Messages

```bash
a2a-wallet a2a send <url|agentCardUrl> "message"     # wait for full response
a2a-wallet a2a stream <url|agentCardUrl> "message"   # stream response via SSE
```

`<url|agentCardUrl>` accepts either an agent base URL or an agent card URL (e.g. `agentCardUrl` from `registry search`).

**Options** (`send` and `stream` unless noted):

| Option | Description |
|--------|-------------|
| `--context-id <id>` | Continue an existing conversation context (omit to start a new one) |
| `--task-id <id>` | Target a specific task — required when resuming a paused task or submitting x402 payment (`send` only) |
| `--metadata <json>` | JSON metadata to attach (e.g. x402 payment payload) (`send` only) |
| `--file <path\|uri>` | Attach a file; repeatable. Local path → base64-embedded, `http(s)://` → URL reference |
| `--bearer <token>` | Bearer token for agent authentication |
| `--allow-x402` | Auto-sign and resubmit if agent responds with payment-required |
| `--json` | Machine-readable output |

---

## Agent Card Extensions

Before interacting with an A2A agent, inspect its card to check which extensions are declared:

```bash
# Base URL — appends /.well-known/agent-card.json automatically
a2a-wallet a2a card https://my-agent.example.com

# Full agent card URL (e.g. from registry search) — used as-is
a2a-wallet a2a card https://my-agent.example.com/.well-known/agent-card.json
```

The `capabilities.extensions` array in the card lists supported (and possibly required) extensions. The following extension is relevant to this CLI:

---

### x402 Payments Extension

**Extension URI**: `https://github.com/google-agentic-commerce/a2a-x402/blob/main/spec/v0.2`

Agents declaring this extension monetize their services via on-chain cryptocurrency payments. If `required: true`, the client **must** implement the x402 flow.

**How to detect**: The agent card will contain:

```json
{
  "capabilities": {
    "extensions": [
      {
        "uri": "https://github.com/google-agentic-commerce/a2a-x402/blob/main/spec/v0.2",
        "required": true
      }
    ]
  }
}
```

**Payment flow (automatic)**:

Use `--allow-x402` with `send` or `stream` to handle the entire flow automatically — the CLI detects the payment request, signs it, and resubmits without any extra steps:

```bash
a2a-wallet a2a send --allow-x402 https://my-agent.example.com "Hello"
a2a-wallet a2a stream --allow-x402 https://my-agent.example.com "Hello"
```

**Payment flow (manual)**:
1. Send a message → agent replies with `task.status = input-required` and `metadata["x402.payment.status"] = "payment-required"` plus `metadata["x402.payment.required"]` containing `PaymentRequirements`
2. Sign the requirements with `x402 sign`:
   ```bash
   METADATA=$(a2a-wallet x402 sign \
     --scheme exact \
     --network base \
     --asset <token-address> \
     --pay-to <merchant-address> \
     --amount <amount> \
     --extra-name <eip712-domain-name> \
     --extra-version <eip712-domain-version> \
     --json)
   ```
3. Submit payment by sending back with `--task-id` and `--metadata`:
   ```bash
   a2a-wallet a2a send \
     --task-id <task-id> \
     --metadata "$METADATA" \
     https://my-agent.example.com "Payment submitted"
   ```

---

## SECURITY WARNING — READ BEFORE SETTING UP A WALLET

**Always present the following warnings to the user before creating or importing any wallet.**

### Local Wallet Risk

The local wallet stores the private key as a **plain file on disk** (`~/.a2a-wallet/`). As an AI agent using this CLI, you have direct filesystem access — which means the key file is accessible to the agent runtime and any other process on the machine.

- **Do NOT create or use a local wallet that holds significant assets.**
- **Do NOT import or restore a wallet that holds significant assets** into this CLI.
- If the key file is read by any unauthorized process or leaks for any reason, **all assets are permanently unrecoverable**. The user bears full responsibility.

**Local wallets are intended for small micro-payments only. Always inform the user of these risks and confirm they accept responsibility before proceeding.**

### Legal Notice

> [!CAUTION]
> **This software is experimental and intended for testing and development purposes only. Do not use it with production funds or significant on-chain assets.**

THIS SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND. THE AUTHORS, CONTRIBUTORS, AND OPERATORS OF THIS PROJECT SHALL NOT BE LIABLE FOR ANY LOSS OF FUNDS, LOSS OF DATA, UNAUTHORIZED ACCESS TO CRYPTOGRAPHIC KEYS, SERVICE INTERRUPTION, OR ANY OTHER DAMAGES ARISING FROM USE OF THIS SOFTWARE.

When setting up a wallet, confirm the user understands and accepts the following:

- They are using **experimental software** at their own risk.
- They will **not store significant assets** in any wallet managed by this tool.
- Any loss is **solely their responsibility** — no compensation or recovery is possible.
- The project maintainers provide **no guarantees** of security, uptime, or correctness.

---

## Wallet selection

The CLI uses **local wallets** — private key stored locally (`wallet create` / `wallet import`). No login required. **Key is stored as a plain file — use only for small amounts.**

Switch the active wallet with:

```bash
a2a-wallet wallet use <name>   # set a local wallet as default
```

Check current status at any time:

```bash
a2a-wallet status
```

## Agent usage tips

- Use `--json` for machine-readable output
- Errors → stderr, exit `0` = success, `1` = failure
- Use `a2a-wallet --help` or `a2a-wallet <command> --help` to discover options at any time
