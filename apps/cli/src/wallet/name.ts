import { readWalletStore } from '../store/wallet.js';

/** Returns the given name, or auto-generates one in the format wallet-1, wallet-2, ... */
export function resolveWalletNameToCreate(name?: string): string {
  if (name) return name;

  const existing = new Set(readWalletStore().wallets.map((w) => w.name));
  let i = 1;
  while (existing.has(`wallet-${i}`)) i++;
  return `wallet-${i}`;
}
