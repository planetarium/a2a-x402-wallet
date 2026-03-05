import { NextRequest, NextResponse } from 'next/server';
import { privy } from '@/lib/privy';
import { signJwt } from '@/lib/jwt';
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
        a.walletClientType === 'privy' &&
        a.delegated === true &&
        a.id != null,
    );

    if (!embeddedWallet?.id) {
      return NextResponse.json({ error: 'No delegated embedded wallet found' }, { status: 400 });
    }

    const token = await signJwt(claims.userId, embeddedWallet.id);
    return NextResponse.json({ token });
  } catch (error) {
    return NextResponse.json({ error: `Invalid Privy token: ${error}` }, { status: 401 });
  }
}
