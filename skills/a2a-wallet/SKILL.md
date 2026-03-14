---
name: a2a-wallet
description: >
  Use the a2a-wallet CLI to interact with A2A agents — send messages, stream responses,
  and manage tasks. Also supports x402 payment signing and local/custodial wallet management.
  Trigger when the user needs to: send a message to an A2A agent, sign an x402 payment,
  log in or out of a2a-wallet, manage local wallets, check their wallet address or balance,
  or configure the a2a-wallet CLI.
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
| `x402 sign` | Sign x402 PaymentRequirements → A2A message metadata (for paywalled agents) |
| `wallet` | Manage wallets: `create`, `import`, `list`, `use [--custodial]`, `connect`, `disconnect`, `export` |
| `status` | Show login status, default wallet type/address, and web app URL |
| `config` | Get or set config values (`token`, `url`) |
| `balance` | Show USDC balance for the active wallet on a given network |
| `faucet` | Request testnet tokens |
| `update` | Update the CLI binary |
| `auth` | ⚠️ DEPRECATED — Use `wallet connect/disconnect` instead. Device flow login: `device start`, `device poll`, `logout`. Will be removed in a future version. |
| `siwe` | ⚠️ DEPRECATED — SIWE token operations (`prepare`, `encode`, `decode`, `verify`, `auth`). Will be removed in a future version. |

## Agent Card Extensions

Before interacting with an A2A agent, inspect its card to check which extensions are declared:

```bash
a2a-wallet a2a card https://my-agent.example.com
```

The `capabilities.extensions` array in the card lists supported (and possibly required) extensions. Two extensions are relevant to this CLI:

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

**Payment flow**:
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

### SIWE Bearer Auth Extension

**Extension URI**: `https://github.com/planetarium/a2a-x402-wallet/tree/main/docs/siwe-bearer-auth/v0.1`

Agents declaring this extension require a wallet-signed auth token on every request. If `required: true`, messages cannot be sent without one.

> ⚠️ The `siwe auth` command used to generate these tokens is **deprecated**. SIWE tokens are locked to this CLI's wallet identity and cannot be shared with other clients (Web UI, mobile, etc.). The `siwe` command will be removed in a future version.

**How to detect**: The agent card will contain:

```json
{
  "extensions": [
    {
      "uri": "https://github.com/planetarium/a2a-x402-wallet/tree/main/docs/siwe-bearer-auth/v0.1",
      "required": true
    }
  ]
}
```

**Usage** (deprecated — emits a warning):
1. Generate a token for the agent's domain:
   ```bash
   TOKEN=$(a2a-wallet siwe auth \
     --domain my-agent.example.com \
     --uri    https://my-agent.example.com \
     --ttl    1h \
     --json | jq -r '.token')
   ```
2. Pass it via `--bearer` when sending messages:
   ```bash
   a2a-wallet a2a send   --bearer "$TOKEN" https://my-agent.example.com "Hello"
   a2a-wallet a2a stream --bearer "$TOKEN" https://my-agent.example.com "Hello"
   ```

**Note**: The token is tied to the agent's domain — a token issued for one agent will be rejected by another.

---

## Wallet selection

The CLI supports two wallet types:

- **Local wallet** — private key stored locally (`wallet create` / `wallet import`)
- **Custodial wallet** — signing delegated to the web service (requires login via `wallet connect`)

Switch the active wallet with:

```bash
a2a-wallet wallet use <name>       # local wallet
a2a-wallet wallet use --custodial  # custodial wallet
```

Check current status at any time:

```bash
a2a-wallet status
```

## Agent usage tips

- Use `--json` for machine-readable output
- Errors → stderr, exit `0` = success, `1` = failure
- Override token/URL per-call with `--token` / `--url`, or set `A2A_WALLET_TOKEN` env var
- The CLI detects expired tokens before making network requests and prints guidance
- Always run `a2a card <url>` first to check which extensions are required before sending messages
- Use `a2a-wallet --help` or `a2a-wallet <command> --help` to discover options at any time
