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
    return null;
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
      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
    >
      Delegate wallet to backend
    </button>
  );
}
