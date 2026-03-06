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
  --amount 120000000
```

On success, a `PaymentPayload` JSON is printed to stdout.

## Command Overview

```
a2a-wallet
├── auth
│   ├── login              Log in via browser callback (humans)
│   ├── device
│   │   ├── start          Start device session and print login URL (agent step 1)
│   │   └── poll           Poll for login completion and save token (agent step 2)
│   └── logout             Remove the saved token
├── config
│   ├── set <key> <value>  Set a config value (token, url)
│   └── get [key]          Show config values
├── sign                   Sign an arbitrary message with your wallet
├── x402
│   └── sign               Sign x402 PaymentRequirements → PaymentPayload
├── whoami                 Show authenticated user info
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
a2a-wallet auth device poll --nonce <nonce> [--url <url>]
```

Polls the server for login completion. Saves the token once the user completes login. Use this as **step 2** of the agent login flow after showing the URL to the user.

| Option | Description |
|--------|-------------|
| `--nonce <nonce>` | Nonce returned by `auth device start` (required) |
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

### `sign`

Signs an arbitrary message with your wallet.

```bash
a2a-wallet sign --message <string> [options]
```

| Option | Description |
|--------|-------------|
| `--message <string>` | Message to sign (required) |
| `--token <jwt>` | One-time token for this request only |
| `--url <url>` | Web app URL for this request only |
| `--json` | Output pure JSON to stdout |

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

## Using as an Agent Tool

The CLI is designed for programmatic use by AI Agents:

- Use `--json` to get pure JSON on stdout
- Errors are written to stderr
- Exit codes: `0` success, `1` failure
- Inject the token via `A2A_WALLET_TOKEN` to avoid persistent config

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
