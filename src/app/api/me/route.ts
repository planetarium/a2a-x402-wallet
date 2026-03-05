import { NextRequest, NextResponse } from 'next/server';
import { privy } from '@/lib/privy';
import { verifyJwt } from '@/lib/jwt';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
  }

  let userId: string;
  try {
    const payload = await verifyJwt(token);
    userId = payload.sub;
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const user = await privy.getUser(userId);

  return NextResponse.json({ user });
}
