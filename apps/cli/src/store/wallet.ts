import { homedir } from 'os';
import { join } from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const CONFIG_DIR = join(homedir(), '.a2a-wallet');
export const WALLET_FILE = join(CONFIG_DIR, 'wallet.json');
export const KEY_FILE = join(CONFIG_DIR, '.key');

interface StoredWalletBase {
  name: string;
  address: string;
  iv: string;
  authTag: string;
  createdAt: string;
}

export interface StoredPrivateKeyWallet extends StoredWalletBase {
  type: 'private-key';
  encryptedPrivateKey: string;
}

export interface StoredMnemonicWallet extends StoredWalletBase {
  type: 'mnemonic';
  encryptedMnemonic: string;
  derivationPath: string;
}

export type StoredWallet = StoredPrivateKeyWallet | StoredMnemonicWallet;

export interface WalletStore {
  wallets: StoredWallet[];
}

function ensureDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadOrCreateKey(): Buffer {
  ensureDir();
  if (existsSync(KEY_FILE)) {
    return Buffer.from(readFileSync(KEY_FILE, 'utf-8').trim(), 'hex');
  }
  const key = randomBytes(32);
  writeFileSync(KEY_FILE, key.toString('hex') + '\n', { mode: 0o600 });
  return key;
}

export function encrypt(
  plaintext: string,
  key: Buffer,
): { encrypted: string; iv: string; authTag: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
  return {
    encrypted: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
  };
}

export function decrypt(encrypted: string, iv: string, authTag: string, key: Buffer): string {
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'hex')),
    decipher.final(),
  ]).toString('utf-8');
}

export function readWalletStore(): WalletStore {
  if (!existsSync(WALLET_FILE)) return { wallets: [] };
  try {
    return JSON.parse(readFileSync(WALLET_FILE, 'utf-8')) as WalletStore;
  } catch {
    console.warn(`Warning: Could not parse wallet file at ${WALLET_FILE}.`);
    return { wallets: [] };
  }
}

export function writeWalletStore(store: WalletStore): void {
  ensureDir();
  writeFileSync(WALLET_FILE, JSON.stringify(store, null, 2) + '\n', { mode: 0o600 });
}
