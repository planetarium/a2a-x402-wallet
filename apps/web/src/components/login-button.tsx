'use client';

import { useState } from 'react';
import { usePrivy, type WalletWithMetadata } from '@privy-io/react-auth';
import { DelegateButton } from './delegate-button';

export function LoginButton() {
  const { ready, authenticated, login, logout, user, getAccessToken } = usePrivy();
  const [appToken, setAppToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const embeddedWallet = user?.linkedAccounts.find(
    (a): a is WalletWithMetadata =>
      a.type === 'wallet' &&
      (a.walletClientType === 'privy' || a.walletClientType === 'privy-v2'),
  );
  const isDelegated = embeddedWallet?.delegated ?? false;

  const displayName = user?.email?.address ?? user?.wallet?.address ?? null;
  const initials = displayName
    ? displayName[0].toUpperCase()
    : '?';

  async function handleGetToken() {
    setLoading(true);
    try {
      const privyToken = await getAccessToken();
      if (!privyToken) return;
      const res = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { Authorization: `Bearer ${privyToken}` },
      });
      const data = await res.json();
      setAppToken(data.token ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!appToken) return;
    await navigator.clipboard.writeText(appToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!ready) {
    return (
      <div className="flex flex-col gap-3 animate-pulse">
        <div className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <p className="font-medium text-sm">Sign in to your wallet</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Manage your x402 embedded wallet and authorize CLI access
          </p>
        </div>
        <button
          onClick={login}
          className="w-full rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 py-2.5 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
        >
          Sign in with email
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* User info */}
      <div className="flex items-center gap-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 px-3 py-2.5">
        <div className="h-8 w-8 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-semibold">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{displayName ?? 'Wallet'}</p>
          <p className="text-xs text-zinc-400">Privy embedded wallet</p>
        </div>
      </div>

      {/* Delegation */}
      {isDelegated ? (
        <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 px-1">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Wallet delegated to backend
        </div>
      ) : (
        <DelegateButton />
      )}

      {/* Token */}
      {isDelegated && (
        <>
          <button
            onClick={handleGetToken}
            disabled={loading}
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Get CLI token'}
          </button>
          {appToken && (
            <div className="flex items-center gap-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-2">
              <p className="flex-1 truncate font-mono text-xs text-zinc-600 dark:text-zinc-300">
                {appToken}
              </p>
              <button
                onClick={handleCopy}
                title={copied ? 'Copied!' : 'Copy token'}
                className="shrink-0 text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                {copied ? (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </div>
          )}
        </>
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
  );
}
