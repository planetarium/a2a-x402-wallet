import { readConfig } from '../store/config.js';

/**
 * Returns the wallet name from --wallet option if provided, otherwise falls back to defaultWallet.
 * Exits with an error if neither is set.
 */
export function resolveWalletName(walletOption?: string): string {
  if (walletOption) return walletOption;
  const defaultWallet = readConfig().defaultWallet;
  if (defaultWallet) return defaultWallet;
  console.error('Error: No wallet specified. Use --wallet <name> or set a default with "wallet use <name>".');
  process.exit(1);
}
