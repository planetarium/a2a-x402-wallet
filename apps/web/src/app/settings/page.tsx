'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePrivy, type WalletWithMetadata } from '@privy-io/react-auth';
import Link from 'next/link';
import { createPublicClient, http, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { Logo, PageBackground, BtnPrimary, BtnSecondary, BtnGhost, Card, CopyButton } from '@/components/ui';
import { DelegateButton } from '@/components/delegate-button';
import { NETWORKS, USDC_DECIMALS } from '@a2a-x402-wallet/x402';
import { LimitItem, DefaultLimitItem, SUPPORTED_TOKENS, type PaymentLimit } from '@/components/payment-limit-item';
import { formatUsdcAmountFull } from '@/lib/format';

// ── chain config ──────────────────────────────────────────────────────────────

const USDC_ADDRESS = NETWORKS['base-sepolia'].usdcAddress;

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

// ── GraphQL helper ────────────────────────────────────────────────────────────

async function gql<T = unknown>(
  query: string,
  variables: Record<string, unknown>,
  token: string,
): Promise<{ data?: T; errors?: { message: string }[] }> {
  const res = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  });
  return res.json() as Promise<{ data?: T; errors?: { message: string }[] }>;
}

const USER_SETTINGS_QUERY = `
  query { userSettings { jwtExpiresIn jwtExpiresInDefault } }
`;

const SET_JWT_EXPIRES_IN_MUTATION = `
  mutation SetJwtExpiresIn($value: String) { setJwtExpiresIn(value: $value) { jwtExpiresIn jwtExpiresInDefault } }
`;

const PAYMENT_LIMITS_QUERY = `
  query { paymentLimits { network asset maxAmount isDefault } }
`;

const SET_LIMIT_MUTATION = `
  mutation SetPaymentLimit($network: String!, $asset: String!, $maxAmount: String!) {
    setPaymentLimit(network: $network, asset: $asset, maxAmount: $maxAmount) {
      network asset maxAmount
    }
  }
`;

const DELETE_LIMIT_MUTATION = `
  mutation DeletePaymentLimit($network: String!, $asset: String!) {
    deletePaymentLimit(network: $network, asset: $asset)
  }
`;

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
    if (!walletAddress) return;
    setFaucetState('loading');
    setFaucetTx(null);
    setFaucetError(null);
    try {
      const res = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: walletAddress }),
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

      {/* JWT Expiry */}
      <JwtExpirySection getAccessToken={getAccessToken} />

      {/* Payment Limits */}
      <PaymentLimitsSection getAccessToken={getAccessToken} />

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

// ── JWT Expiry Section ────────────────────────────────────────────────────────

function JwtExpirySection({ getAccessToken }: { getAccessToken: () => Promise<string | null> }) {
  const [current, setCurrent]         = useState<string | null | undefined>(undefined); // undefined = not yet loaded
  const [serverDefault, setServerDefault] = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState<string | null>(null);

  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchSetting = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');
      const result = await gql<{ userSettings: { jwtExpiresIn: string | null; jwtExpiresInDefault: string } | null }>(
        USER_SETTINGS_QUERY, {}, token,
      );
      if (result.errors?.length) throw new Error(result.errors[0].message);
      setCurrent(result.data?.userSettings?.jwtExpiresIn ?? null);
      setServerDefault(result.data?.userSettings?.jwtExpiresInDefault ?? null);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => { fetchSetting(); }, [fetchSetting]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');
      const value = inputValue.trim() || null;
      const result = await gql<{ setJwtExpiresIn: { jwtExpiresIn: string | null; jwtExpiresInDefault: string } }>(
        SET_JWT_EXPIRES_IN_MUTATION, { value }, token,
      );
      if (result.errors?.length) throw new Error(result.errors[0].message);
      setCurrent(result.data?.setJwtExpiresIn.jwtExpiresIn ?? null);
      setServerDefault(result.data?.setJwtExpiresIn.jwtExpiresInDefault ?? null);
      setInputValue('');
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');
      const result = await gql<{ setJwtExpiresIn: { jwtExpiresIn: string | null; jwtExpiresInDefault: string } }>(
        SET_JWT_EXPIRES_IN_MUTATION, { value: null }, token,
      );
      if (result.errors?.length) throw new Error(result.errors[0].message);
      setCurrent(null);
      setServerDefault(result.data?.setJwtExpiresIn.jwtExpiresInDefault ?? null);
      setInputValue('');
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="CLI Token Expiry">
      <Row label="Current setting">
        {loading ? (
          <span className="text-xs text-zinc-500 animate-pulse">Loading…</span>
        ) : fetchError ? (
          <span className="text-xs text-red-400">{fetchError}</span>
        ) : current ? (
          <span className="text-sm text-zinc-300 font-mono">{current}</span>
        ) : (
          <span className="text-xs text-zinc-500">
            Using server default{serverDefault ? <> (<span className="font-mono">{serverDefault}</span>)</> : ''}
          </span>
        )}
      </Row>

      <form onSubmit={handleSave} className="space-y-2 pt-1">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. 5m, 1h, 24h, 7d"
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setSaveSuccess(false); }}
            disabled={saving}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors disabled:opacity-50"
          />
          <BtnPrimary type="submit" disabled={saving || !inputValue.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </BtnPrimary>
          {current && (
            <BtnSecondary type="button" onClick={handleClear} disabled={saving}>
              Clear
            </BtnSecondary>
          )}
        </div>

        <p className="text-[11px] text-zinc-600 leading-relaxed">
          Accepted formats: <span className="font-mono text-zinc-500">5m</span>,{' '}
          <span className="font-mono text-zinc-500">30m</span>,{' '}
          <span className="font-mono text-zinc-500">1h</span>,{' '}
          <span className="font-mono text-zinc-500">24h</span>,{' '}
          <span className="font-mono text-zinc-500">7d</span>.
          Leave empty and click Save, or use Clear, to revert to the server default.
        </p>

        {saveError && <p className="text-xs text-red-400">{saveError}</p>}
        {saveSuccess && <p className="text-xs text-emerald-400">Saved.</p>}
      </form>
    </Section>
  );
}

// ── Payment Limits Section ────────────────────────────────────────────────────

function PaymentLimitsSection({ getAccessToken }: { getAccessToken: () => Promise<string | null> }) {
  const [limits, setLimits] = useState<PaymentLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [formToken, setFormToken] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const fetchLimits = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');
      const result = await gql<{ paymentLimits: PaymentLimit[] }>(PAYMENT_LIMITS_QUERY, {}, token);
      if (result.errors?.length) throw new Error(result.errors[0].message);
      setLimits(result.data?.paymentLimits ?? []);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => { fetchLimits(); }, [fetchLimits]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');
      const selected = SUPPORTED_TOKENS.find((t) => t.key === formToken);
      if (!selected) throw new Error('Please select a token');
      const result = await gql<{ setPaymentLimit: PaymentLimit }>(
        SET_LIMIT_MUTATION,
        { network: selected.network, asset: selected.asset, maxAmount: formAmount.trim() },
        token,
      );
      if (result.errors?.length) throw new Error(result.errors[0].message);
      setFormToken('');
      setFormAmount('');
      setShowForm(false);
      await fetchLimits();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(network: string, asset: string) {
    const key = `${network}:${asset}`;
    setDeletingKey(key);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');
      const result = await gql(DELETE_LIMIT_MUTATION, { network, asset }, token);
      if (result.errors?.length) throw new Error(result.errors[0].message);
      await fetchLimits();
    } catch {
      // silently restore on error
    } finally {
      setDeletingKey(null);
    }
  }

  const userLimits = limits.filter((l) => !l.isDefault);
  const defaultLimits = limits.filter((l) => l.isDefault);

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
          Auto-Approve Payment Limits
        </p>
        <button
          onClick={() => { setShowForm((v) => !v); setSaveError(null); }}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
          aria-label={showForm ? 'Cancel' : 'Add limit'}
        >
          {showForm ? (
            <>
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Cancel
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-zinc-500 leading-relaxed -mt-1">
        Payment requests below the limit are signed automatically. Requests above the limit or for unconfigured assets are rejected.
      </p>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSave} className="space-y-3 pt-1 border-t border-zinc-800">
          <div className="grid grid-cols-2 gap-2.5 pt-3">
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-500">Network / Token</label>
              <select
                value={formToken}
                onChange={(e) => setFormToken(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 transition-colors cursor-pointer"
              >
                <option value="" disabled>Select token…</option>
                {SUPPORTED_TOKENS.filter(
                  (t) => !limits.some((l) => l.network === t.network && l.asset === t.asset && !l.isDefault),
                ).map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-500">Max Amount <span className="text-zinc-600">(base units)</span></label>
              <input
                type="text"
                placeholder="e.g. 1000000"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                required
                pattern="\d+"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
              />
              {formAmount && (
                <p className="text-[11px] text-zinc-500">
                  = <span className="text-zinc-400 font-mono">{formatUsdcAmountFull(formAmount)}</span>
                </p>
              )}
            </div>
          </div>
          {saveError && (
            <p className="text-xs text-red-400">{saveError}</p>
          )}
          <BtnPrimary type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save Limit'}
          </BtnPrimary>
        </form>
      )}

      {/* Limits list */}
      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-10 bg-zinc-800 rounded-lg" />
          <div className="h-10 bg-zinc-800 rounded-lg" />
        </div>
      ) : fetchError ? (
        <div className="rounded-lg border border-red-800/50 bg-red-950/30 px-3 py-2.5 flex items-center justify-between">
          <p className="text-xs text-red-400">{fetchError}</p>
          <button onClick={fetchLimits} className="text-xs text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer ml-3">
            Retry
          </button>
        </div>
      ) : userLimits.length > 0 ? (
        <div className="space-y-2">
          {userLimits.map((limit) => (
            <LimitItem
              key={`${limit.network}:${limit.asset}`}
              limit={limit}
              isDeleting={deletingKey === `${limit.network}:${limit.asset}`}
              onDelete={() => handleDelete(limit.network, limit.asset)}
            />
          ))}
        </div>
      ) : defaultLimits.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] text-zinc-600 uppercase tracking-wider">Defaults</p>
          {defaultLimits.map((limit) => (
            <DefaultLimitItem key={`${limit.network}:${limit.asset}`} limit={limit} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-600 text-center py-2">
          No limits configured. Payments for all assets will be rejected.
        </p>
      )}
    </Card>
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
