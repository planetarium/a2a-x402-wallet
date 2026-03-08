'use client';

import { useState } from 'react';
import { usePrivy, useSigners, type WalletWithMetadata } from '@privy-io/react-auth';
import { BtnSecondary } from './ui';

const SIGNER_ID = process.env.NEXT_PUBLIC_PRIVY_AUTHORIZATION_KEY_ID!;

export function DelegateButton() {
  const { user } = usePrivy();
  const { addSigners } = useSigners();
  const [delegating, setDelegating] = useState(false);

  const embeddedWallet = user?.linkedAccounts.find(
    (a): a is WalletWithMetadata =>
      a.type === 'wallet' &&
      (a.walletClientType === 'privy' || a.walletClientType === 'privy-v2')
  );

  if (!embeddedWallet || embeddedWallet.delegated) return null;

  async function handleAddSigner() {
    if (!embeddedWallet) return;
    setDelegating(true);
    try {
      await addSigners({
        address: embeddedWallet.address,
        signers: [{ signerId: SIGNER_ID }],
      });
    } finally {
      setDelegating(false);
    }
  }

  return (
    <BtnSecondary onClick={handleAddSigner} disabled={delegating}>
      {delegating ? 'Delegating...' : 'Delegate wallet to backend'}
    </BtnSecondary>
  );
}
