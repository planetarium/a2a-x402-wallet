'use client';

import { useState } from 'react';
import { usePrivy, type WalletWithMetadata } from '@privy-io/react-auth';
import { DelegateButton } from './delegate-button';

export function LoginButton() {
  const { ready, authenticated, login, logout, user, getAccessToken } = usePrivy();
  const [appToken, setAppToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const embeddedWallet = user?.linkedAccounts.find(
    (a): a is WalletWithMetadata =>
      a.type === 'wallet' &&
      (a.walletClientType === 'privy' || a.walletClientType === 'privy-v2'),
  );
  const isDelegated = embeddedWallet?.delegated ?? false;

  async function handleGetToken() {
    const privyToken = await getAccessToken();
    if (!privyToken) return;
    const res = await fetch('/api/auth/token', {
      method: 'POST',
      headers: { Authorization: `Bearer ${privyToken}` },
    });
    const data = await res.json();
    setAppToken(data.token ?? null);
  }

  async function handleCopy() {
    if (!appToken) return;
    await navigator.clipboard.writeText(appToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!ready) {
    return (
      <button
        disabled
        className="h-12 w-48 rounded-full bg-zinc-200 text-zinc-400 cursor-not-allowed"
      >
        Loading...
      </button>
    );
  }

  if (authenticated) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {user?.email?.address ?? user?.wallet?.address ?? 'Logged in'}
        </p>
        <DelegateButton />
        {isDelegated && (
          <button
            onClick={handleGetToken}
            className="h-10 w-48 rounded-full border border-black/10 px-5 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
          >
            Get Token
          </button>
        )}
        {appToken && (
          <div className="flex w-80 items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
            <p className="flex-1 truncate font-mono text-xs text-zinc-700 dark:text-zinc-300">
              {appToken}
            </p>
            <button
              onClick={handleCopy}
              title={copied ? 'Copied!' : 'Copy token'}
              className="shrink-0 text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              {copied ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          </div>
        )}
        <button
          onClick={logout}
          className="h-12 w-48 rounded-full border border-black/10 px-5 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="h-12 w-48 rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-200"
    >
      Log in
    </button>
  );
}
