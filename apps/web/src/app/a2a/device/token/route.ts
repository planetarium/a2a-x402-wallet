import { NextRequest, NextResponse } from 'next/server';
import { a2aDeviceStore } from '@/lib/a2a-device-store';
import { a2aPollLimiter, getClientIp } from '@/lib/rate-limit';

const DEVICE_CODE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code';

const headers = { 'Cache-Control': 'no-store' };

export async function POST(req: NextRequest) {
  const { allowed } = a2aPollLimiter.check(getClientIp(req));
  if (!allowed) {
    return NextResponse.json({ error: 'slow_down' }, { status: 400, headers });
  }

  const body = await req.text();
  const params = new URLSearchParams(body);

  const grantType  = params.get('grant_type');
  const deviceCode = params.get('device_code');
  const clientId   = params.get('client_id');

  if (grantType !== DEVICE_CODE_GRANT || !deviceCode || !clientId) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400, headers });
  }

  const entry = await a2aDeviceStore.get(deviceCode);

  if (!entry) {
    return NextResponse.json({ error: 'expired_token' }, { status: 400, headers });
  }

  if (!entry.apiKey) {
    return NextResponse.json({ error: 'authorization_pending' }, { status: 400, headers });
  }

  // Access token ready — consume and clean up
  await a2aDeviceStore.delete(deviceCode);
  return NextResponse.json(
    { access_token: entry.apiKey, token_type: 'bearer' },
    { headers },
  );
}
