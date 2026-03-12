import { homedir } from 'os';
import { join } from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

const CONFIG_DIR = join(homedir(), '.a2a-wallet');
const PENDING_AUTHS_FILE = join(CONFIG_DIR, 'pending-auths.json');

export interface PendingAuth {
  deviceCode: string;
  tokenUrl: string;
  expiresAt: string; // ISO 8601 datetime
}

type PendingAuthStore = Record<string, PendingAuth>; // keyed by user_code

function read(): PendingAuthStore {
  if (!existsSync(PENDING_AUTHS_FILE)) return {};
  try {
    return JSON.parse(readFileSync(PENDING_AUTHS_FILE, 'utf-8')) as PendingAuthStore;
  } catch {
    return {};
  }
}

function write(store: PendingAuthStore): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(PENDING_AUTHS_FILE, JSON.stringify(store, null, 2) + '\n', { mode: 0o600 });
}

function purgeExpired(store: PendingAuthStore): PendingAuthStore {
  const now = new Date();
  return Object.fromEntries(
    Object.entries(store).filter(([, v]) => new Date(v.expiresAt) > now),
  );
}

export function savePendingAuth(userCode: string, auth: PendingAuth): void {
  write({ ...purgeExpired(read()), [userCode]: auth });
}

export function getPendingAuth(userCode: string): PendingAuth | undefined {
  const entry = read()[userCode];
  if (!entry) return undefined;
  if (new Date(entry.expiresAt) <= new Date()) {
    deletePendingAuth(userCode);
    return undefined;
  }
  return entry;
}

export function deletePendingAuth(userCode: string): void {
  const store = read();
  if (!store[userCode]) return;
  const { [userCode]: _, ...rest } = store;
  write(rest);
}
