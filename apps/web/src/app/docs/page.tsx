import Link from 'next/link';
import type { Metadata } from 'next';
import { PageBackground, Code } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Docs — A2A Wallet',
  description: 'A2A Wallet CLI commands, options, and integration examples',
};

// ── Primitives ────────────────────────────────────────────────────────────────

function Shell({ children }: { children: string }) {
  return (
    <div className="my-4 rounded-lg border border-zinc-800 bg-zinc-900 overflow-x-auto">
      <pre className="px-5 py-4 font-mono text-[13px] leading-6">
        {children.split('\n').map((line, i) => {
          const isComment = line.trim().startsWith('#');
          const isContinuation = line.trim() === '\\';
          const isPromptLine = !isComment && !isContinuation && line !== '';
          const indented = line.startsWith('  ') && !isComment;

          return (
            <span key={i} className="block">
              {line === '' ? (
                <br />
              ) : isComment ? (
                <span className="text-zinc-500">{line}</span>
              ) : indented ? (
                <span className="text-zinc-400">{line}</span>
              ) : isPromptLine ? (
                <>
                  <span className="select-none text-zinc-600 mr-2">$</span>
                  <span className="text-zinc-100">{line}</span>
                </>
              ) : (
                <span className="text-zinc-400">{line}</span>
              )}
            </span>
          );
        })}
      </pre>
    </div>
  );
}

function JsonBlock({ children }: { children: string }) {
  return (
    <div className="my-4 rounded-lg border border-zinc-800 bg-zinc-900 overflow-x-auto">
      <pre className="px-5 py-4 font-mono text-[13px] leading-6 text-zinc-300">
        {children}
      </pre>
    </div>
  );
}

function OptionTable({ rows }: { rows: [string, string?, string?][] }) {
  const hasDefault = rows.some(r => r[2] !== undefined);
  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-zinc-900 border-b border-zinc-800">
            <th className="text-left text-xs font-semibold text-zinc-400 px-4 py-2.5 w-52">Option</th>
            {hasDefault && (
              <th className="text-left text-xs font-semibold text-zinc-400 px-4 py-2.5 w-24">Default</th>
            )}
            <th className="text-left text-xs font-semibold text-zinc-400 px-4 py-2.5">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {rows.map(([opt, descOrDefault, desc], i) => (
            <tr key={i} className="bg-zinc-950/40">
              <td className="px-4 py-2.5 align-top">
                <code className="font-mono text-xs text-zinc-300">{opt}</code>
              </td>
              {hasDefault && (
                <td className="px-4 py-2.5 align-top">
                  <code className="font-mono text-xs text-zinc-500">
                    {desc !== undefined ? descOrDefault ?? '—' : '—'}
                  </code>
                </td>
              )}
              <td className="px-4 py-2.5 align-top text-zinc-400 text-[13px] leading-relaxed">
                {desc !== undefined ? desc : descOrDefault}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] text-zinc-400 leading-7 my-3">{children}</p>;
}

function H2({ id, children }: { id: string; children: string }) {
  return (
    <h2
      id={id}
      className="scroll-mt-20 text-xl font-bold text-zinc-100 mt-14 mb-4 pb-3 border-b border-zinc-800"
    >
      <a href={`#${id}`} className="hover:text-zinc-400 transition-colors cursor-pointer">
        {children}
      </a>
    </h2>
  );
}

function H3({ id, children }: { id: string; children: string }) {
  return (
    <h3
      id={id}
      className="scroll-mt-20 font-mono text-[15px] font-semibold text-zinc-200 mt-8 mb-2"
    >
      {children}
    </h3>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────

const nav = [
  { id: 'quickstart', label: 'Quick Start' },
  { id: 'auth', label: 'Authentication' },
  { id: 'x402', label: 'x402 Sign' },
  { id: 'siwe', label: 'SIWE' },
  { id: 'a2a', label: 'A2A' },
  { id: 'sign', label: 'Sign' },
  { id: 'config', label: 'Config' },
  { id: 'agent', label: 'Agent Integration' },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-50">
      <PageBackground />

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-zinc-900 bg-zinc-950/90 backdrop-blur">
        <div className="flex items-center gap-3 px-6 py-3 max-w-5xl mx-auto">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-200 transition-colors text-sm cursor-pointer"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            A2A Wallet
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="text-sm text-zinc-400">Docs</span>
        </div>
      </header>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12 flex gap-16">

        {/* Sidebar */}
        <aside className="hidden lg:block w-40 shrink-0">
          <nav className="sticky top-24 flex flex-col gap-0.5">
            <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-3">On this page</p>
            {nav.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                className="text-[13px] text-zinc-600 hover:text-zinc-200 transition-colors py-1 cursor-pointer"
              >
                {label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Content — prose max-width for readability */}
        <main className="flex-1 min-w-0 max-w-[720px]">

          {/* Title */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-100 mb-3">
              CLI Usage &amp; Reference
            </h1>
            <p className="text-[15px] text-zinc-400 leading-7">
              Complete command reference for the <Code>a2a-wallet</Code> CLI.
            </p>
          </div>

          {/* ── Quick Start ── */}
          <H2 id="quickstart">Quick Start</H2>
          <P>Install, log in, and sign your first payment in three steps.</P>
          <Shell>{`# 1. Install (macOS / Linux)
curl -fsSL https://raw.githubusercontent.com/planetarium/a2a-x402-wallet/main/scripts/install.sh | sh

# 2. Log in
a2a-wallet auth login

# 3. Sign an x402 payment
a2a-wallet x402 sign \\
  --scheme exact \\
  --network base \\
  --asset 0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913 \\
  --pay-to 0xMerchantAddress \\
  --amount 120000000 \\
  --json`}</Shell>

          {/* ── Authentication ── */}
          <H2 id="auth">Authentication</H2>

          <H3 id="auth-login">auth login</H3>
          <P>Opens a browser-based login flow and saves the token automatically. Recommended for interactive use.</P>
          <Shell>{`a2a-wallet auth login
a2a-wallet auth login --token <jwt>   # inject token directly (CI)`}</Shell>
          <OptionTable rows={[
            ['--url <url>', 'Override the web app URL'],
            ['--token <jwt>', 'Save a token directly without opening a browser'],
          ]} />

          <H3 id="auth-device">auth device start / poll</H3>
          <P>
            Two-step headless flow for AI agents. Step 1 prints the login URL immediately so the
            agent can relay it to the user before blocking. Step 2 polls until the user completes login.
          </P>
          <Shell>{`# Step 1 — get the login URL (exits immediately)
a2a-wallet auth device start --json
# → {"nonce":"abc123","loginUrl":"https://..."}

# Step 2 — poll for completion
a2a-wallet auth device poll --nonce abc123
# → Token saved. You are now logged in.`}</Shell>
          <OptionTable rows={[
            ['--json', 'Output {"nonce":"…","loginUrl":"…"} to stdout'],
            ['--nonce <nonce>', 'Nonce from device start (poll only, required)'],
            ['--url <url>', 'Override the web app URL'],
          ]} />

          <H3 id="auth-logout">auth logout</H3>
          <P>Removes the saved token from the config file.</P>
          <Shell>{`a2a-wallet auth logout`}</Shell>

          {/* ── x402 Sign ── */}
          <H2 id="x402">x402 Sign</H2>
          <P>
            Signs <Code>PaymentRequirements</Code> (HTTP 402) and outputs a <Code>PaymentPayload</Code> JSON to stdout.
          </P>
          <Shell>{`a2a-wallet x402 sign \\
  --scheme exact \\
  --network base \\
  --asset 0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913 \\
  --pay-to 0xMerchantAddress \\
  --amount 120000000 \\
  --json`}</Shell>
          <OptionTable rows={[
            ['--scheme <scheme>', undefined, 'Payment scheme (exact)'],
            ['--network <network>', undefined, 'Blockchain network — see supported networks'],
            ['--asset <address>', undefined, 'ERC-20 token contract address'],
            ['--pay-to <address>', undefined, 'Merchant wallet address'],
            ['--amount <value>', undefined, "Max payment amount in token's smallest unit"],
            ['--valid-for <seconds>', '3600', 'Signature validity duration in seconds'],
            ['--json', '—', 'Output pure JSON to stdout (recommended for agent use)'],
            ['--token <jwt>', 'config', 'One-time token override'],
            ['--url <url>', 'config', 'Web app URL override'],
          ]} />

          <H3 id="x402-output">Output example</H3>
          <JsonBlock>{`{
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
}`}</JsonBlock>

          {/* ── SIWE ── */}
          <H2 id="siwe">SIWE</H2>
          <P>
            Sign-In with Ethereum (EIP-4361). Generate, sign, encode, decode, verify, or run
            the full flow in one command.
          </P>

          <H3 id="siwe-auth">siwe auth</H3>
          <P>
            All-in-one command. Resolves your wallet address, generates a SIWE message, signs it,
            and outputs a base64url token. Requires authentication.
          </P>
          <Shell>{`a2a-wallet siwe auth \\
  --domain app.example.com \\
  --uri https://app.example.com \\
  --ttl 1h`}</Shell>
          <OptionTable rows={[
            ['--domain <host>', undefined, 'Domain (required)'],
            ['--uri <uri>', undefined, 'URI (required)'],
            ['--ttl <duration>', '7d', 'Expiration — 30m, 1h, 7d, etc.'],
            ['--chain-id <n>', '1', 'EIP-155 chain ID'],
            ['--statement <text>', 'I accept the Terms of Service', 'Statement text'],
            ['--json', '—', 'Output pure JSON'],
          ]} />

          <H3 id="siwe-prepare">siwe prepare</H3>
          <P>
            Generates an EIP-4361 message and prints it to stdout. If <Code>--address</Code> is
            omitted, the wallet address is resolved automatically (requires auth).
          </P>
          <Shell>{`a2a-wallet siwe prepare \\
  --domain app.example.com \\
  --uri https://app.example.com \\
  --address 0xf39F... \\
  --ttl 7d`}</Shell>

          <H3 id="siwe-encode">siwe encode</H3>
          <P>Encodes a SIWE message + signature into a base64url token. Does not require authentication.</P>
          <Shell>{`a2a-wallet siwe encode \\
  --signature 0xda0e85... \\
  --message-file /tmp/msg.txt`}</Shell>

          <H3 id="siwe-decode">siwe decode</H3>
          <P>Decodes a base64url SIWE token and prints its fields. Does not require authentication.</P>
          <Shell>{`a2a-wallet siwe decode <token>
a2a-wallet siwe decode <token> --json`}</Shell>

          <H3 id="siwe-verify">siwe verify</H3>
          <P>
            Recovers the signer address via EIP-191 and checks expiration.
            Exits <Code>0</Code> on success, <Code>1</Code> on failure.
          </P>
          <Shell>{`a2a-wallet siwe verify <token>
# stdout: 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266`}</Shell>

          {/* ── A2A ── */}
          <H2 id="a2a">A2A</H2>
          <P>Interact with A2A-compatible agents.</P>

          <H3 id="a2a-card">a2a card</H3>
          <P>Fetches and displays an agent&apos;s AgentCard from <Code>/.well-known/agent-card.json</Code>.</P>
          <Shell>{`a2a-wallet a2a card <url>
a2a-wallet a2a card <url> --json`}</Shell>

          <H3 id="a2a-send">a2a send</H3>
          <P>Sends a message to an agent and prints the full response.</P>
          <Shell>{`a2a-wallet a2a send <url> "your message"
a2a-wallet a2a send <url> "continue" --context-id <id>`}</Shell>
          <OptionTable rows={[
            ['--context-id <id>', 'Continue an existing conversation'],
            ['--bearer <token>', 'Bearer token for agent auth'],
            ['--json', 'Output raw JSON'],
          ]} />

          <H3 id="a2a-stream">a2a stream</H3>
          <P>Sends a message and streams the response via SSE. Text parts are written to stdout as they arrive.</P>
          <Shell>{`a2a-wallet a2a stream <url> "your message"`}</Shell>

          <H3 id="a2a-task">a2a task / cancel</H3>
          <P>Retrieve or cancel a running task by ID.</P>
          <Shell>{`a2a-wallet a2a task <url> <taskId>
a2a-wallet a2a cancel <url> <taskId>`}</Shell>

          {/* ── Sign ── */}
          <H2 id="sign">Sign</H2>
          <P>Signs an arbitrary message with your embedded wallet and prints the signature.</P>
          <Shell>{`a2a-wallet sign --message "hello world"
a2a-wallet sign --message "hello world" --json`}</Shell>
          <OptionTable rows={[
            ['--message <string>', 'Message to sign (required)'],
            ['--json', 'Output pure JSON'],
            ['--token <jwt>', 'One-time token override'],
            ['--url <url>', 'Web app URL override'],
          ]} />

          {/* ── Config ── */}
          <H2 id="config">Config</H2>
          <P>
            Settings are stored in <Code>~/.a2a-wallet/config.json</Code>.
            Priority: CLI option &gt; env var &gt; config file &gt; default.
          </P>
          <Shell>{`a2a-wallet config set token <jwt>
a2a-wallet config set url <url>
a2a-wallet config get
a2a-wallet config get url`}</Shell>
          <OptionTable rows={[
            ['A2A_WALLET_TOKEN', 'Access token (env var)'],
            ['A2A_WALLET_URL', 'Web app base URL (env var)'],
          ]} />

          {/* ── Agent Integration ── */}
          <H2 id="agent">Agent Integration</H2>
          <P>
            The CLI is designed for programmatic use by AI agents. Use <Code>--json</Code> for
            machine-readable output. Errors go to stderr; exit code <Code>0</Code> = success,{' '}
            <Code>1</Code> = failure.
          </P>

          <H3 id="agent-setup">Initial setup — one-time device flow</H3>
          <P>
            Use the two-step device flow for headless environments — no local server required.
            Once logged in, copy the token and inject it via <Code>A2A_WALLET_TOKEN</Code>.
          </P>
          <Shell>{`# Step 1 — get the login URL (non-blocking)
a2a-wallet auth device start --json
# → {"nonce":"abc123","loginUrl":"https://..."}

# Relay the URL to the user, then:
# Step 2 — poll for completion
a2a-wallet auth device poll --nonce abc123
# → Token saved. You are now logged in.`}</Shell>

          <H3 id="agent-invocation">Invocation example</H3>
          <Shell>{`A2A_WALLET_TOKEN=<jwt> a2a-wallet x402 sign \\
  --scheme exact \\
  --network base \\
  --asset 0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913 \\
  --pay-to 0xMerchantAddress \\
  --amount 120000000 \\
  --json`}</Shell>

          <H3 id="agent-mcp">MCP tool definition</H3>
          <P>Example tool definition for use in an MCP-compatible agent framework.</P>
          <JsonBlock>{`{
  "name": "x402_sign",
  "description": "Sign an x402 PaymentRequirements to create a PaymentPayload.",
  "inputSchema": {
    "type": "object",
    "required": ["scheme", "network", "asset", "payTo", "amount"],
    "properties": {
      "scheme":   { "type": "string", "enum": ["exact"] },
      "network":  { "type": "string", "enum": ["base", "base-sepolia", "ethereum", "optimism", "arbitrum"] },
      "asset":    { "type": "string", "description": "ERC-20 token contract address" },
      "payTo":    { "type": "string", "description": "Merchant wallet address" },
      "amount":   { "type": "string", "description": "Max amount in token's smallest unit" },
      "validFor": { "type": "number", "description": "Validity in seconds (default: 3600)" }
    }
  }
}`}</JsonBlock>

          <H3 id="agent-networks">Supported networks</H3>
          <OptionTable rows={[
            ['base', '8453'],
            ['base-sepolia', '84532'],
            ['ethereum', '1'],
            ['optimism', '10'],
            ['arbitrum', '42161'],
          ]} />

          {/* bottom padding */}
          <div className="h-20" />
        </main>
      </div>

      <footer className="relative z-10 flex items-center justify-center px-6 py-5 border-t border-zinc-900">
        <p className="text-xs text-zinc-700">
          A2A Wallet &middot; Planetarium
        </p>
      </footer>
    </div>
  );
}
