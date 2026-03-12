import { NextRequest, NextResponse } from 'next/server';
import { a2aDeviceStore } from '@/lib/a2a-device-store';
import { a2aPollLimiter, getClientIp, tooManyRequests } from '@/lib/rate-limit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const { allowed, resetAt } = a2aPollLimiter.check(getClientIp(req));
  if (!allowed) return tooManyRequests(resetAt);

  const code = req.nextUrl.searchParams.get('code');
  if (!code || !UUID_RE.test(code)) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const entry = await a2aDeviceStore.get(code);
  const headers = { 'Cache-Control': 'no-store' };

  if (!entry) {
    return NextResponse.json({ status: 'expired' }, { headers });
  }

  if (!entry.apiKey) {
    return NextResponse.json({ status: 'pending' }, { headers });
  }

  // API key ready — consume and clean up
  await a2aDeviceStore.delete(code);
  return NextResponse.json({ status: 'complete', api_key: entry.apiKey }, { headers });
}
