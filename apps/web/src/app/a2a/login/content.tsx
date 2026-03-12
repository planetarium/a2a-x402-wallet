'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { CenteredShell, Logo, Card, BtnPrimary, BtnGhost } from '@/components/ui';

export function A2ALoginContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('user_code');
  const { ready, authenticated, login, logout, getAccessToken } = usePrivy();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didFinish = useRef(false);

  useEffect(() => {
    if (!ready || !authenticated || !code || didFinish.current) return;
    didFinish.current = true;

    getAccessToken().then(async (privyToken) => {
      if (!privyToken) { setError('Failed to get access token.'); return; }

      const res = await fetch('/a2a/device/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_code: code, privyToken }),
      });

      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({})) as { error?: string };
        setError(msg ?? 'Authorization failed.');
        didFinish.current = false;
        return;
      }

      setDone(true);
    });
  }, [ready, authenticated, code, getAccessToken]);

  if (!code) {
    return (
      <CenteredShell>
        <Logo centered className="mb-8" />
        <Card>
          <p className="text-sm text-red-400">
            Missing session code. Please run{' '}
            <code className="font-mono text-xs bg-zinc-800 px-1 rounded">a2a-wallet a2a auth</code>{' '}
            again.
          </p>
        </Card>
      </CenteredShell>
    );
  }

  if (!ready) return null;

  return (
    <CenteredShell>
      <Logo centered className="mb-8" />
      <Card>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold text-zinc-200">Connect CLI</p>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              Sign in to authorize the CLI to send A2A requests on your behalf.
            </p>
          </div>

          {!authenticated && (
            <BtnPrimary onClick={login}>Sign in</BtnPrimary>
          )}

          {authenticated && !done && !error && (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2a10 10 0 1 0 10 10" strokeLinecap="round" />
              </svg>
              Authorizing…
            </div>
          )}

          {done && (
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Connected. You can close this tab.
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          {authenticated && (
            <BtnGhost onClick={logout}>Sign out</BtnGhost>
          )}
        </div>
      </Card>
    </CenteredShell>
  );
}
