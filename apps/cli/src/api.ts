const LOGIN_HINT =
  'Run `a2a-wallet wallet connect` to log in to the custodial wallet service.\n' +
  'It will open a browser for authentication — or use `--poll <device-code>` for headless login.';

export function exitNotLoggedIn(): never {
  console.error('Error: Not logged in.');
  console.error(LOGIN_HINT);
  process.exit(1);
}

function assertTokenNotExpired(token: string): void {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString('utf8')
    ) as { exp?: number };
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      throw new Error(`Your token has expired.\n${LOGIN_HINT}`);
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Your token')) throw err;
    // malformed JWT — let the server reject it
  }
}

export interface X402SignRequestBody {
  paymentRequirements: {
    scheme: string;
    network: string;
    asset: string;
    payTo: string;
    maxAmountRequired: string;
    maxTimeoutSeconds?: number;
    extra?: Record<string, unknown>;
  };
  validForSeconds?: number;
}

const TIMEOUT_MS = 10_000;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    wrapFetchError(err, timeoutMs);
  } finally {
    clearTimeout(timer);
  }
}

async function handleResponse(res: Response): Promise<unknown> {
  const data = await res.json().catch(() => ({})) as Record<string, unknown>;
  if (res.status === 401) {
    throw new Error(`Token is invalid or expired.\n${LOGIN_HINT}`);
  }
  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After');
    const hint = retryAfter ? ` Try again in ${retryAfter}s.` : ' Try again later.';
    throw new Error(`Too many requests.${hint}`);
  }
  if (!res.ok) {
    throw new Error(data['error'] ? String(data['error']) : `HTTP ${res.status}`);
  }
  return data;
}

function wrapFetchError(err: unknown, timeoutMs = TIMEOUT_MS): never {
  if (err instanceof Error && err.name === 'AbortError') {
    throw new Error(`Request timed out after ${timeoutMs / 1000}s`);
  }
  throw err;
}

export async function callSign(baseUrl: string, token: string, message: string): Promise<unknown> {
  assertTokenNotExpired(token);
  const res = await fetchWithTimeout(`${baseUrl}/api/sign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  });
  return handleResponse(res);
}

export async function callX402Sign(baseUrl: string, token: string, body: X402SignRequestBody): Promise<unknown> {
  assertTokenNotExpired(token);
  const res = await fetchWithTimeout(`${baseUrl}/api/x402/sign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function callWhoami(baseUrl: string, token: string, timeoutMs?: number): Promise<unknown> {
  assertTokenNotExpired(token);
  const res = await fetchWithTimeout(`${baseUrl}/api/me`, {
    headers: { 'Authorization': `Bearer ${token}` },
  }, timeoutMs);
  return handleResponse(res);
}
