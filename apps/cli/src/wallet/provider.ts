export const DEFAULT_DERIVATION_PATH = "m/44'/60'/0'/0/0";

export interface WalletEntry {
  name: string;
  address: string;
  type: 'private-key' | 'mnemonic';
  derivationPath?: string; // only present on mnemonic wallets
  createdAt: string;
}

export interface ActiveWallet extends WalletEntry {
  privateKey: `0x${string}`;
}

export abstract class WalletProvider {
  /**
   * Create a new wallet.
   * - If no mnemonic wallet exists, generates a new mnemonic.
   * - If a mnemonic wallet already exists, reuses the first mnemonic and derives the next address index.
   * - Providing a path explicitly overrides auto-detection.
   */
  abstract create(name: string, path?: string): Promise<WalletEntry>;

  /** Import a wallet from a private key (stored encrypted) */
  abstract importFromPrivateKey(name: string, privateKey: string): Promise<WalletEntry>;

  abstract list(): Promise<WalletEntry[]>;

  /** Load a wallet — mnemonic wallets derive the private key on-the-fly */
  abstract load(name: string): Promise<ActiveWallet>;
}
