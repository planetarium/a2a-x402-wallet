'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePrivy, type WalletWithMetadata } from '@privy-io/react-auth';
import Link from 'next/link';
import { createPublicClient, http, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { Logo, PageBackground, BtnPrimary, BtnSecondary, BtnGhost, Card, CopyButton } from '@/components/ui';
import { DelegateButton } from '@/components/delegate-button';

// ── chain config ──────────────────────────────────────────────────────────────

const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;
const USDC_DECIMALS = 6;
const FAUCET_THRESHOLD = 0.1;

const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });

const ERC20_BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// ── types ─────────────────────────────────────────────────────────────────────

type FaucetState = 'idle' | 'loading' | 'success' | 'error';

// ── page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { ready, authenticated, login, logout, user, getAccessToken } = usePrivy();

  const embeddedWallet = user?.linkedAccounts.find(
    (a): a is WalletWithMetadata =>
      a.type === 'wallet' &&
      (a.walletClientType === 'privy' || a.walletClientType === 'privy-v2'),
  );
  const isDelegated = embeddedWallet?.delegated ?? false;
  const walletAddress = embeddedWallet?.address as `0x${string}` | undefined;
  const displayName = user?.email?.address ?? user?.google?.email ?? user?.wallet?.address ?? null;

  const [balance, setBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [faucetState, setFaucetState] = useState<FaucetState>('idle');
  const [faucetTx, setFaucetTx] = useState<string | null>(null);
  const [faucetError, setFaucetError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!walletAddress) { setBalance(null); return; }
    setBalanceLoading(true);
    try {
      const raw = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_BALANCE_ABI,
        functionName: 'balanceOf',
        args: [walletAddress],
      });
      setBalance(formatUnits(raw, USDC_DECIMALS));
    } catch {
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  async function handleFaucet() {
    setFaucetState('loading');
    setFaucetTx(null);
    setFaucetError(null);
    try {
      const privyToken = await getAccessToken();
      if (!privyToken) throw new Error('Not authenticated');
      const res = await fetch('/api/faucet', {
        method: 'POST',
        headers: { Authorization: `Bearer ${privyToken}` },
      });
      const data = await res.json() as { transaction?: string; error?: string; balance?: string; threshold?: string };
      if (!res.ok) {
        setFaucetState('error');
        setFaucetError(data.error ?? `HTTP ${res.status}`);
      } else {
        setFaucetState('success');
        setFaucetTx(data.transaction ?? null);
        await fetchBalance();
      }
    } catch (err) {
      setFaucetState('error');
      setFaucetError(err instanceof Error ? err.message : String(err));
    }
  }

  const balanceNum = balance !== null ? parseFloat(balance) : null;
  const canFaucet = balanceNum !== null && balanceNum < FAUCET_THRESHOLD;

  // ── loading ────────────────────────────────────────────────────────────────
  if (!ready) {
    return (
      <Shell>
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-zinc-800 rounded w-1/3" />
          <div className="h-24 bg-zinc-800 rounded-xl" />
          <div className="h-24 bg-zinc-800 rounded-xl" />
        </div>
      </Shell>
    );
  }

  // ── not logged in ──────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <Shell>
        <Card>
          <p className="text-sm font-semibold text-zinc-200 mb-1">Sign in required</p>
          <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
            Sign in with Privy to access your wallet settings.
          </p>
          <BtnPrimary onClick={login}>Sign in</BtnPrimary>
        </Card>
      </Shell>
    );
  }

  // ── settings ───────────────────────────────────────────────────────────────
  return (
    <Shell>
      {/* Account */}
      <Section title="Account">
        <Row label="Signed in as">
          <span className="text-sm text-zinc-300 truncate">{displayName ?? '—'}</span>
        </Row>
      </Section>

      {/* Wallet */}
      <Section title="Wallet">
        <Row label="Address">
          {walletAddress ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs text-zinc-300 font-mono truncate">{walletAddress}</span>
              <CopyButton text={walletAddress} ariaLabel="Copy wallet address" />
            </div>
          ) : (
            <span className="text-sm text-zinc-500">—</span>
          )}
        </Row>
        <Row label="Delegation">
          {isDelegated ? (
            <span className="flex items-center gap-1 text-xs text-emerald-500">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Active
            </span>
          ) : (
            <span className="text-xs text-zinc-500">Not delegated</span>
          )}
        </Row>
        {!isDelegated && (
          <div className="pt-1">
            <DelegateButton />
          </div>
        )}
      </Section>

      {/* Testnet USDC */}
      <Section title="Base Sepolia USDC">
        <Row label="Balance">
          <div className="flex items-center gap-1.5">
            {balanceLoading ? (
              <span className="text-xs text-zinc-500 animate-pulse">Loading…</span>
            ) : balance !== null ? (
              <span className="text-sm text-zinc-300">{parseFloat(balance).toFixed(6)} USDC</span>
            ) : (
              <span className="text-xs text-zinc-500">—</span>
            )}
            <button
              onClick={fetchBalance}
              disabled={balanceLoading}
              aria-label="Refresh balance"
              title="Refresh balance"
              className="cursor-pointer text-zinc-600 hover:text-zinc-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg
                className={`h-3.5 w-3.5 ${balanceLoading ? 'animate-spin' : ''}`}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <path d="M23 4v6h-6" />
                <path d="M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
          </div>
        </Row>

        {/* Faucet */}
        <div className="pt-2 space-y-2">
          {canFaucet || faucetState === 'idle' || faucetState === 'loading' ? (
            <BtnSecondary
              onClick={handleFaucet}
              disabled={faucetState === 'loading' || (!canFaucet && faucetState === 'idle')}
            >
              {faucetState === 'loading' ? 'Requesting…' : 'Request 1 Testnet USDC (Base Sepolia)'}
            </BtnSecondary>
          ) : null}

          {!canFaucet && faucetState === 'idle' && balance !== null && (
            <p className="text-xs text-zinc-600 text-center">
              Faucet available when balance is below {FAUCET_THRESHOLD} USDC
            </p>
          )}

          {faucetState === 'success' && faucetTx && (
            <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/30 px-3 py-2.5 space-y-1">
              <p className="text-xs font-medium text-emerald-400">1 USDC sent successfully</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-zinc-500 font-mono truncate">{faucetTx}</span>
                <CopyButton text={faucetTx} ariaLabel="Copy transaction hash" />
              </div>
              <a
                href={`https://sepolia.basescan.org/tx/${faucetTx}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-2 cursor-pointer"
              >
                View on BaseScan
              </a>
            </div>
          )}

          {faucetState === 'error' && faucetError && (
            <div className="rounded-lg border border-red-800/50 bg-red-950/30 px-3 py-2.5">
              <p className="text-xs text-red-400">{faucetError}</p>
            </div>
          )}
        </div>
      </Section>

      {/* Danger zone */}
      <div className="border-t border-zinc-800 pt-4">
        <BtnGhost onClick={logout}>Sign out</BtnGhost>
      </div>
    </Shell>
  );
}

// ── layout helpers ────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
      <PageBackground />

      <header className="sticky top-0 z-20 w-full border-b border-zinc-900 bg-zinc-950/90 backdrop-blur">
        <div className="flex items-center justify-between px-8 py-4 max-w-2xl mx-auto w-full">
          <Link href="/" className="cursor-pointer">
            <Logo />
          </Link>
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer">
            ← Back
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center px-6 pt-12 pb-24">
        <div className="w-full max-w-2xl space-y-4">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Settings</h1>
          {children}
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-3">
      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{title}</p>
      <div className="space-y-3">{children}</div>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 min-w-0">
      <span className="text-xs text-zinc-500 shrink-0">{label}</span>
      <div className="min-w-0 text-right">{children}</div>
    </div>
  );
}
