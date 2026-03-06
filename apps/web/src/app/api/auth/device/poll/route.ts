import { NextRequest, NextResponse } from 'next/server';
import { deviceStore } from '@/lib/device-store';
import { pollLimiter, getClientIp, tooManyRequests } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const { allowed, resetAt } = pollLimiter.check(getClientIp(req));
  if (!allowed) return tooManyRequests(resetAt);

  const nonce = req.nextUrl.searchParams.get('nonce');
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!nonce || !UUID_RE.test(nonce)) {
    return NextResponse.json({ error: 'Missing or invalid nonce' }, { status: 400 });
  }

  const entry = deviceStore.get(nonce);
  if (!entry) {
    return NextResponse.json({ error: 'Expired or invalid nonce' }, { status: 404 });
  }

  const headers = { 'Cache-Control': 'no-store' };

  if (!entry.token) {
    return NextResponse.json({ status: 'pending' }, { headers });
  }

  // Token ready — return it and clean up
  deviceStore.delete(nonce);
  return NextResponse.json({ status: 'complete', token: entry.token }, { headers });
}
