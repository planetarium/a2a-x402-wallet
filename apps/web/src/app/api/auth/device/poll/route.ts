import { NextRequest, NextResponse } from 'next/server';
import { deviceStore } from '@/lib/device-store';

export async function GET(req: NextRequest) {
  const nonce = req.nextUrl.searchParams.get('nonce');
  if (!nonce) {
    return NextResponse.json({ error: 'Missing nonce' }, { status: 400 });
  }

  const entry = deviceStore.get(nonce);
  if (!entry) {
    return NextResponse.json({ error: 'Expired or invalid nonce' }, { status: 404 });
  }

  if (!entry.token) {
    return NextResponse.json({ status: 'pending' });
  }

  // Token ready — return it and clean up
  deviceStore.delete(nonce);
  return NextResponse.json({ status: 'complete', token: entry.token });
}
