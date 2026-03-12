# a2a-wallet CLI

CLI tool for signing x402 payment payloads via the a2a-wallet web app. Designed to be called by AI Agents as a tool when x402 payment authorization is required.

## Installation

### Binary (macOS / Linux)

No Node.js required.

```bash
curl -fsSL https://raw.githubusercontent.com/planetarium/a2a-x402-wallet/main/scripts/install.sh | sh
```

Supported platforms: macOS (Apple Silicon, Intel), Linux (x64, arm64).

### Binary (Windows)

Download `a2a-wallet-windows-x64.exe` from the [Releases](https://github.com/planetarium/a2a-x402-wallet/releases/latest) page, rename it to `a2a-wallet.exe`, and place it in a folder on your PATH.

To add a folder to PATH:

1. Open **Start** → search **"Environment Variables"** → **"Edit the system environment variables"**
2. Click **Environment Variables...** → select **Path** under User variables → **Edit**
3. Click **New**, enter the folder path, then click OK on all dialogs and restart your terminal

### Build from source (requires Node.js >= 22)

```bash
# From the monorepo root
pnpm install
pnpm --filter a2a-x402-wallet-cli build
npm install -g ./apps/cli
```

### Verify

```bash
a2a-wallet --version
```

## Uninstallation

**macOS / Linux (install script)**

```bash
curl -fsSL https://raw.githubusercontent.com/planetarium/a2a-x402-wallet/main/scripts/uninstall.sh | sh
```

**macOS / Linux (manual)**

```bash
sudo rm $(which a2a-wallet)
```

**Built from source**

```bash
npm uninstall -g a2a-x402-wallet-cli
# or from the monorepo root:
pnpm cli:uninstall
```

**Windows** — delete `a2a-wallet.exe` from the folder where you placed it.

## Quick Start

### 1. Log in

**Human / interactive:**

```bash
a2a-wallet auth login
```

Starts a local callback server. Opens the login page in your browser and saves the token automatically when you complete login.

**Agent / headless (two steps):**

```bash
# Step 1: start a session and get the login URL
a2a-wallet auth device start --json
# → {"nonce":"abc123","loginUrl":"https://..."}

# Step 2: show the URL to the user, then poll for completion
a2a-wallet auth device poll --nonce abc123
# → Waiting for authentication (up to 2 minutes)...
# → Token saved. You are now logged in.
# → This token is valid for 5 more minutes.
```

This lets the agent relay the login URL to the user *before* blocking on the poll.

**Direct token injection (CI / scripted environments):**

```bash
a2a-wallet auth login --token <jwt>
```

### 2. Sign an x402 payment

```bash
a2a-wallet x402 sign \
  --scheme exact \
  --network base \
  --asset 0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913 \
  --pay-to 0xMerchantAddress \
  --amount 120000000 \
  --extra-name USDC \
  --extra-version 2
```

On success, a `PaymentPayload` JSON is printed to stdout.

## Command Overview

```
a2a-wallet
├── a2a
│   ├── auth               Authenticate with an A2A service via device flow
│   ├── list               List all saved A2A service connections
│   ├── disconnect         Remove a saved A2A service connection
│   ├── card               Fetch and display an agent's AgentCard
│   ├── send               Send a message to an agent and print the response
│   ├── stream             Send a message and stream the response via SSE
│   ├── tasks              Get the current state of a task
│   └── cancel             Request cancellation of a running task
├── x402
│   └── sign               Sign x402 PaymentRequirements → PaymentPayload
├── auth
│   ├── login              Log in via browser callback (humans)
│   ├── device
│   │   ├── start          Start device session and print login URL (agent step 1)
│   │   └── poll           Poll for login completion and save token (agent step 2)
│   └── logout             Remove the saved token
├── siwe [DEPRECATED]
│   ├── prepare            Generate an EIP-4361 SIWE message
│   ├── encode             Encode message + signature into a base64url token
│   ├── decode             Decode and inspect a SIWE token
│   ├── verify             Verify token signature and expiration
│   └── auth               All-in-one: prepare → sign → encode
├── config
│   ├── set <key> <value>  Set a config value (token, url)
│   └── get [key]          Show config values
├── whoami                 Show authenticated user info
├── balance                Show wallet balance
├── faucet                 Request testnet tokens
└── update                 Update a2a-wallet to the latest version
```

## Commands

### `auth login`

```bash
a2a-wallet auth login [--url <url>]   # human / interactive
a2a-wallet auth login --token <jwt>   # direct token injection
```

Starts a local callback server and opens the login page in your browser. The token is saved automatically when login completes. Recommended for interactive use.

**`--token`** — Saves a token directly without opening a browser. Useful for scripted or CI environments.

| Option | Description |
|--------|-------------|
| `--url <url>` | Override the web app URL for this request |
| `--token <token>` | Save a token directly without opening a browser |

### `auth device start`

```bash
a2a-wallet auth device start [--url <url>] [--json]
```

Starts a device login session on the server and prints the login URL, then exits immediately. Use this as **step 1** of the agent login flow so the agent can relay the URL to the user before blocking.

| Option | Description |
|--------|-------------|
| `--url <url>` | Override the web app URL for this request |
| `--json` | Output `{"nonce":"…","loginUrl":"…"}` to stdout |

### `auth device poll`

```bash
a2a-wallet auth device poll --device-code <device_code> [--url <url>]
```

Polls the server for login completion. Saves the token once the user completes login. Use this as **step 2** of the agent login flow after showing the URL to the user.

| Option | Description |
|--------|-------------|
| `--device-code <device_code>` | Nonce returned by `auth device start` (required) |
| `--url <url>` | Override the web app URL for this request |

### `auth logout`

```bash
a2a-wallet auth logout
```

Removes the saved token from the config file.

### `config set`

```bash
a2a-wallet config set token <jwt>   # Set accessToken
a2a-wallet config set url <url>     # Set web app URL (default: https://wallet.a2a-x402.xyz)
```

Settings are stored in `~/.a2a-wallet/config.json`.

### `config get`

```bash
a2a-wallet config get          # Show all settings (token is masked)
a2a-wallet config get url      # Show a specific value
```

### `x402 sign`

Signs x402 `PaymentRequirements` and returns a `PaymentPayload`.

```bash
a2a-wallet x402 sign [options]
```

**Required**

| Option | Description |
|--------|-------------|
| `--scheme <scheme>` | Payment scheme (`exact`) |
| `--network <network>` | Blockchain network |
| `--asset <address>` | ERC-20 token contract address |
| `--pay-to <address>` | Merchant wallet address |
| `--amount <value>` | Max payment amount in token's smallest unit |
| `--extra-name <name>` | EIP-712 domain name from token contract (e.g. `"USDC"`) |
| `--extra-version <version>` | EIP-712 domain version from token contract (e.g. `"2"`) |

**Optional**

| Option | Default | Description |
|--------|---------|-------------|
| `--valid-for <seconds>` | `3600` | Signature validity duration in seconds |
| `--token <jwt>` | config | One-time token for this request only |
| `--url <url>` | config | Web app URL for this request only |
| `--json` | — | Output pure JSON to stdout (recommended for Agent use) |

**Output example**

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

> **Deprecated:** The `siwe` command is deprecated and will be removed in a future version. SIWE tokens are signed by this CLI's embedded wallet, which means the authenticated identity is locked to this CLI instance. Other clients (Web UI, mobile app, etc.) holding a different wallet cannot prove the same identity — making multi-client scenarios impossible.

### `siwe prepare`

Generates an EIP-4361 SIWE message and prints it to stdout.

If `--address` is omitted, the wallet address is resolved automatically from your linked account — **authentication required** in that case. If `--address` is provided explicitly, no authentication is needed.

```bash
a2a-wallet siwe prepare \
  --domain app.example.com \
  --uri https://app.example.com \
  [--address 0xf39F...] [--ttl 7d] [--chain-id 1] [--statement "..."]
```

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `--domain <host>` | Y | — | Domain (e.g. `app.example.com`) |
| `--uri <uri>` | Y | — | URI (e.g. `https://app.example.com`) |
| `--address <address>` | N | linked wallet | Ethereum address. If omitted, resolved from your account |
| `--ttl <duration>` | N | `7d` | Expiration duration (`30m`, `1h`, `7d`) |
| `--chain-id <n>` | N | `1` | EIP-155 chain ID |
| `--statement <text>` | N | `I accept the Terms of Service` | Statement text |
| `--token <jwt>` | N | config | One-time token for this request only |
| `--url <url>` | N | config | Web app URL for this request only |

**Output example:**

```
app.example.com wants you to sign in with your Ethereum account:
0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

I accept the Terms of Service

URI: https://app.example.com
Version: 1
Chain ID: 1
Nonce: b7d986fd22d44f5fbdfe4d23161ca272
Issued At: 2026-03-07T21:26:35.386Z
Expiration Time: 2026-03-14T21:26:35.386Z
```

### `siwe encode`

Encodes a SIWE message and signature into a base64url token. Does not require authentication.

> **Token format:** The output is `base64url(JSON{ message, signature })` — **not a JWT**. There is no server-side secret or HMAC. Security is provided entirely by the ECDSA signature embedded in the SIWE message. Anyone can decode the token; only the private key holder could have produced it.

```bash
a2a-wallet siwe encode \
  --signature 0xda0e85... \
  [--message-file /tmp/msg.txt]  # reads stdin if omitted
```

| Option | Required | Description |
|--------|----------|-------------|
| `--signature <hex>` | Y | 65-byte ECDSA signature hex (`0x` + 130 hex chars) |
| `--message-file <path>` | N | Path to message file (default: stdin) |

### `siwe decode`

Decodes a base64url SIWE token and prints its fields. Does not require authentication.

```bash
a2a-wallet siwe decode <token> [--json]
```

**Human-readable output:**

```
Address:    0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
Domain:     app.example.com
Statement:  I accept the Terms of Service
URI:        https://app.example.com
Chain ID:   1
Nonce:      e749d1c140844c86a279f3b5780e2bc4
Issued At:  2026-03-05T09:39:13.849Z
Expires:    2026-03-05T10:39:13.849Z
Signature:  0xda0e85...
```

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

### `siwe verify`

Recovers the signer address via EIP-191 and checks expiration. Does not require authentication.

```bash
a2a-wallet siwe verify <token>
# stdout: 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
# exit 0 on success, exit 1 on failure
```

### `siwe auth`

All-in-one command: auto-detects your wallet address, generates a SIWE message, signs it via the API, and outputs the token. **Requires authentication.**

```bash
a2a-wallet siwe auth \
  --domain app.example.com \
  --uri https://app.example.com \
  [--ttl 1h] [--chain-id 1] [--statement "..."] \
  [--token <jwt>] [--url <url>] [--json]
```

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `--domain <host>` | Y | — | Domain |
| `--uri <uri>` | Y | — | URI |
| `--ttl <duration>` | N | `7d` | Expiration duration (`30m`, `1h`, `7d`) |
| `--chain-id <n>` | N | `1` | EIP-155 chain ID |
| `--statement <text>` | N | `I accept the Terms of Service` | Statement text |
| `--token <jwt>` | N | config | One-time token for this request only |
| `--url <url>` | N | config | Web app URL for this request only |
| `--json` | N | — | Output pure JSON to stdout |

The wallet address is resolved automatically via `whoami`. The resulting base64url token can be presented to any service that supports SIWE authentication.

### `whoami`

Shows the authenticated user's ID and linked wallet address.

```bash
a2a-wallet whoami [--token <jwt>] [--url <url>] [--json]
```

| Option | Description |
|--------|-------------|
| `--token <jwt>` | One-time token for this request only |
| `--url <url>` | Web app URL for this request only |
| `--json` | Output pure JSON to stdout |

### `a2a auth`

Authenticates with an external A2A service via OAuth2 device flow and saves the connection credentials locally.

**Step 1** — start the flow and open the browser:

```bash
a2a-wallet a2a auth <url>
# → To authenticate, open the following URL in a browser:
# →   http://example.com/a2a/login?user_code=WDJB-MJHT
# →
# → After completing login, run:
# →   a2a-wallet a2a auth <url> --user-code WDJB-MJHT
```

**Step 2** — after completing login in the browser, pass the user code:

```bash
a2a-wallet a2a auth <url> --user-code WDJB-MJHT
# → Connected to http://example.com
```

The `user_code` is shown in the browser URL. The `device_code` is stored in `~/.a2a-wallet/pending-auths.json` and never exposed to the user. It is looked up via `user_code` and deleted after use. The saved credentials are used automatically by `a2a send` and `a2a stream` for that service URL.

| Option | Description |
|--------|-------------|
| `--user-code <code>` | Poll for completion using the user code shown in the browser (e.g. `WDJB-MJHT`) |

### `a2a list`

Lists all saved A2A service connections.

```bash
a2a-wallet a2a list
```

**Output example:**

```
service                   connected_at
http://localhost:3000     2026-03-12 08:43:00
https://my-agent.example.com  2026-03-10 14:22:11
```

### `a2a disconnect`

Removes a saved A2A service connection.

```bash
a2a-wallet a2a disconnect <url>
```

### `a2a card`

Fetches and displays an agent's AgentCard from `/.well-known/agent.json`.

```bash
a2a-wallet a2a card <url> [--path <path>] [--json]
```

| Option | Description |
|--------|-------------|
| `--path <path>` | Custom agent card path (default: `/.well-known/agent.json`) |
| `--json` | Output raw JSON (single line) |

### `a2a send`

Sends a message to an A2A agent and prints the full response.

```bash
a2a-wallet a2a send <url> <message> [options]
```

| Option | Description |
|--------|-------------|
| `--context-id <id>` | Continue an existing conversation context |
| `--bearer <token>` | Bearer token for agent authentication |
| `--json` | Output raw JSON (single line) |

### `a2a stream`

Sends a message to an A2A agent and streams the response via SSE. Text parts are written to stdout as they arrive; other events (task, status-update, artifact-update) are printed as pretty JSON.

```bash
a2a-wallet a2a stream <url> <message> [options]
```

| Option | Description |
|--------|-------------|
| `--context-id <id>` | Continue an existing conversation context |
| `--bearer <token>` | Bearer token for agent authentication |
| `--json` | Output each event as raw JSON (one line per event) |

### `a2a task`

Retrieves the current state of a task.

```bash
a2a-wallet a2a task <url> <taskId> [options]
```

| Option | Description |
|--------|-------------|
| `--history <n>` | Include last N messages from task history (default: `0`) |
| `--bearer <token>` | Bearer token for agent authentication |
| `--json` | Output raw JSON (single line) |

### `a2a cancel`

Requests cancellation of a running task.

```bash
a2a-wallet a2a cancel <url> <taskId> [options]
```

| Option | Description |
|--------|-------------|
| `--bearer <token>` | Bearer token for agent authentication |
| `--json` | Output raw JSON (single line) |

### `update`

Updates the binary to the latest version from GitHub Releases. Only works for binary installations; for source installs, reinstall manually.

```bash
a2a-wallet update
```

## Configuration

**Priority:** `CLI option` > `Environment variable` > `Config file` > `Default`

**Environment variables**

| Variable | Description |
|----------|-------------|
| `A2A_WALLET_TOKEN` | accessToken |
| `A2A_WALLET_URL` | Web app base URL |

## Supported Networks

| Network | Chain ID |
|---------|----------|
| `base` | 8453 |
| `base-sepolia` | 84532 |
| `ethereum` | 1 |
| `optimism` | 10 |
| `arbitrum` | 42161 |

## Agent Skill

A ready-made Agent Skill is published on [skills.sh](https://skills.sh/planetarium/a2a-x402-wallet). Install it once and any compatible agent will automatically know how to use `a2a-wallet` — the right commands, flags, and workflows — without requiring manual explanation.

```bash
# Via npx (recommended — works with Claude Code, Cursor, GitHub Copilot, Gemini CLI, and more)
npx skills add planetarium/a2a-x402-wallet

# Manual copy
cp -r skills/a2a-wallet ~/.agents/skills/          # macOS / Linux (from repo root)
Copy-Item -Recurse skills\a2a-wallet $env:USERPROFILE\.agents\skills\  # Windows (from repo root)
```

The skill follows the [Agent Skills](https://agentskills.io) open standard (YAML frontmatter + Markdown) and can be loaded by any compatible agent runtime.

## Using as an Agent Tool

The CLI is designed for programmatic use by AI Agents:

- Use `--json` to get pure JSON on stdout
- Errors are written to stderr
- Exit codes: `0` success, `1` failure
- Inject the token via `A2A_WALLET_TOKEN` to avoid persistent config
- If the token is expired, the CLI detects it locally before making any network request and exits with an error pointing to the login commands

**Initial setup (one-time)**

Use the two-step device flow for agent setup — no local server required:

```bash
# Step 1: get the login URL and show it to the user
a2a-wallet auth device start --json
# → {"nonce":"abc123","loginUrl":"https://...device-login?nonce=abc123"}

# Step 2: once the user has been notified, start polling
a2a-wallet auth device poll --nonce abc123
# → Waiting for authentication (up to 2 minutes)...
# → Token saved. You are now logged in.
# → This token is valid for 5 more minutes.
```

Once logged in, copy the token from `~/.a2a-wallet/config.json` and set it in the agent's environment as `A2A_WALLET_TOKEN`.

**Invocation example**

```bash
A2A_WALLET_TOKEN=<jwt> a2a-wallet x402 sign \
  --scheme exact \
  --network base \
  --asset 0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913 \
  --pay-to 0xMerchantAddress \
  --amount 120000000 \
  --extra-name USDC \
  --extra-version 2 \
  --json
```

**MCP Tool definition example**

```json
{
  "name": "x402_sign",
  "description": "Sign an x402 PaymentRequirements to create a PaymentPayload for on-chain payment authorization.",
  "inputSchema": {
    "type": "object",
    "required": ["scheme", "network", "asset", "payTo", "amount"],
    "properties": {
      "scheme":   { "type": "string", "enum": ["exact"] },
      "network":  { "type": "string", "enum": ["base", "base-sepolia", "ethereum", "optimism", "arbitrum"] },
      "asset":    { "type": "string", "description": "ERC-20 token contract address" },
      "payTo":    { "type": "string", "description": "Merchant wallet address" },
      "amount":   { "type": "string", "description": "Max payment amount in token's smallest unit" },
      "validFor": { "type": "number", "description": "Validity duration in seconds (default: 3600)" }
    }
  }
}
```

## Development

```bash
pnpm dev    # Watch mode
pnpm build  # Build
pnpm lint   # Type check
```
