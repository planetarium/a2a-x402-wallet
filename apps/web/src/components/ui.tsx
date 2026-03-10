'use client';

import { useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

// ── Background ────────────────────────────────────────────────────────────────

export function PageBackground() {
  return (
    <>
      <div className="fixed inset-0 bg-dot-grid pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_70%_35%_at_50%_0%,rgba(255,255,255,0.04),transparent)] pointer-events-none" />
    </>
  );
}

// ── Logo ──────────────────────────────────────────────────────────────────────

export function Logo({ centered = false, className = '' }: { centered?: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${centered ? 'justify-center' : ''} ${className}`}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 shadow">
        <svg className="h-4 w-4 text-zinc-900" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="5" width="20" height="15" rx="2" stroke="currentColor" strokeWidth="1.75" />
          <path d="M2 10h20" stroke="currentColor" strokeWidth="1.75" />
          <rect x="15" y="13" width="5" height="3" rx="1.5" fill="currentColor" />
        </svg>
      </div>
      <span className="font-semibold tracking-tight text-sm text-zinc-100">
        A2A Wallet
      </span>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900/80 backdrop-blur ring-1 ring-white/[0.04] p-6 ${className}`}>
      {children}
    </div>
  );
}

// ── Buttons ───────────────────────────────────────────────────────────────────

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode };

export function BtnPrimary({ children, className = '', ...props }: BtnProps) {
  return (
    <button
      {...props}
      className={`w-full rounded-lg bg-zinc-100 text-zinc-900 py-2.5 text-sm font-semibold hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function BtnSecondary({ children, className = '', ...props }: BtnProps) {
  return (
    <button
      {...props}
      className={`w-full rounded-lg border border-zinc-700 text-zinc-300 py-2.5 text-sm font-medium hover:bg-zinc-800 hover:border-zinc-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function BtnGhost({ children, className = '', ...props }: BtnProps) {
  return (
    <button
      {...props}
      className={`w-full text-xs text-zinc-600 hover:text-zinc-300 transition-colors py-1 ${className}`}
    >
      {children}
    </button>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────

export function Divider() {
  return <div className="border-t border-zinc-800 my-1" />;
}

// ── Inline code ───────────────────────────────────────────────────────────────

export function Code({ children }: { children: string }) {
  return (
    <code className="font-mono text-[13px] text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded">
      {children}
    </code>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────

export function CopyButton({ text, ariaLabel }: { text: string; ariaLabel?: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      aria-label={ariaLabel ?? 'Copy'}
      title={copied ? 'Copied!' : 'Copy'}
      className="shrink-0 cursor-pointer text-zinc-500 hover:text-zinc-200 transition-colors"
    >
      {copied ? (
        <svg className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS = ['Sign in', 'Authorize', 'Done'] as const;

export function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center justify-center mb-6">
      {STEPS.map((label, i) => {
        const step = (i + 1) as 1 | 2 | 3;
        const done = step < current;
        const active = step === current;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={[
                  'h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                  done
                    ? 'bg-zinc-100 text-zinc-900'
                    : active
                    ? 'border-2 border-zinc-100 text-zinc-100'
                    : 'border border-zinc-700 text-zinc-600',
                ].join(' ')}
              >
                {done ? (
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : step}
              </div>
              <span className={`text-xs ${active ? 'text-zinc-200 font-medium' : 'text-zinc-600'}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-10 mx-2 mb-4 transition-colors ${done ? 'bg-zinc-500' : 'bg-zinc-800'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Centered page shell (login pages) ─────────────────────────────────────────

export function CenteredShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center justify-center px-4">
      <PageBackground />
      <div className="relative z-10 w-full max-w-sm">
        {children}
      </div>
    </div>
  );
}

// ── Login skeleton (Suspense / Privy loading) ──────────────────────────────────

export function LoginSkeleton() {
  return (
    <CenteredShell>
      <Logo centered className="mb-8" />
      <Card>
        <div className="flex flex-col gap-3 animate-pulse">
          <div className="h-5 rounded-lg bg-zinc-800 w-3/4 mx-auto" />
          <div className="h-10 rounded-lg bg-zinc-800" />
        </div>
      </Card>
    </CenteredShell>
  );
}

// ── Delegation modal ───────────────────────────────────────────────────────────

export function DelegationModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delegation-modal-title"
    >
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 ring-1 ring-white/[0.04] p-6">
        <h2 id="delegation-modal-title" className="text-base font-semibold text-zinc-100 mb-1">
          What is wallet delegation?
        </h2>
        <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
          By confirming, the A2A Wallet backend will be authorized to:
        </p>
        <ul className="space-y-2.5 mb-5">
          {[
            { ok: true,  text: 'Sign x402 payments requested via your CLI commands' },
            { ok: true,  text: 'Act only when explicitly triggered — never autonomously' },
            { ok: false, text: 'Cannot move funds or execute arbitrary transactions' },
            { ok: false, text: 'Your private key is never stored on the server' },
          ].map(({ ok, text }) => (
            <li key={text} className="flex gap-2.5 text-xs text-zinc-400">
              <span className={`mt-0.5 shrink-0 ${ok ? 'text-emerald-500' : 'text-zinc-600'}`}>
                {ok ? '✓' : '✗'}
              </span>
              {text}
            </li>
          ))}
        </ul>
        <div className="flex gap-2.5">
          <BtnSecondary className="flex-1" onClick={onClose} autoFocus>
            Cancel
          </BtnSecondary>
          <BtnPrimary className="flex-1" onClick={onConfirm}>
            Confirm &amp; Delegate
          </BtnPrimary>
        </div>
      </div>
    </div>
  );
}
