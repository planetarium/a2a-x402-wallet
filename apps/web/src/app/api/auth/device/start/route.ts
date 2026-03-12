import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { deviceStore } from '@/lib/device-store';
import { startLimiter, getClientIp, tooManyRequests } from '@/lib/rate-limit';

const TTL_MS = 2 * 60 * 1000; // 2 minutes

export async function POST(req: NextRequest) {
  const { allowed, resetAt } = startLimiter.check(getClientIp(req));
  if (!allowed) return tooManyRequests(resetAt);

  const nonce = randomUUID();
  await deviceStore.create(nonce, TTL_MS);

  const host = req.headers.get('x-forwarded-host') ?? req.nextUrl.host;
  const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', '');
  const baseUrl = process.env.APP_URL ?? `${proto}://${host}`;
  const loginUrl = `${baseUrl}/device-login?nonce=${encodeURIComponent(nonce)}`;

  return NextResponse.json({ nonce, loginUrl });
}
