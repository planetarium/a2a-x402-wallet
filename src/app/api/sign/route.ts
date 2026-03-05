import { NextRequest, NextResponse } from 'next/server';
import { privy } from '@/lib/privy';
import { verifyJwt } from '@/lib/jwt';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
  }

  let walletId: string;
  try {
    const payload = await verifyJwt(token);
    walletId = payload.walletId;
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const { message } = await req.json() as { message: string };

  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  try {
    const { signature } = await privy.walletApi.ethereum.signMessage({ walletId, message });
    return NextResponse.json({ signature });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[/api/sign]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
