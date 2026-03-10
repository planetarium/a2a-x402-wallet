import { NETWORKS } from '@a2a-x402-wallet/x402';
import { CopyButton } from '@/components/ui';

// ── types ─────────────────────────────────────────────────────────────────────

export interface PaymentLimit {
  network: string;
  asset: string;
  maxAmount: string;
  isDefault: boolean;
}

// ── supported token options ────────────────────────────────────────────────────

function formatNetworkLabel(network: string): string {
  return network.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
}

export const SUPPORTED_TOKENS = (
  Object.entries(NETWORKS) as [string, (typeof NETWORKS)[keyof typeof NETWORKS]][]
).map(([network, cfg]) => ({
  network,
  asset: cfg.usdcAddress.toLowerCase(),
  tokenName: 'USDC',
  key: `${network}:${cfg.usdcAddress.toLowerCase()}`,
  label: `${formatNetworkLabel(network)} — USDC`,
}));

// ── components ────────────────────────────────────────────────────────────────

export function LimitItem({
  limit,
  isDeleting,
  onDelete,
}: {
  limit: PaymentLimit;
  isDeleting: boolean;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5">
      <div className="min-w-0 flex-1 space-y-1">
        <span className="text-[11px] font-semibold text-zinc-200 uppercase tracking-wide">
          {limit.network}
        </span>
        <div className="text-xs">
          <span className="font-semibold text-zinc-300">≤ {limit.maxAmount}</span>
          <span className="text-zinc-600 ml-1">base units</span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] text-zinc-600 font-mono truncate">{limit.asset}</span>
          <CopyButton text={limit.asset} ariaLabel="Copy token address" />
        </div>
      </div>
      <button
        onClick={onDelete}
        disabled={isDeleting}
        aria-label="Delete limit"
        title="Delete limit"
        className="shrink-0 cursor-pointer text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isDeleting ? (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        )}
      </button>
    </div>
  );
}

export function DefaultLimitItem({ limit }: { limit: PaymentLimit }) {
  const tokenInfo = SUPPORTED_TOKENS.find(
    (t) => t.network === limit.network && t.asset === limit.asset,
  );
  return (
    <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 px-3 py-2.5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
          {limit.network}
        </span>
        {tokenInfo && (
          <span className="text-[11px] text-zinc-600">{tokenInfo.tokenName}</span>
        )}
      </div>
      <div className="text-xs">
        <span className="font-semibold text-zinc-500">≤ {limit.maxAmount}</span>
        <span className="text-zinc-700 ml-1">base units</span>
      </div>
    </div>
  );
}
