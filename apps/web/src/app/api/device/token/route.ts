// RFC 8628 §3.4 / RFC 6749 §5 — Device Access Token Request
// POST /api/device/token
//
// Accepts application/x-www-form-urlencoded (RFC standard) or application/json.
// Returns RFC 6749 §5.1 token response on success, or RFC 8628 §3.5 error codes
// while the authorization is pending.

import { NextRequest, NextResponse } from 'next/server';
import { cliDeviceStore } from '@/lib/cli-device-store';
import { cliV2TokenLimiter, getClientIp, tooManyRequests } from '@/lib/rate-limit';

const GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code';

function errorResponse(error: string, status = 400): NextResponse {
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  const { allowed, resetAt } = cliV2TokenLimiter.check(getClientIp(req));
  if (!allowed) return tooManyRequests(resetAt);

  let grantType: string | undefined;
  let deviceCode: string | undefined;

  const ct = req.headers.get('content-type') ?? '';
  if (ct.includes('application/x-www-form-urlencoded')) {
    const form = await req.formData().catch(() => null);
    if (!form) return errorResponse('invalid_request');
    grantType  = form.get('grant_type')  as string | undefined ?? undefined;
    deviceCode = form.get('device_code') as string | undefined ?? undefined;
  } else {
    const body = await req.json().catch(() => null) as Record<string, string> | null;
    if (!body) return errorResponse('invalid_request');
    grantType  = body.grant_type;
    deviceCode = body.device_code;
  }

  if (grantType !== GRANT_TYPE) {
    return errorResponse('unsupported_grant_type');
  }
  if (!deviceCode) {
    return errorResponse('invalid_request');
  }

  const entry = await cliDeviceStore.getByDeviceCode(deviceCode);
  if (!entry) {
    // Nonce not found or expired
    return errorResponse('expired_token');
  }

  if (entry.status === 'denied') {
    return errorResponse('access_denied');
  }

  if (entry.status === 'pending' || !entry.token) {
    return errorResponse('authorization_pending');
  }

  // Token ready — consume the session and return the access token
  await cliDeviceStore.deleteByDeviceCode(deviceCode);

  return NextResponse.json(
    { access_token: entry.token, token_type: 'bearer' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
