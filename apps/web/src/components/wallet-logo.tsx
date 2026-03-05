export function WalletLogo() {
  return (
    <div className="flex flex-col items-center gap-3 mb-8">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 dark:bg-zinc-50 shadow-sm">
        <svg className="h-5 w-5 text-white dark:text-zinc-900" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="5" width="20" height="15" rx="2" stroke="currentColor" strokeWidth="1.75" />
          <path d="M2 10h20" stroke="currentColor" strokeWidth="1.75" />
          <rect x="15" y="13" width="5" height="3" rx="1.5" fill="currentColor" />
        </svg>
      </div>
      <p className="text-lg font-semibold tracking-tight">
        <span className="font-mono">x402</span>{' '}Wallet
      </p>
    </div>
  );
}
