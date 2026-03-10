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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const loginUrl = `${baseUrl}/device-login?nonce=${encodeURIComponent(nonce)}`;

  return NextResponse.json({ nonce, loginUrl });
}
