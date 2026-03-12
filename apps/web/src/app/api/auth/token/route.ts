import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { privy } from '@/lib/privy';
import { signJwt } from '@/lib/jwt';
import { db } from '@/lib/db';
import { userSettings } from '@/lib/schema';
import type { WalletWithMetadata } from '@privy-io/server-auth';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  const privyToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!privyToken) {
    return NextResponse.json({ error: 'Authorization header with Privy token required' }, { status: 401 });
  }

  try {
    const claims = await privy.verifyAuthToken(privyToken);
    const user = await privy.getUser(claims.userId);

    const embeddedWallet = user.linkedAccounts.find(
      (a): a is WalletWithMetadata =>
        a.type === 'wallet' &&
        (a.walletClientType === 'privy' || a.walletClientType === 'privy-v2') &&
        a.delegated === true &&
        a.id != null,
    );

    if (!embeddedWallet?.id) {
      return NextResponse.json({ error: 'No delegated embedded wallet found' }, { status: 400 });
    }

    // Look up the user's custom JWT expiry setting; fall back to server default if absent
    const settingRows = await db
      .select({ jwtExpiresIn: userSettings.jwtExpiresIn })
      .from(userSettings)
      .where(eq(userSettings.userId, claims.userId))
      .limit(1);
    const jwtExpiresIn = settingRows[0]?.jwtExpiresIn ?? undefined;

    const token = await signJwt(claims.userId, embeddedWallet.id, jwtExpiresIn);
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: 'Invalid Privy token' }, { status: 401 });
  }
}
