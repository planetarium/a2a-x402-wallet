import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { a2aDeviceStore } from '@/lib/a2a-device-store';
import { a2aStartLimiter, getClientIp, tooManyRequests } from '@/lib/rate-limit';

const TTL_MS = 5 * 60 * 1000; // 5 minutes
const INTERVAL_S = 3;

export async function POST(req: NextRequest) {
  const { allowed, resetAt } = a2aStartLimiter.check(getClientIp(req));
  if (!allowed) return tooManyRequests(resetAt);

  const code = randomUUID();
  await a2aDeviceStore.create(code, TTL_MS);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const loginUrl = `${baseUrl}/a2a/login?code=${encodeURIComponent(code)}`;

  return NextResponse.json({
    device_code: code,
    login_url:   loginUrl,
    expires_in:  TTL_MS / 1000,
    interval:    INTERVAL_S,
  });
}
