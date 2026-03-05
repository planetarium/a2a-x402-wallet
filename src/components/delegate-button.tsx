'use client';

import { usePrivy, useSigners, type WalletWithMetadata } from '@privy-io/react-auth';

const SIGNER_ID = process.env.NEXT_PUBLIC_PRIVY_AUTHORIZATION_KEY_ID!;

export function DelegateButton() {
  const { user } = usePrivy();
  const { addSigners } = useSigners();

  const embeddedWallet = user?.linkedAccounts.find(
    (a): a is WalletWithMetadata =>
      a.type === 'wallet' &&
      (a.walletClientType === 'privy' || a.walletClientType === 'privy-v2')
  );

  if (!embeddedWallet) return null;

  if (embeddedWallet.delegated) {
    return (
      <p className="text-xs text-green-600 dark:text-green-400">
        Wallet delegated ✓
      </p>
    );
  }

  async function handleAddSigner() {
    if (!embeddedWallet) return;
    await addSigners({
      address: embeddedWallet.address,
      signers: [{ signerId: SIGNER_ID }],
    });
  }

  return (
    <button
      onClick={handleAddSigner}
      className="h-10 w-48 rounded-full border border-black/10 px-5 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
    >
      Delegate to backend
    </button>
  );
}
