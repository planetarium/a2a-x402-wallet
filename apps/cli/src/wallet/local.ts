import { privateKeyToAccount } from 'viem/accounts';
import { HDKey } from '@scure/bip32';
import { generateMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { WalletProvider, WalletEntry, ActiveWallet, DEFAULT_DERIVATION_PATH } from './provider.js';
import {
  loadOrCreateKey,
  encrypt,
  decrypt,
  readWalletStore,
  writeWalletStore,
  StoredMnemonicWallet,
  StoredWallet,
} from '../store/wallet.js';

// Extracts the address index from the standard m/44'/60'/0'/0/{index} path pattern
const STANDARD_PATH_RE = /^m\/44'\/60'\/0'\/0\/(\d+)$/;

function derivePrivateKey(mnemonic: string, derivationPath: string): `0x${string}` {
  const seed = mnemonicToSeedSync(mnemonic);
  const hdKey = HDKey.fromMasterSeed(seed);
  const derived = hdKey.derive(derivationPath);
  if (!derived.privateKey) {
    throw new Error('Failed to derive private key from mnemonic.');
  }
  return `0x${Buffer.from(derived.privateKey).toString('hex')}`;
}

function toWalletEntry(stored: StoredWallet): WalletEntry {
  return stored.type === 'mnemonic'
    ? { name: stored.name, address: stored.address, type: 'mnemonic', derivationPath: stored.derivationPath, createdAt: stored.createdAt }
    : { name: stored.name, address: stored.address, type: 'private-key', createdAt: stored.createdAt };
}

/** Returns the next address index based on existing mnemonic wallets */
function nextAddressIndex(mnemonicWallets: StoredMnemonicWallet[]): number {
  let max = -1;
  for (const w of mnemonicWallets) {
    const match = STANDARD_PATH_RE.exec(w.derivationPath);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return max + 1;
}

export class LocalWalletProvider extends WalletProvider {
  async create(name: string, path?: string): Promise<WalletEntry> {
    const store = readWalletStore();
    if (store.wallets.some((w) => w.name === name)) {
      throw new Error(`Wallet "${name}" already exists.`);
    }

    const existingMnemonicWallets = store.wallets.filter(
      (w): w is StoredMnemonicWallet => w.type === 'mnemonic',
    );

    const encKey = loadOrCreateKey();
    let mnemonic: string;
    let derivationPath: string;

    if (existingMnemonicWallets.length === 0) {
      // First wallet: generate a new mnemonic
      mnemonic = generateMnemonic(wordlist);
      derivationPath = path ?? DEFAULT_DERIVATION_PATH;
    } else {
      // Reuse the existing mnemonic (based on the oldest mnemonic wallet)
      const first = existingMnemonicWallets[0];
      mnemonic = decrypt(first.encryptedMnemonic, first.iv, first.authTag, encKey);
      derivationPath = path ?? `m/44'/60'/0'/0/${nextAddressIndex(existingMnemonicWallets)}`;
    }

    const privateKey = derivePrivateKey(mnemonic, derivationPath);
    const account = privateKeyToAccount(privateKey);
    const { encrypted, iv, authTag } = encrypt(mnemonic, encKey);

    const entry: StoredMnemonicWallet = {
      type: 'mnemonic',
      name,
      address: account.address,
      encryptedMnemonic: encrypted,
      iv,
      authTag,
      derivationPath,
      createdAt: new Date().toISOString(),
    };
    store.wallets.push(entry);
    writeWalletStore(store);

    return { name, address: account.address, type: 'mnemonic', derivationPath, createdAt: entry.createdAt };
  }

  async importFromPrivateKey(name: string, rawPrivateKey: string): Promise<WalletEntry> {
    const store = readWalletStore();
    if (store.wallets.some((w) => w.name === name)) {
      throw new Error(`Wallet "${name}" already exists.`);
    }

    const normalized = (rawPrivateKey.startsWith('0x') ? rawPrivateKey : `0x${rawPrivateKey}`) as `0x${string}`;
    let account;
    try {
      account = privateKeyToAccount(normalized);
    } catch {
      throw new Error('Invalid private key format.');
    }

    const encKey = loadOrCreateKey();
    const { encrypted, iv, authTag } = encrypt(normalized, encKey);

    const createdAt = new Date().toISOString();
    store.wallets.push({
      type: 'private-key',
      name,
      address: account.address,
      encryptedPrivateKey: encrypted,
      iv,
      authTag,
      createdAt,
    });
    writeWalletStore(store);

    return { name, address: account.address, type: 'private-key', createdAt };
  }

  async list(): Promise<WalletEntry[]> {
    return readWalletStore().wallets.map(toWalletEntry);
  }

  async load(name: string): Promise<ActiveWallet> {
    const store = readWalletStore();
    const stored = store.wallets.find((w) => w.name === name);
    if (!stored) {
      throw new Error(`Wallet "${name}" not found.`);
    }

    const encKey = loadOrCreateKey();

    if (stored.type === 'mnemonic') {
      const mnemonic = decrypt(stored.encryptedMnemonic, stored.iv, stored.authTag, encKey);
      const privateKey = derivePrivateKey(mnemonic, stored.derivationPath);
      return { ...toWalletEntry(stored), privateKey };
    } else {
      const privateKey = decrypt(stored.encryptedPrivateKey, stored.iv, stored.authTag, encKey) as `0x${string}`;
      return { ...toWalletEntry(stored), privateKey };
    }
  }
}

export { DEFAULT_DERIVATION_PATH };
