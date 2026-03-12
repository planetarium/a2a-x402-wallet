import { NextRequest, NextResponse } from 'next/server';
import { privy } from '@/lib/privy';
import { a2aDeviceStore, generateApiKey } from '@/lib/a2a-device-store';
import { a2aCompleteLimiter, getClientIp, tooManyRequests } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const { allowed, resetAt } = a2aCompleteLimiter.check(getClientIp(req));
  if (!allowed) return tooManyRequests(resetAt);

  // Same-origin check — prevents a malicious third party from completing
  // a device session on behalf of an unsuspecting user.
  const origin = req.headers.get('origin');
  const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(/:$/, '');
  const host = req.headers.get('x-forwarded-host') ?? req.nextUrl.host;
  const expectedOrigin = `${proto}://${host}`;
  if (!origin || origin !== expectedOrigin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { user_code, privyToken } = await req.json() as { user_code?: string; privyToken?: string };

  if (!user_code || !privyToken) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const entry = await a2aDeviceStore.getByUserCode(user_code);
  if (!entry) {
    return NextResponse.json({ error: 'expired_code' }, { status: 400 });
  }

  try {
    await privy.verifyAuthToken(privyToken);
  } catch {
    return NextResponse.json({ error: 'Invalid Privy token' }, { status: 401 });
  }

  const apiKey = generateApiKey();
  const ok = await a2aDeviceStore.completeByUserCode(user_code, apiKey);
  if (!ok) {
    return NextResponse.json({ error: 'expired_code' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
