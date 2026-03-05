'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePrivy, useSigners, useCreateWallet, type WalletWithMetadata } from '@privy-io/react-auth';
import { WalletLogo } from '@/components/wallet-logo';

const SIGNER_ID = process.env.NEXT_PUBLIC_PRIVY_AUTHORIZATION_KEY_ID!;

const STEPS = ['Sign in', 'Authorize', 'Done'] as const;

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
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
                    ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
                    : active
                    ? 'border-2 border-zinc-900 dark:border-zinc-50 text-zinc-900 dark:text-zinc-50'
                    : 'border border-zinc-200 dark:border-zinc-700 text-zinc-400',
                ].join(' ')}
              >
                {done ? (
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  step
                )}
              </div>
              <span
                className={[
                  'text-xs',
                  active ? 'text-zinc-900 dark:text-zinc-50 font-medium' : 'text-zinc-400',
                ].join(' ')}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={[
                  'h-px w-10 mx-2 mb-4 transition-colors',
                  done ? 'bg-zinc-900 dark:bg-zinc-50' : 'bg-zinc-200 dark:bg-zinc-700',
                ].join(' ')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function DeviceLoginContent() {
  const searchParams = useSearchParams();
  const nonce = searchParams.get('nonce');
  const { ready, authenticated, login, logout, user, getAccessToken } = usePrivy();
  const { addSigners } = useSigners();
  const { createWallet } = useCreateWallet();
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [delegating, setDelegating] = useState(false);
  const [creatingWallet, setCreatingWallet] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didFinish = useRef(false);

  const embeddedWallet = user?.linkedAccounts.find(
    (a): a is WalletWithMetadata =>
      a.type === 'wallet' &&
      (a.walletClientType === 'privy' || a.walletClientType === 'privy-v2'),
  );
  const isDelegated = embeddedWallet?.delegated ?? false;

  const currentStep = !authenticated ? 1 : !isDelegated ? 2 : 3;

  useEffect(() => {
    if (!ready || !authenticated || !isDelegated || !nonce || didFinish.current) return;

    didFinish.current = true;
    getAccessToken().then(async (privyToken) => {
      if (!privyToken) {
        setError('Failed to get Privy token.');
        return;
      }
      const res = await fetch('/api/auth/device/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nonce, privyToken }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({})) as { error?: string };
        setError(msg ?? 'Authorization failed.');
        return;
      }
      setDone(true);
    });
  }, [ready, authenticated, isDelegated, nonce, getAccessToken]);

  async function handleDelegate() {
    if (!embeddedWallet) return;
    setDelegating(true);
    try {
      await addSigners({ address: embeddedWallet.address, signers: [{ signerId: SIGNER_ID }] });
    } finally {
      setDelegating(false);
    }
  }

  if (!nonce) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
        <div className="w-full max-w-sm">
          <WalletLogo />
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-6">
            <p className="text-sm text-red-500">Missing session parameter. Please run <code className="font-mono">a2a-wallet auth login</code> again.</p>
          </div>
        </div>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
        <div className="w-full max-w-sm">
          <WalletLogo />
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-6">
            <div className="flex flex-col gap-3 animate-pulse">
              <div className="h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 w-3/4 mx-auto" />
              <div className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <WalletLogo />
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-6">
          <StepIndicator current={currentStep as 1 | 2 | 3} />

          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-5">

            {/* Step 1: Sign in */}
            {!authenticated && (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="font-medium text-sm">Sign in to continue</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Your CLI is requesting access to sign x402 payments on your behalf.
                  </p>
                </div>
                <button
                  onClick={login}
                  className="w-full rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 py-2.5 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
                >
                  Sign in with email
                </button>
              </div>
            )}

            {/* Step 2: Delegate */}
            {authenticated && !isDelegated && (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="font-medium text-sm">Authorize the CLI</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Allow the backend to sign x402 payments when triggered by your CLI commands.
                  </p>
                </div>
                {embeddedWallet ? (
                  <>
                    <button
                      onClick={() => setShowDelegateModal(true)}
                      disabled={delegating}
                      className="w-full rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 py-2.5 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {delegating ? 'Delegating...' : 'Delegate wallet'}
                    </button>

                    {showDelegateModal && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
                        <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl p-6">
                          <h2 className="font-semibold text-base mb-1">What is wallet delegation?</h2>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                            By confirming, the x402 Wallet backend will be authorized to:
                          </p>
                          <ul className="space-y-2.5 mb-5">
                            {[
                              { ok: true,  text: 'Sign x402 payments requested via your CLI commands' },
                              { ok: true,  text: 'Act only when explicitly triggered — never autonomously' },
                              { ok: false, text: 'Cannot move funds or execute arbitrary transactions' },
                              { ok: false, text: 'Your private key is never stored on the server' },
                            ].map(({ ok, text }) => (
                              <li key={text} className="flex gap-2.5 text-xs">
                                <span className={ok ? 'text-emerald-500 mt-0.5' : 'text-zinc-400 mt-0.5'}>
                                  {ok ? '✓' : '✗'}
                                </span>
                                <span className="text-zinc-600 dark:text-zinc-300">{text}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="flex gap-2.5">
                            <button
                              onClick={() => setShowDelegateModal(false)}
                              className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => { setShowDelegateModal(false); handleDelegate(); }}
                              className="flex-1 rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 py-2 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
                            >
                              Confirm & Delegate
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    onClick={async () => {
                      setCreatingWallet(true);
                      try { await createWallet(); } finally { setCreatingWallet(false); }
                    }}
                    disabled={creatingWallet}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 py-2.5 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingWallet ? 'Creating wallet...' : 'Create wallet'}
                  </button>
                )}

                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
                  <button
                    onClick={logout}
                    className="w-full text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors py-1"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Done */}
            {authenticated && isDelegated && (
              <div className="flex flex-col items-center gap-3 py-2 text-center">
                <div className={[
                  'h-10 w-10 rounded-full flex items-center justify-center',
                  error ? 'bg-red-50 dark:bg-red-900/30' : 'bg-emerald-50 dark:bg-emerald-900/30',
                ].join(' ')}>
                  {error ? (
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <div>
                  {error ? (
                    <p className="text-sm text-red-500">{error}</p>
                  ) : (
                    <>
                      <p className="font-medium text-sm">{done ? 'Authorized.' : 'Authorizing CLI...'}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">You can close this tab.</p>
                    </>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}
