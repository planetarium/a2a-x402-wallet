'use client';

import { useState } from 'react';
import { usePrivy, type WalletWithMetadata } from '@privy-io/react-auth';
import { DelegateButton } from './delegate-button';
import { BtnPrimary, BtnSecondary, BtnGhost, CopyButton, Divider } from './ui';

export function LoginButton() {
  const { ready, authenticated, login, logout, user, getAccessToken } = usePrivy();
  const [appToken, setAppToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const embeddedWallet = user?.linkedAccounts.find(
    (a): a is WalletWithMetadata =>
      a.type === 'wallet' &&
      (a.walletClientType === 'privy' || a.walletClientType === 'privy-v2'),
  );
  const isDelegated = embeddedWallet?.delegated ?? false;

  const displayName = user?.email?.address ?? user?.google?.email ?? user?.wallet?.address ?? null;
  const initials = displayName ? displayName[0].toUpperCase() : '?';

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

  if (!ready) {
    return (
      <div className="flex flex-col gap-3 animate-pulse">
        <div className="h-10 rounded-lg bg-zinc-800" />
        <div className="h-9 rounded-lg bg-zinc-800" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-zinc-200">Sign in to your wallet</p>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
            Connect your embedded wallet and authorize CLI access for autonomous agent payments.
          </p>
        </div>
        <BtnPrimary onClick={login}>Sign in</BtnPrimary>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* User info */}
      <div className="flex items-center gap-3 rounded-lg bg-zinc-800/60 border border-zinc-700/50 px-3 py-2.5">
        <div className="h-8 w-8 shrink-0 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-200">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-200 truncate">{displayName ?? 'Wallet'}</p>
          <p className="text-xs text-zinc-500">Privy embedded wallet</p>
        </div>
      </div>

      {/* Delegation */}
      {isDelegated ? (
        <div className="flex items-center gap-1.5 text-xs text-emerald-500 px-1">
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
          <BtnSecondary onClick={handleGetToken} disabled={loading}>
            {loading ? 'Generating...' : 'Get CLI token'}
          </BtnSecondary>
          {appToken && (
            <div className="flex items-center gap-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 px-3 py-2">
              <p className="flex-1 truncate text-xs text-zinc-300">{appToken}</p>
              <CopyButton text={appToken} ariaLabel="Copy token" />
            </div>
          )}
        </>
      )}

      <Divider />
      <BtnGhost onClick={logout}>Sign out</BtnGhost>
    </div>
  );
}
