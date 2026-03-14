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

### 1. Set up a wallet

**Local wallet (recommended):**

```bash
a2a-wallet wallet create
# → Wallet created successfully. (set as default)
#   Name:    wallet-1
#   Address: 0x...
#   Path:    m/44'/60'/0'/0/0
```

The wallet is automatically set as default. No login required.

**Custodial wallet (optional — signing delegated to the web service):**

Human / interactive:

```bash
a2a-wallet wallet connect
```

Opens the login page in your browser, prints the verification URL and user code, then instructs you to run `--poll` to complete the login.

Agent / headless (two steps):

```bash
# Step 1: start a session and get the login URL
a2a-wallet wallet connect --json
# → {"device_code":"...","user_code":"...","verification_uri":"...","verification_uri_complete":"..."}

# Step 2: show the URL to the user, then poll for completion
a2a-wallet wallet connect --poll <device-code>
# → Waiting for authorization (up to 120s)...
# → Token saved. You are now logged in.
# → This token is valid for X more days.
# → Active wallet set to custodial.
```

Then set as default:

```bash
a2a-wallet wallet use --custodial
```

Direct token injection (CI / scripted environments):

```bash
a2a-wallet config set token <jwt>
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
│   └── sign               Sign x402 PaymentRequirements → A2A message.metadata
├── siwe [DEPRECATED]
│   ├── prepare            Generate an EIP-4361 SIWE message
│   ├── encode             Encode message + signature into a base64url token
│   ├── decode             Decode and inspect a SIWE token
│   ├── verify             Verify token signature and expiration
│   └── auth               All-in-one: prepare → sign → encode
├── wallet
│   ├── create             Create a new mnemonic-based local wallet
│   ├── import [name]      Import a wallet from a private key
│   ├── list               List all local wallets
│   ├── use [name]         Set the default local wallet (or --custodial)
│   ├── connect            Log in to the custodial wallet service
│   ├── disconnect         Log out of the custodial wallet service
│   └── export             Show instructions for moving wallets to another machine
├── auth [DEPRECATED]
│   ├── device
│   │   ├── start          Start a device login session (RFC 8628)
│   │   └── poll           Poll for completion and save the token
│   └── logout             Remove the saved JWT token
├── config
│   ├── set <key> <value>  Set a config value (token, url)
│   └── get [key]          Show config values
├── status                 Show login status, default wallet, and wallet address
├── balance                Show wallet balance
├── faucet                 Request testnet tokens
└── update                 Update a2a-wallet to the latest version
```

## Commands

### `wallet create`

Creates a new mnemonic-based local wallet.

```bash
a2a-wallet wallet create [--name <name>] [--path <derivation-path>]
```

- `--name` is auto-generated (`wallet-1`, `wallet-2`, …) if omitted.
- The first wallet created is automatically set as the default.
- If no mnemonic wallet exists yet, a new random mnemonic is generated.
- If a mnemonic wallet already exists, the same mnemonic is reused and the next address index is derived automatically.
- `--path` overrides automatic path selection.

| Option | Description |
|--------|-------------|
| `--name <name>` | Wallet name (auto-generated if omitted) |
| `--path <path>` | BIP-44 derivation path (e.g. `m/44'/60'/0'/0/2`) |

```
$ a2a-wallet wallet create
Wallet created successfully. (set as default)
  Name:    wallet-1
  Address: 0x...
  Path:    m/44'/60'/0'/0/0
```

### `wallet import`

Imports a wallet from a hex private key. Stored as `type: private-key` — no mnemonic is associated.

```bash
a2a-wallet wallet import [name] --private-key <key>
```

- `name` is auto-generated if omitted.
- The first wallet overall is automatically set as the default.

> **Security note**: passing a private key as a CLI option leaves it in shell history. Consider clearing your history after use.

| Option | Description |
|--------|-------------|
| `--private-key <key>` | Hex private key (`0x` prefix optional) — required |

### `wallet list`

Lists all saved wallets — local and custodial. The default wallet is marked with `*`.

```bash
a2a-wallet wallet list [--json]
```

```
  NAME         ADDRESS                                     TYPE         CREATED AT
* wallet-1     0x...                                       mnemonic     2026-03-13 09:00:00  (m/44'/60'/0'/0/0)
  wallet-2     0x...                                       mnemonic     2026-03-13 09:00:01  (m/44'/60'/0'/0/1)
  my-key       0x...                                       private-key  2026-03-13 09:00:02
  (custodial)  0x...                                       custodial    -
```

The custodial row shows the linked address if logged in, or a reason string (`(not connected)`, `(token expired)`, `(timed out)`, `(error)`) if not.

### `wallet use`

Sets the active wallet for signing. Saves `defaultWallet` to `~/.a2a-wallet/config.json`.

```bash
a2a-wallet wallet use <name>             # set a local wallet as default
a2a-wallet wallet use --custodial        # switch to the custodial (web) wallet
```

| Option | Description |
|--------|-------------|
| `--custodial` | Use the custodial wallet instead of a local wallet |

### `wallet export`

Exporting private keys directly is not supported. Prints the file paths to copy manually when moving wallets to another machine.

```bash
a2a-wallet wallet export
```

### `wallet connect`

Logs in to the custodial wallet service. When run without flags, opens the login page in your browser, prints the verification URL and user code, and instructs you to run `--poll <device_code>` to complete the login.

```bash
a2a-wallet wallet connect [--url <url>]          # human / interactive (opens browser)
a2a-wallet wallet connect --json                 # print device auth response as JSON (agent step 1)
a2a-wallet wallet connect --poll <device-code>   # poll for completion (agent step 2)
```

For headless/agent use, combine `--json` (step 1) with `--poll` (step 2):

```bash
# Step 1: start a session and print the verification URL
a2a-wallet wallet connect --json
# → {"device_code":"...","user_code":"ABCD-1234","verification_uri":"https://...","verification_uri_complete":"https://...?user_code=ABCD-1234"}

# Step 2: after the user completes login, poll for the token
a2a-wallet wallet connect --poll <device_code>
# → Waiting for authorization (up to 120s)...
# → Token saved. You are now logged in.
# → Active wallet set to custodial.
```

| Option | Description |
|--------|-------------|
| `--poll <device-code>` | Poll for the token using the device code from step 1 |
| `--url <url>` | Override the web app URL for this request |
| `--json` | Output the device authorization response as JSON |

### `wallet disconnect`

```bash
a2a-wallet wallet disconnect
```

Logs out of the custodial wallet service and removes the saved token from the config file. If the custodial wallet was set as the default, it is also unset — run `wallet use <name>` to choose a local wallet afterward.

### `status`

Shows login status (logged-in / expired / not-logged-in), the default wallet (type, name, address), and the web app URL.

```bash
a2a-wallet status [--url <url>] [--json]
```

**Human-readable output:**

```
  Custodial Wallet
  ──────────────────────────────────────────────
  Status    logged in
  Expires   3/21/2026, 12:00:00 AM
  URL       https://wallet.a2a-x402.xyz

  Default Wallet
  ──────────────────────────────────────────────
  Type      local
  Name      wallet-1
  Address   0x...
  Path      m/44'/60'/0'/0/0
```

| Option | Description |
|--------|-------------|
| `--url <url>` | Web app URL for this request only |
| `--json` | Output as JSON |

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

Signs x402 `PaymentRequirements` and returns a ready-to-use A2A `message.metadata` object containing the signed `PaymentPayload`. To submit payment, set `message.metadata` to this output when sending an A2A message.

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
| `--wallet <name>` | — | Local wallet to sign with (overrides default wallet) |
| `--custodial` | — | Use the custodial wallet (overrides default wallet) |
| `--token <jwt>` | config | One-time token for custodial signing (overrides config) |
| `--url <url>` | config | Web app URL for this request only (overrides config) |
| `--json` | — | Output pure JSON to stdout (recommended for Agent/MCP use) |

**Output example**

```json
{
  "x402.payment.status": "payment-submitted",
  "x402.payment.payload": {
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
}
```

### `a2a auth`

Authenticates with an external A2A service via OAuth2 device flow and saves the connection credentials locally.

**Step 1** — start the flow and open the browser:

```bash
a2a-wallet a2a auth <url>
# → To authenticate, open the following URL in a browser:
# →   https://example.com/login?user_code=WDJB-MJHT
# →
# → After completing login, run:
# →   a2a-wallet a2a auth <url> --user-code WDJB-MJHT
```

The URL shown is `verification_uri_complete` from the agent's device authorization endpoint. The user code (e.g. `WDJB-MJHT`) is included in that URL by the agent — it does not need to be entered separately.

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
| `--task-id <id>` | Task ID to send message to (for payment or multi-turn) |
| `--metadata <json>` | JSON metadata to attach to the message (e.g. x402 payment payload) |
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

### `a2a tasks get`

Retrieves the current state of a task.

```bash
a2a-wallet a2a tasks get <url> <taskId> [options]
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

---

## Deprecated Commands

### `auth device start` [DEPRECATED]

> Use `wallet connect` instead.

Starts a device authorization session (RFC 8628) and prints the verification URL and user code.

```bash
a2a-wallet auth device start [--url <url>] [--json]
```

| Option | Description |
|--------|-------------|
| `--url <url>` | Web app URL (overrides config) |
| `--json` | Output the full RFC 8628 authorization response as JSON |

### `auth device poll` [DEPRECATED]

> Use `wallet connect --poll` instead.

Polls until the device login is approved, then saves the JWT token to config.

```bash
a2a-wallet auth device poll --device-code <code> [--url <url>]
```

| Option | Description |
|--------|-------------|
| `--device-code <code>` | Device code returned by `auth device start` |
| `--url <url>` | Web app URL (overrides config) |

### `auth logout` [DEPRECATED]

> Use `wallet disconnect` instead.

Removes the saved JWT token from config.

```bash
a2a-wallet auth logout
```

### `siwe prepare` [DEPRECATED]

> The `siwe` command is deprecated and will be removed in a future version. SIWE tokens are signed by this CLI's embedded wallet, which means the authenticated identity is locked to this CLI instance. Other clients (Web UI, mobile app, etc.) holding a different wallet cannot prove the same identity — making multi-client scenarios impossible.

Generates an EIP-4361 SIWE message and prints it to stdout.

If `--address` is omitted, the wallet address is resolved automatically from your connected account — **authentication required** in that case. If `--address` is provided explicitly, no authentication is needed.

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

### `siwe encode` [DEPRECATED]

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

### `siwe decode` [DEPRECATED]

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

### `siwe verify` [DEPRECATED]

Recovers the signer address via EIP-191 and checks expiration. Does not require authentication.

```bash
a2a-wallet siwe verify <token>
# stdout: 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
# exit 0 on success, exit 1 on failure
```

### `siwe auth` [DEPRECATED]

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

The wallet address is resolved automatically from your connected account. The resulting base64url token can be presented to any service that supports SIWE authentication.

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
- If the token is expired, the CLI detects it locally before making any network request and exits with an error pointing to `wallet connect`

**Initial setup (one-time)**

Create a local wallet — no login or network access required:

```bash
a2a-wallet wallet create
# → Wallet created successfully. (set as default)
#   Name:    wallet-1
#   Address: 0x...
#   Path:    m/44'/60'/0'/0/0
```

The wallet is stored in `~/.a2a-wallet/` and used automatically for all signing operations.

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
  "description": "Sign an x402 PaymentRequirements and return a ready-to-use A2A message.metadata object for on-chain payment authorization.",
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
