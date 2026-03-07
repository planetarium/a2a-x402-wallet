import { readFileSync } from 'fs';
import { getAddress, isAddress } from 'viem';
import { callWhoami } from '../../api.js';
import type { SiweFields, SiweTokenPayload } from './types.js';

export function parseTtlMs(ttl: string): number {
  const match = /^(\d+)(m|h|d)$/.exec(ttl);
  if (!match) {
    throw new Error(`invalid --ttl format: "${ttl}" (use 30m, 1h, 7d)`);
  }
  const n = parseInt(match[1]!, 10);
  if (n === 0) {
    throw new Error(`--ttl must be greater than 0 (got "${ttl}")`);
  }
  const unit = match[2]!;
  if (unit === 'm') return n * 60 * 1000;
  if (unit === 'h') return n * 60 * 60 * 1000;
  return n * 24 * 60 * 60 * 1000; // 'd'
}

export function makeSiweMessage(
  address: string,
  domain: string,
  uri: string,
  ttl: string,
  statement: string,
  chainId: number,
): string {
  if (!isAddress(address)) {
    throw new Error(`invalid Ethereum address: "${address}"`);
  }
  const checksummed = getAddress(address); // EIP-55 checksum (required by EIP-4361)

  // Reject inputs that contain newlines — they would break the SIWE message structure
  for (const [name, value] of [['domain', domain], ['uri', uri], ['statement', statement]] as const) {
    if (value.includes('\n') || value.includes('\r')) {
      throw new Error(`--${name} must not contain newline characters`);
    }
  }

  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new Error(`invalid --chain-id: "${chainId}" (must be a positive integer)`);
  }

  const ttlMs = parseTtlMs(ttl);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);
  const nonce = crypto.randomUUID().replace(/-/g, '');

  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    checksummed,
    '',
    statement,
    '',
    `URI: ${uri}`,
    `Version: 1`,
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${now.toISOString()}`,
    `Expiration Time: ${expiresAt.toISOString()}`,
  ].join('\n');
}

export function encodeToken(message: string, signature: string): string {
  const payload: SiweTokenPayload = { message, signature };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeToken(token: string): SiweTokenPayload {
  let parsed: unknown;
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf-8');
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('invalid token (bad JSON)');
  }
  if (
    parsed === null ||
    typeof parsed !== 'object' ||
    typeof (parsed as Record<string, unknown>)['message'] !== 'string' ||
    typeof (parsed as Record<string, unknown>)['signature'] !== 'string'
  ) {
    throw new Error('invalid token (missing fields)');
  }
  return parsed as SiweTokenPayload;
}

export function parseSiweMessage(text: string): SiweFields {
  // Normalize CRLF and bare CR to LF
  const lines = text.split(/\r?\n|\r/);

  const firstLine = lines[0] ?? '';
  const domainMatch = /^(.+) wants you to sign in with your Ethereum account:$/.exec(firstLine);
  if (!domainMatch) {
    throw new Error('invalid SIWE message');
  }
  const domain = domainMatch[1]!;
  const address = lines[1] ?? '';

  // statement is the non-empty line after the first blank line,
  // but only if it doesn't look like a field (EIP-4361 fields start with a known prefix)
  const FIELD_PREFIX = /^(URI|Version|Chain ID|Nonce|Issued At|Expiration Time|Not Before|Request ID|Resources):/;
  let statement = '';
  let i = 2;
  while (i < lines.length && lines[i] !== '') i++; // skip to first blank line
  i++; // move past blank line
  while (i < lines.length && lines[i] === '') i++; // skip extra blanks
  if (i < lines.length && !FIELD_PREFIX.test(lines[i]!)) {
    statement = lines[i]!;
    i++; // move past statement line
    while (i < lines.length && lines[i] !== '') i++; // skip any remaining statement block
    i++; // move past blank line after statement
  }
  const fieldsStart = i; // only search fields section — prevents statement from shadowing field values

  const get = (prefix: string): string | undefined => {
    const line = lines.slice(fieldsStart).find((l) => l.startsWith(prefix));
    return line ? line.slice(prefix.length) : undefined;
  };

  const uri = get('URI: ') ?? '';
  const chainIdStr = get('Chain ID: ') ?? '1';
  const nonce = get('Nonce: ') ?? '';
  const issuedAt = get('Issued At: ') ?? '';
  const expiresAt = get('Expiration Time: ');

  return { domain, address, statement, uri, chainId: parseInt(chainIdStr, 10), nonce, issuedAt, expiresAt };
}

export async function readMessageInput(filePath?: string): Promise<string> {
  if (filePath) {
    return readFileSync(filePath, 'utf-8');
  }

  // stdin
  if (process.stdin.isTTY) {
    console.error('Reading SIWE message from stdin (Ctrl+D to finish)...');
  }
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

export async function resolveWalletAddress(url: string, token: string): Promise<string> {
  const me = await callWhoami(url, token);
  const linkedAccounts = (
    me !== null &&
    typeof me === 'object' &&
    'user' in me &&
    me.user !== null &&
    typeof me.user === 'object' &&
    'linkedAccounts' in me.user &&
    Array.isArray((me.user as Record<string, unknown>)['linkedAccounts'])
  )
    ? (me.user as { linkedAccounts: Array<{ type?: unknown; address?: unknown }> }).linkedAccounts
    : null;

  if (!linkedAccounts) {
    throw new Error('Unexpected response from server.');
  }

  const wallet = linkedAccounts.find(
    (a) => (a.type === 'wallet' || a.type === 'ethereum_wallet') && a.address,
  );
  const address = typeof wallet?.address === 'string' ? wallet.address : undefined;

  if (!address) {
    throw new Error('Could not determine wallet address from account.');
  }

  return address;
}

export function die(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}
