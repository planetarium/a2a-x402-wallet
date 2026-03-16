// RFC 8628 §3.1 — Device Authorization Request
// POST /api/device/authorize
//
// Returns the standard device_code + user_code pair along with the verification
// URIs and polling parameters. The CLI uses device_code to poll /api/device/token;
// the user visits verification_uri_complete (or types user_code at verification_uri).

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { cliDeviceStore } from '@/lib/cli-device-store';
import { generateUserCode } from '@/lib/a2a-device-store';
import { cliV2AuthorizeLimiter, getClientIp, tooManyRequests } from '@/lib/rate-limit';

const TTL_MS     = 5 * 60 * 1000; // 5 minutes (RFC 8628 recommends ≥ 10 min but 5 is fine for CLI)
const INTERVAL_S = 5;             // minimum polling interval in seconds

export async function POST(req: NextRequest) {
  const { allowed, resetAt } = cliV2AuthorizeLimiter.check(getClientIp(req));
  if (!allowed) return tooManyRequests(resetAt);

  const deviceCode = randomUUID();
  const userCode   = generateUserCode();
  await cliDeviceStore.create(deviceCode, userCode, TTL_MS);

  const host    = req.headers.get('x-forwarded-host') ?? req.nextUrl.host;
  const proto   = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', '');
  const baseUrl = process.env.APP_URL ?? `${proto}://${host}`;

  const verificationUri         = `${baseUrl}/device-auth`;
  const verificationUriComplete = `${baseUrl}/device-auth?user_code=${encodeURIComponent(userCode)}`;

  return NextResponse.json({
    device_code:               deviceCode,
    user_code:                 userCode,
    verification_uri:          verificationUri,
    verification_uri_complete: verificationUriComplete,
    expires_in:                TTL_MS / 1000,
    interval:                  INTERVAL_S,
  });
}
