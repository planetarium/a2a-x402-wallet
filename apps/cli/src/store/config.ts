import { homedir } from 'os';
import { join } from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

const CONFIG_DIR = join(homedir(), '.a2a-wallet');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export const DEFAULT_URL = 'https://a2a-x402-wallet-web.fly.dev';

export interface Connection {
  apiKey: string;
  connectedAt: string; // ISO 8601 datetime
}

export interface Config {
  url?: string;
  token?: string;
  connections?: Record<string, Connection>;
  defaultWallet?: string;
}

export function readConfig(): Config {
  if (!existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8')) as Config;
  } catch {
    console.warn(`Warning: Could not parse config file at ${CONFIG_FILE}. Using defaults.`);
    return {};
  }
}

export function writeConfig(config: Config): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
}

export interface EffectiveConfig {
  url: string;
  token: string;
}

export function getConnection(url: string): Connection | undefined {
  const origin = new URL(url).origin;
  return readConfig().connections?.[origin];
}

export function setConnection(url: string, connection: Connection): void {
  const origin = new URL(url).origin;
  const existing = readConfig();
  writeConfig({
    ...existing,
    connections: { ...existing.connections, [origin]: connection },
  });
}

export function removeConnection(url: string): boolean {
  const origin = new URL(url).origin;
  const existing = readConfig();
  if (!existing.connections?.[origin]) return false;
  const { [origin]: _, ...rest } = existing.connections;
  writeConfig({ ...existing, connections: rest });
  return true;
}

export function listConnections(): Array<{ origin: string; connection: Connection }> {
  const connections = readConfig().connections ?? {};
  return Object.entries(connections).map(([origin, connection]) => ({ origin, connection }));
}

export function getEffectiveConfig(overrides?: Partial<Config>): EffectiveConfig {
  const file = readConfig();
  return {
    url: overrides?.url ?? process.env['A2A_WALLET_URL'] ?? file.url ?? DEFAULT_URL,
    token: overrides?.token ?? process.env['A2A_WALLET_TOKEN'] ?? file.token ?? '',
  };
}
