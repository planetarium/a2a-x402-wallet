'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePrivy, useSigners, useCreateWallet, type WalletWithMetadata } from '@privy-io/react-auth';
import {
  CenteredShell, Logo, Card, StepIndicator,
  BtnPrimary, BtnSecondary, BtnGhost, Divider,
  Code, LoginSkeleton, DelegationModal,
} from '@/components/ui';

const SIGNER_ID = process.env.NEXT_PUBLIC_PRIVY_AUTHORIZATION_KEY_ID!;

export function CliLoginContent() {
  const searchParams = useSearchParams();
  const callback = searchParams.get('callback');
  const { ready, authenticated, login, logout, user, getAccessToken } = usePrivy();
  const { addSigners } = useSigners();
  const { createWallet } = useCreateWallet();
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [delegating, setDelegating] = useState(false);
  const [creatingWallet, setCreatingWallet] = useState(false);
  const didRedirect = useRef(false);

  const embeddedWallet = user?.linkedAccounts.find(
    (a): a is WalletWithMetadata =>
      a.type === 'wallet' &&
      (a.walletClientType === 'privy' || a.walletClientType === 'privy-v2'),
  );
  const isDelegated = embeddedWallet?.delegated ?? false;
  const currentStep = !authenticated ? 1 : !isDelegated ? 2 : 3;

  useEffect(() => {
    if (!ready || !authenticated || !isDelegated || !callback || didRedirect.current) return;
    didRedirect.current = true;
    getAccessToken().then(async (privyToken) => {
      if (!privyToken) { window.location.href = `${callback}?error=no_privy_token`; return; }
      const res = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { Authorization: `Bearer ${privyToken}` },
      });
      if (!res.ok) { window.location.href = `${callback}?error=token_exchange_failed`; return; }
      const { token } = await res.json();
      window.location.href = `${callback}?token=${encodeURIComponent(token)}`;
    });
  }, [ready, authenticated, isDelegated, callback, getAccessToken]);

  async function handleDelegate() {
    if (!embeddedWallet) return;
    setDelegating(true);
    try {
      await addSigners({ address: embeddedWallet.address, signers: [{ signerId: SIGNER_ID }] });
      const privyToken = await getAccessToken();
      if (privyToken) {
        try {
          await fetch('/api/faucet', {
            method: 'POST',
            headers: { Authorization: `Bearer ${privyToken}` },
          });
        } catch {
          // proceed regardless of faucet result
        }
      }
    } finally {
      setDelegating(false);
    }
  }

  if (!callback) {
    return (
      <CenteredShell>
        <Logo centered className="mb-8" />
        <Card>
          <p className="text-sm text-red-400">
            Missing callback parameter. Please run{' '}
            <Code>a2a-wallet auth login</Code>{' '}
            again.
          </p>
        </Card>
      </CenteredShell>
    );
  }

  if (!ready) {
    return <LoginSkeleton />;
  }

  return (
    <CenteredShell>
      <Logo centered className="mb-8" />
      <Card>
        <StepIndicator current={currentStep as 1 | 2 | 3} />
        <Divider />

        <div className="pt-5 flex flex-col gap-4">
          {/* Step 1: Sign in */}
          {!authenticated && (
            <>
              <div>
                <p className="text-sm font-semibold text-zinc-200">Sign in to continue</p>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  Your CLI is requesting access to sign x402 payments on your behalf.
                </p>
              </div>
              <BtnPrimary onClick={login}>Sign in</BtnPrimary>
            </>
          )}

          {/* Step 2: Delegate */}
          {authenticated && !isDelegated && (
            <>
              <div>
                <p className="text-sm font-semibold text-zinc-200">Authorize the CLI</p>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  Allow the backend to sign x402 payments when triggered by your CLI commands.
                </p>
              </div>
              {embeddedWallet ? (
                <BtnPrimary onClick={() => setShowDelegateModal(true)} disabled={delegating}>
                  {delegating ? 'Delegating...' : 'Delegate wallet'}
                </BtnPrimary>
              ) : (
                <BtnSecondary
                  onClick={async () => {
                    setCreatingWallet(true);
                    try { await createWallet(); } finally { setCreatingWallet(false); }
                  }}
                  disabled={creatingWallet}
                >
                  {creatingWallet ? 'Creating wallet...' : 'Create wallet'}
                </BtnSecondary>
              )}
              <Divider />
              <BtnGhost onClick={logout}>Sign out</BtnGhost>
            </>
          )}

          {/* Step 3: Done */}
          {authenticated && isDelegated && (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <div className="h-10 w-10 rounded-full bg-emerald-900/20 border border-emerald-800/50 flex items-center justify-center">
                <svg className="h-5 w-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-200">Authorizing CLI...</p>
                <p className="text-xs text-zinc-500 mt-1">You can close this tab once the CLI confirms login.</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {showDelegateModal && (
        <DelegationModal
          onClose={() => setShowDelegateModal(false)}
          onConfirm={() => { setShowDelegateModal(false); handleDelegate(); }}
        />
      )}
    </CenteredShell>
  );
}
