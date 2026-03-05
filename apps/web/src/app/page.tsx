import { LoginButton } from '@/components/login-button';
import { WalletLogo } from '@/components/wallet-logo';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <WalletLogo />
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-6">
          <LoginButton />
        </div>
      </div>
    </main>
  );
}
