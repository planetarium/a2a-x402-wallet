import { Suspense } from 'react';
import { CliLoginContent } from './content';
import { WalletLogo } from '@/components/wallet-logo';

export default function CliLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
          <div className="w-full max-w-sm">
            <WalletLogo />
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-6">
              <div className="flex flex-col gap-3 animate-pulse">
                <div className="h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 w-3/4 mx-auto" />
                <div className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
              </div>
            </div>
          </div>
        </main>
      }
    >
      <CliLoginContent />
    </Suspense>
  );
}
