# a2a-wallet CLI

A CLI tool for requesting x402 payment signing using a web app accessToken (JWT).

The primary purpose is to allow AI Agents to call this CLI as a Tool when x402 payment is required, automatically generating a signed `PaymentPayload`.

## Installation

### Option 1: Install script (macOS / Linux)

No Node.js required. Downloads a prebuilt binary from the latest GitHub release.

```bash
curl -fsSL https://raw.githubusercontent.com/planetarium/a2a-x402-wallet/main/scripts/install.sh | sh
```

Supported platforms: macOS (Apple Silicon, Intel), Linux (x64, arm64).

For Windows, download `a2a-wallet-windows-x64.exe` from the [Releases](https://github.com/planetarium/a2a-x402-wallet/releases/latest) page, rename it to `a2a-wallet.exe`, and place it in a folder of your choice (e.g. `C:\Users\<you>\bin`).

Then add that folder to your PATH:

1. Open **Start** → search **"Environment Variables"** → click **"Edit the system environment variables"**
2. Click **Environment Variables...** → under **User variables**, select **Path** → click **Edit**
3. Click **New** and enter the folder path (e.g. `C:\Users\<you>\bin`)
4. Click OK on all dialogs, then restart your terminal

### Option 2: Build from source (requires Node.js >= 22)

```bash
# From the monorepo root
pnpm install
pnpm --filter a2a-x402-wallet-cli build

npm install -g ./apps/cli
```

### Verify installation

```bash
a2a-wallet --version
```

## Uninstallation

### If installed via install script (macOS / Linux)

```bash
curl -fsSL https://raw.githubusercontent.com/planetarium/a2a-x402-wallet/main/scripts/uninstall.sh | sh
```

Or manually:

```bash
sudo rm $(which a2a-wallet)
```

### If built from source

```bash
npm uninstall -g a2a-x402-wallet-cli
```

Or from the monorepo root:

```bash
pnpm cli:uninstall
```

### Windows

Delete the `a2a-wallet.exe` file from the folder where you placed it during installation.

## Quick Start

### 1. Set your token

Save the accessToken issued after logging in at the web app.

```bash
a2a-wallet config set token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Request a signature

```bash
a2a-wallet sign \
  --scheme exact \
  --network base \
  --asset 0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913 \
  --pay-to 0xMerchantAddress \
  --amount 120000000
```

On success, a `PaymentPayload` JSON is printed to stdout.

## Commands

### `config`

Manages configuration values. Settings are stored in `~/.a2a-wallet/config.json`.

#### `config set <key> <value>`

```bash
a2a-wallet config set token <jwt>    # Set accessToken
a2a-wallet config set url <url>      # Set web app URL (default: https://wallet.a2a-x402.xyz)
```

#### `config get [key]`

```bash
a2a-wallet config get          # Show all settings (token is masked)
a2a-wallet config get url      # Show a specific value
```

---

### `sign`

Signs x402 `PaymentRequirements` and returns a `PaymentPayload`.

```
a2a-wallet sign [options]
```

**Required options**

| Option | Description |
|--------|-------------|
| `--scheme <scheme>` | Payment scheme (`exact`) |
| `--network <network>` | Blockchain network |
| `--asset <address>` | ERC-20 token contract address |
| `--pay-to <address>` | Merchant wallet address |
| `--amount <value>` | Max payment amount in token's smallest unit (string) |

**Optional options**

| Option | Default | Description |
|--------|---------|-------------|
| `--valid-for <seconds>` | `3600` | Signature validity duration in seconds |
| `--token <jwt>` | config token | One-time token for this request only |
| `--url <url>` | config url | Web app URL for this request only |
| `--json` | — | Force pure JSON output (recommended for Agent use) |

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

---

### `whoami`

Displays the authenticated user's information for the current token.

```bash
a2a-wallet whoami
```

---

## Configuration Priority

`CLI option` > `Environment variable` > `Config file` > `Default`

**Environment variables**

| Variable | Description |
|----------|-------------|
| `A2A_WALLET_TOKEN` | accessToken |
| `A2A_WALLET_URL` | Web app base URL |

---

## Using as an Agent Tool

The CLI is designed for programmatic use by AI Agents.

- `--json` flag: prints only pure JSON to stdout
- Errors go to stderr
- Exit codes: success `0`, failure `1`
- Token can be injected via the `A2A_WALLET_TOKEN` environment variable

**Agent invocation example**

```bash
A2A_WALLET_TOKEN=<jwt> a2a-wallet sign \
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

---

## Supported Networks

| Network | Chain ID |
|---------|----------|
| `base` | 8453 |
| `base-sepolia` | 84532 |
| `ethereum` | 1 |
| `optimism` | 10 |
| `arbitrum` | 42161 |

---

## Development

```bash
# Development mode (watch)
pnpm dev

# Build
pnpm build

# Type check
pnpm lint
```
