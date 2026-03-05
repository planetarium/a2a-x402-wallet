import { LoginButton } from '@/components/login-button';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">x402 Wallet</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Sign in to continue
        </p>
      </div>
      <LoginButton />
    </main>
  );
}
