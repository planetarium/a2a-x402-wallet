import { InstallSection } from '@/components/install-section';
import { Logo, PageBackground } from '@/components/ui';
import { UserControl } from '@/components/user-control';
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
          <UserControl />
        </nav>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col items-center px-6 pt-16 pb-24">
        {/* Catchphrase */}
        <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-center mb-16">
          A2A & x402 Tools for Your Agent.
        </h1>

        {/* Quick Start section */}
        <InstallSection />

        {/* Docs link */}
        <Link
          href="/docs"
          className="group mt-3 flex items-center justify-between w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-4 hover:border-zinc-600 hover:bg-zinc-900 transition-colors cursor-pointer"
        >
          <div>
            <p className="text-sm font-semibold text-zinc-200">CLI Usage &amp; Reference</p>
            <p className="text-xs text-zinc-500 mt-0.5">Commands, options, and integration examples</p>
          </div>
          <svg className="h-4 w-4 text-zinc-600 group-hover:text-zinc-300 transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>

        {/* Capabilities */}
        <div className="mt-16 w-full max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600 mb-4 text-center">
            Personal Agent Tool for the Agent First Ecosystem
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-5 py-4">
              <p className="text-xs font-bold text-zinc-300 mb-1">A2A Standard</p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Full Agent-to-Agent protocol support for seamless interoperability between agents and services.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-5 py-4">
              <p className="text-xs font-bold text-zinc-300 mb-1">X402 Payments</p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Inter-agent payment signing via the x402 HTTP payment protocol — agents pay autonomously.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-5 py-4">
              <p className="text-xs font-bold text-zinc-300 mb-1">SIWE Authentication</p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Sign-In With Ethereum proves agent identity cryptographically, with no passwords required.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-5 py-4">
              <p className="text-xs font-bold text-zinc-300 mb-1">CLI as Agent Tool</p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                The <code className="text-zinc-400">a2a-wallet</code> CLI is designed for AI agents to call directly, enabling fully automated signing workflows.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-900 px-6 py-5">
        <div className="flex flex-col items-center gap-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/planetarium/a2a-x402-wallet"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              GitHub
            </a>
          </div>
          <p className="text-xs text-zinc-700">A2A Wallet &middot; Planetarium</p>
        </div>
      </footer>
    </div>
  );
}
