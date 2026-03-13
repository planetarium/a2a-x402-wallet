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

// RFC 8628 §6.1 — user_code format: XXXX-XXXX uppercase
const USER_CODE_RE = /^[A-Z]{4}-[A-Z]{4}$/;

export function DeviceAuthContent() {
  const searchParams = useSearchParams();
  const userCodeFromUrl = searchParams.get('user_code')?.toUpperCase() ?? '';

  const [userCodeInput, setUserCodeInput] = useState(userCodeFromUrl);
  const [confirmedCode, setConfirmedCode] = useState(userCodeFromUrl || '');
  const [inputError, setInputError] = useState<string | null>(null);

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

  // Step 1: confirm user_code (skipped if pre-filled via URL)
  // Step 2: sign in with Privy
  // Step 3: delegate wallet
  const hasCode    = confirmedCode !== '';
  const currentStep: 1 | 2 | 3 = !authenticated ? 1 : !isDelegated ? 2 : 3;

  // Once signed in and delegated, call the complete endpoint
  useEffect(() => {
    if (!ready || !authenticated || !isDelegated || !confirmedCode || didFinish.current) return;
    didFinish.current = true;
    getAccessToken().then(async (privyToken) => {
      if (!privyToken) { setError('Failed to get Privy token.'); return; }
      const res = await fetch('/api/device/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userCode: confirmedCode, privyToken }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({})) as { error?: string };
        setError(msg ?? 'Authorization failed.');
        didFinish.current = false;
        return;
      }
      setDone(true);
    });
  }, [ready, authenticated, isDelegated, confirmedCode, getAccessToken]);

  async function handleDelegate() {
    if (!embeddedWallet) return;
    if (!SIGNER_ID) { setError('Configuration error: NEXT_PUBLIC_PRIVY_AUTHORIZATION_KEY_ID is not set'); return; }
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delegation failed.');
    } finally {
      setDelegating(false);
    }
  }

  function handleConfirmCode() {
    const trimmed = userCodeInput.trim().toUpperCase();
    if (!USER_CODE_RE.test(trimmed)) {
      setInputError('Enter the code in XXXX-XXXX format (e.g. BCDF-GHJK).');
      return;
    }
    setInputError(null);
    setConfirmedCode(trimmed);
  }

  if (!ready) {
    return <LoginSkeleton />;
  }

  // ── No code yet: ask user to enter it ─────────────────────────────────────
  if (!hasCode) {
    return (
      <CenteredShell>
        <Logo centered className="mb-8" />
        <Card>
          <div className="mb-6 text-center">
            <p className="text-sm font-semibold text-zinc-200">Enter your device code</p>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              Run <Code>a2a-wallet auth device start</Code> in your terminal to get a code.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={userCodeInput}
              onChange={(e) => setUserCodeInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmCode(); }}
              placeholder="XXXX-XXXX"
              maxLength={9}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 text-center text-xl font-mono tracking-widest py-3 px-4 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
              autoFocus
            />
            {inputError && (
              <p className="text-xs text-red-400 text-center">{inputError}</p>
            )}
            <BtnPrimary onClick={handleConfirmCode}>Continue</BtnPrimary>
          </div>
        </Card>
      </CenteredShell>
    );
  }

  // ── Code confirmed: run the auth flow ──────────────────────────────────────
  return (
    <CenteredShell>
      <Logo centered className="mb-8" />
      <Card>
        {/* User code banner */}
        <div className="mb-5 flex flex-col items-center gap-1">
          <p className="text-xs text-zinc-500">Your device code</p>
          <p className="font-mono text-2xl font-bold tracking-widest text-zinc-100">
            {confirmedCode}
          </p>
        </div>

        <StepIndicator current={currentStep} />
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

          {/* Step 3: Done / error */}
          {authenticated && isDelegated && (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <div className={[
                'h-10 w-10 rounded-full border flex items-center justify-center',
                error
                  ? 'bg-red-900/20 border-red-800/50'
                  : done
                  ? 'bg-emerald-900/20 border-emerald-800/50'
                  : 'bg-zinc-800 border-zinc-700',
              ].join(' ')}>
                {error ? (
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                ) : done ? (
                  <svg className="h-5 w-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-zinc-400 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2a10 10 0 1 0 10 10" strokeLinecap="round" />
                  </svg>
                )}
              </div>

              {error ? (
                <p className="text-sm text-red-400">{error}</p>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-zinc-200">
                    {done ? 'Authorized.' : 'Authorizing CLI...'}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">You can close this tab.</p>
                </div>
              )}
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
