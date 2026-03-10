import { InstallSection } from '@/components/install-section';
import { Logo, PageBackground } from '@/components/ui';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
      <PageBackground />

      {/* Header */}
      <header className="sticky top-0 z-20 w-full border-b border-zinc-900 bg-zinc-950/90 backdrop-blur">
        <div className="flex items-center justify-between px-8 py-4 max-w-5xl mx-auto w-full">
        <Logo />
        <nav className="flex items-center gap-6">
          <Link href="/docs" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer">
            Docs
          </Link>
          <Link href="/settings" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer">
            Settings
          </Link>
          <a
            href="https://github.com/planetarium/a2a-x402-wallet"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            GitHub
          </a>
        </nav>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col items-center px-6 pt-16 pb-24">
        {/* Protocol badges */}
        <div className="flex items-center gap-2 mb-10 flex-wrap justify-center">
          {['x402', 'HTTP/402', 'EIP-3009', 'ERC-20', 'Privy'].map((badge) => (
            <span
              key={badge}
              className="text-[11px] text-zinc-500 border border-zinc-800 rounded-full px-3 py-1 tracking-wider bg-zinc-900/50"
            >
              {badge}
            </span>
          ))}
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.1] text-center mb-6 max-w-3xl">
          Agents That Pay
          <br />
          <span className="text-zinc-500">x402 signing for A2A protocols</span>
        </h1>

        <p className="text-[15px] text-zinc-400 text-center max-w-md mb-14 leading-7">
          Embed a self-sovereign wallet into any A2A agent.
          Receive HTTP&nbsp;402, sign PaymentRequirements, settle on-chain —
          with no manual approval required.
        </p>

        {/* x402 explainer */}
        <div className="w-full max-w-2xl mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">What is x402?</span>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">
            x402 is an extension to the A2A protocol that revives the HTTP <span className="text-zinc-300">402 Payment Required</span> status code for autonomous agents.
            When a Merchant Agent requires payment, it sends <span className="text-zinc-300">PaymentRequirements</span> to the Client Agent.
            The Client Agent signs them using its embedded wallet to produce a <span className="text-zinc-300">PaymentPayload</span> —
            a cryptographic EIP-3009 authorization that settles directly on-chain, with no bridges or custodians.
          </p>

          {/* Flow steps */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3">
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">① Request</p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Merchant Agent returns HTTP 402 with <span className="text-zinc-300">PaymentRequirements</span> — asset, network, amount, and destination.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3">
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">② Sign</p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                A2A Wallet signs via EIP-3009 and produces a <span className="text-zinc-300">PaymentPayload</span>. No manual approval needed with delegated signing.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3">
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">③ Settle</p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Merchant Agent verifies the signature and settles on-chain. Client Agent receives the receipt and the service continues.
              </p>
            </div>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-2xl mb-16">
          {/* x402 Native */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800">
                <svg className="h-3.5 w-3.5 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-zinc-200">x402 Native</p>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Implements the x402 A2A extension spec. Signs PaymentRequirements and returns a valid PaymentPayload via EIP-3009.
            </p>
          </div>

          {/* Delegated Signing */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800">
                <svg className="h-3.5 w-3.5 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-zinc-200">Delegated Signing</p>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Agents sign autonomously without per-transaction approval. Privy delegation keeps keys self-sovereign.
            </p>
          </div>

          {/* CLI First */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800">
                <svg className="h-3.5 w-3.5 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="4 17 10 11 4 5" />
                  <line x1="12" y1="19" x2="20" y2="19" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-zinc-200">CLI First</p>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Token-based auth with pipe-friendly output. Drop into any agentic pipeline or automated workflow.
            </p>
          </div>
        </div>

        {/* Install section */}
        <InstallSection />

        {/* Docs link */}
        <Link
          href="/docs"
          className="group mt-4 flex items-center justify-between w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-4 hover:border-zinc-600 hover:bg-zinc-900 transition-colors cursor-pointer"
        >
          <div>
            <p className="text-sm font-semibold text-zinc-200">CLI Usage &amp; Reference</p>
            <p className="text-xs text-zinc-500 mt-0.5">Commands, options, and integration examples</p>
          </div>
          <svg className="h-4 w-4 text-zinc-600 group-hover:text-zinc-300 transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>

      </main>

      {/* Footer */}
      <footer className="relative z-10 flex items-center justify-center px-6 py-5 border-t border-zinc-900">
        <p className="text-xs text-zinc-700">
          A2A Wallet &middot; Planetarium
        </p>
      </footer>
    </div>
  );
}
