import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { a2aDeviceStore, generateUserCode } from '@/lib/a2a-device-store';
import { a2aStartLimiter, getClientIp, tooManyRequests } from '@/lib/rate-limit';

const TTL_MS = 5 * 60 * 1000; // 5 minutes
const INTERVAL_S = 5;

export async function POST(req: NextRequest) {
  const { allowed, resetAt } = a2aStartLimiter.check(getClientIp(req));
  if (!allowed) return tooManyRequests(resetAt);

  const deviceCode = randomUUID();
  const userCode = generateUserCode();
  await a2aDeviceStore.create(deviceCode, userCode, TTL_MS);

  const host = req.headers.get('x-forwarded-host') ?? req.nextUrl.host;
  const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', '');
  const baseUrl = process.env.APP_URL ?? `${proto}://${host}`;
  const verificationUri = `${baseUrl}/a2a/login`;
  const verificationUriComplete = `${verificationUri}?user_code=${encodeURIComponent(userCode)}`;

  return NextResponse.json({
    device_code:              deviceCode,
    user_code:                userCode,
    verification_uri:         verificationUri,
    verification_uri_complete: verificationUriComplete,
    expires_in:               TTL_MS / 1000,
    interval:                 INTERVAL_S,
  });
}
