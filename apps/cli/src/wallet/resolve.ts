import { readConfig } from '../store/config.js';

/**
 * Returns the local wallet name from --wallet option if provided,
 * otherwise falls back to defaultWallet (local type only).
 * Exits with an error if neither resolves to a local wallet name.
 */
export function resolveWalletName(walletOption?: string): string {
  if (walletOption) return walletOption;
  const defaultWallet = readConfig().defaultWallet;
  if (defaultWallet?.type === 'local') return defaultWallet.name;
  console.error('Error: No wallet specified. Use --wallet <name> or set a default with "wallet use <name>".');
  process.exit(1);
}
