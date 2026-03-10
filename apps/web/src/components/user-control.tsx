'use client';

import { useEffect, useRef, useState } from 'react';
import { usePrivy, type WalletWithMetadata } from '@privy-io/react-auth';
import Link from 'next/link';

export function UserControl() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const embeddedWallet = user?.linkedAccounts.find(
    (a): a is WalletWithMetadata =>
      a.type === 'wallet' &&
      (a.walletClientType === 'privy' || a.walletClientType === 'privy-v2'),
  );
  const isDelegated = embeddedWallet?.delegated ?? false;

  const displayName =
    user?.email?.address ?? user?.google?.email ?? user?.wallet?.address ?? null;
  const initials = displayName ? displayName[0].toUpperCase() : '?';
  const shortName =
    user?.email?.address ??
    user?.google?.email ??
    (user?.wallet?.address
      ? `${user.wallet.address.slice(0, 6)}…${user.wallet.address.slice(-4)}`
      : null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!ready) {
    return <div className="h-7 w-7 rounded-full bg-zinc-800 animate-pulse" />;
  }

  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
      >
        Sign in
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      {/* Avatar button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="User menu"
        aria-expanded={open}
        className="flex items-center gap-2 cursor-pointer group"
      >
        <div className="h-7 w-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-200 group-hover:bg-zinc-600 transition-colors ring-1 ring-white/10">
          {initials}
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl ring-1 ring-white/[0.04] overflow-hidden z-50">
          {/* User info */}
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-xs font-medium text-zinc-200 truncate">{shortName}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1">
              {isDelegated ? (
                <>
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Delegated
                </>
              ) : (
                <>
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-600" />
                  Not delegated
                </>
              )}
            </p>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors cursor-pointer"
            >
              <svg className="h-3.5 w-3.5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Settings
            </Link>
            <div className="border-t border-zinc-800 my-1" />
            <button
              onClick={() => { setOpen(false); logout(); }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
