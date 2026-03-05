import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { deviceStore } from '@/lib/device-store';

const TTL_MS = 2 * 60 * 1000; // 2 minutes

export async function POST(req: NextRequest) {
  const nonce = randomUUID();
  deviceStore.create(nonce, TTL_MS);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const loginUrl = `${baseUrl}/device-login?nonce=${encodeURIComponent(nonce)}`;

  return NextResponse.json({ nonce, loginUrl });
}
