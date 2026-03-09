# SIWE Bearer Auth Extension Specification v0.1

**Extension URI**: `https://github.com/planetarium/a2a-x402-wallet/tree/main/docs/siwe-bearer-auth/v0.1`

---

## Overview

This document specifies the **SIWE Bearer Auth** extension for A2A (Agent2Agent) agents.
Agents declaring this extension require clients to present a
[Sign-In with Ethereum (EIP-4361)](https://eips.ethereum.org/EIPS/eip-4361) token
in every authenticated request.

The token is a base64url-encoded JSON object containing a SIWE message and its
Ethereum wallet signature. It is self-verifiable — no server-side session or
token introspection endpoint is needed.

---

## Why SIWE Instead of JWT

| Property | JWT (typical) | SIWE Bearer |
|----------|--------------|-------------|
| Issuer | Central auth server | Client's Ethereum wallet |
| Verification | Server-side secret or JWKS | Elliptic curve signature recovery |
| User identity | Opaque subject claim | Ethereum wallet address (`0x...`) |
| Server state required | Token store / JWKS cache | None (self-verifiable) |
| Delegation support | Varies | Privy / embedded wallets |

---

## Token Format

A SIWE Bearer token is produced as follows:

```
token = base64url( JSON.stringify({ message: <siwe_message_string>, signature: <hex_sig> }) )
```

### Step 1 — Construct the SIWE message (EIP-4361)

The SIWE message is a plain-text string conforming to the EIP-4361 format:

```
<domain> wants you to sign in with your Ethereum account:
<ethereum_address>

<statement>

URI: <uri>
Version: 1
Chain ID: <chain_id>
Nonce: <nonce>
Issued At: <iso8601_datetime>
Expiration Time: <iso8601_datetime>
```

#### Required fields

| Field | Description | Constraint |
|-------|-------------|------------|
| `domain` | The hostname of the agent being accessed | Must match the agent's `SIWE_DOMAIN` (case-insensitive) |
| `address` | Your Ethereum wallet address (EIP-55 checksum format) | Must match the signing key |
| `uri` | The full URL of the agent endpoint | e.g. `https://my-agent.example.com` |
| `version` | Always `"1"` | — |
| `chainId` | EIP-155 chain ID | Any valid chain ID (e.g. `1` for Ethereum mainnet) |
| `nonce` | Random alphanumeric string (≥ 8 chars) | Prevents replay if server tracks nonces |
| `issuedAt` | Token creation time (ISO 8601 UTC) | Must be a valid date |
| `expirationTime` | Token expiry time (ISO 8601 UTC) | Required; `expirationTime - issuedAt` **must not exceed 7 days** |

#### Optional fields

| Field | Description |
|-------|-------------|
| `statement` | Human-readable purpose string |
| `resources` | Array of URIs the statement refers to |

### Step 2 — Sign the message

Sign the UTF-8 bytes of the SIWE message with your Ethereum private key using
the `personal_sign` method (EIP-191 prefix `"\x19Ethereum Signed Message:\n"`):

```
signature = wallet.signMessage(siwe_message_string)
// result: "0x..." (65-byte hex, r + s + v)
```

### Step 3 — Encode the token

```typescript
const payload = JSON.stringify({ message: siweMessageString, signature });
const token = btoa(payload)
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');
```

> **Note**: Use standard base64url encoding (RFC 4648 §5): `+` → `-`, `/` → `_`, no padding.

---

## Using the Token in A2A Requests

Pass the token in the HTTP `Authorization` header:

```
Authorization: Bearer <siwe_token>
```

### Which methods require authentication

All stateful A2A JSON-RPC methods require a valid Bearer token:

| Method | Auth required |
|--------|--------------|
| `message/send` | Yes |
| `message/stream` | Yes |
| `tasks/get` | Yes |
| `tasks/cancel` | Yes |

The discovery endpoint (`GET /.well-known/agent.json`) does **not** require auth.

---

## Server-Side Verification Steps

The agent server performs the following checks in order:

1. **Decode** — base64url-decode the token and JSON-parse `{ message, signature }`.
2. **Parse** — parse the `message` string as an EIP-4361 `SiweMessage` object.
3. **Field presence** — reject if `expirationTime` or `issuedAt` is missing.
4. **TTL check** — reject if `expirationTime - issuedAt > 7 days`.
5. **Expiry check** — reject if `expirationTime` is in the past (handled by `SiweMessage.verify`).
6. **Signature verification** — recover the signer address and confirm it matches `address`.
7. **Domain check** — reject if `message.domain` does not match the agent's configured domain.

If any check fails, the server returns JSON-RPC error `-32001` with HTTP status `401`.

---

## Error Reference

| JSON-RPC code | HTTP status | Message | Cause |
|--------------|-------------|---------|-------|
| `-32001` | `401` | `Authentication required (Bearer token)` | No `Authorization` header present |
| `-32001` | `401` | `Invalid or expired SIWE token` | Decode failure, bad signature, expired, domain mismatch, or TTL exceeded |

---

## Quick-Start Examples

### Example 1 — Using `a2a-wallet` CLI (recommended)

```bash
# 1. Mint a SIWE token (TTL = 1 hour)
TOKEN=$(a2a-wallet siwe auth \
  --domain my-agent.example.com \
  --uri    https://my-agent.example.com \
  --ttl    1h \
  --json | jq -r '.token')

# 2. Send a message to the agent
a2a-wallet a2a send --bearer "$TOKEN" https://my-agent.example.com "Hello"
```

### Example 2 — TypeScript (viem)

```typescript
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';
import { createSiweMessage, generateSiweNonce } from 'viem/siwe';

const account = privateKeyToAccount('0xYOUR_PRIVATE_KEY');
const client = createWalletClient({ account, chain: mainnet, transport: http() });

const domain = 'my-agent.example.com';
const agentUrl = 'https://my-agent.example.com';

const now = new Date();
const expires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

const siweMessage = createSiweMessage({
  domain,
  address: account.address,
  statement: 'Sign in to access the agent',
  uri: agentUrl,
  version: '1',
  chainId: 1,
  nonce: generateSiweNonce(),
  issuedAt: now,
  expirationTime: expires,
});

const signature = await client.signMessage({ message: siweMessage });

// Encode as base64url
const payload = JSON.stringify({ message: siweMessage, signature });
const token = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Use in A2A request
const response = await fetch(`${agentUrl}/api/a2a`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'message/send',
    params: {
      message: {
        role: 'user',
        parts: [{ kind: 'text', text: 'Hello, agent!' }],
        messageId: crypto.randomUUID(),
      },
    },
  }),
});
```

### Example 3 — TypeScript (ethers.js v6)

```typescript
import { ethers } from 'ethers';
import { SiweMessage } from 'siwe';

const wallet = new ethers.Wallet('0xYOUR_PRIVATE_KEY');

const domain = 'my-agent.example.com';
const agentUrl = 'https://my-agent.example.com';

const now = new Date();
const siweMessage = new SiweMessage({
  domain,
  address: wallet.address,
  statement: 'Sign in to access the agent',
  uri: agentUrl,
  version: '1',
  chainId: 1,
  nonce: ethers.hexlify(ethers.randomBytes(8)).slice(2),
  issuedAt: now.toISOString(),
  expirationTime: new Date(now.getTime() + 3600_000).toISOString(), // 1h
});

const message = siweMessage.prepareMessage();
const signature = await wallet.signMessage(message);

const payload = JSON.stringify({ message, signature });
const token = Buffer.from(payload).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Use: Authorization: Bearer <token>
```

---

## Token Lifetime and Rotation

- Maximum TTL is **7 days** from `issuedAt` to `expirationTime`.
- There is no token refresh endpoint. Mint a new token before the current one expires.
- Tokens are stateless — the server does not maintain a revocation list.
  To effectively revoke access, do not issue new tokens for that wallet.

---

## Security Considerations

- **Domain binding**: Tokens are bound to a specific domain. A token minted for
  `agent-a.example.com` will be rejected by `agent-b.example.com`.
- **Private key safety**: Never expose your Ethereum private key. Use hardware wallets
  or key management services in production.
- **HTTPS required**: Always transmit Bearer tokens over HTTPS to prevent interception.
- **Nonce uniqueness**: While the server does not currently track nonces, include a
  fresh random nonce in each token to future-proof against replay protection.

---

## Extension Declaration in Agent Card

Agents supporting this extension declare it in their A2A Agent Card
(`/.well-known/agent.json`) as follows:

```json
{
  "extensions": [
    {
      "uri": "https://github.com/planetarium/a2a-x402-wallet/tree/main/docs/siwe-bearer-auth/v0.1",
      "description": "Authentication via Sign-In with Ethereum (EIP-4361). Clients must include a base64url-encoded SIWE token as a Bearer token in the Authorization header.",
      "required": true,
      "params": {
        "maxTokenTtl": "7d",
        "domainBinding": true,
        "usageHint": {
          "mintToken": "a2a-wallet siwe auth --domain my-agent.example.com --uri https://my-agent.example.com --ttl 1h --json | jq -r '.token'",
          "sendMessage": "a2a-wallet a2a send --bearer \"$TOKEN\" https://my-agent.example.com \"Hello, agent!\""
        }
      }
    }
  ],
  "securitySchemes": {
    "bearerAuth": {
      "type": "http",
      "scheme": "bearer",
      "bearerFormat": "SIWE"
    }
  },
  "security": [{ "bearerAuth": [] }]
}
```

---

## Reference

- [EIP-4361: Sign-In with Ethereum](https://eips.ethereum.org/EIPS/eip-4361)
- [A2A Protocol Specification](https://google.github.io/A2A/)
- [siwe npm package](https://www.npmjs.com/package/siwe)
- [viem SIWE utilities](https://viem.sh/docs/siwe/utilities/createSiweMessage)
