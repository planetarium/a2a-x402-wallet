import { NextRequest, NextResponse } from 'next/server';
import { privy } from '@/lib/privy';
import { signJwt } from '@/lib/jwt';
import { deviceStore } from '@/lib/device-store';
import { completeLimiter, getClientIp, tooManyRequests } from '@/lib/rate-limit';
import type { WalletWithMetadata } from '@privy-io/server-auth';

export async function POST(req: NextRequest) {
  const { allowed, resetAt } = completeLimiter.check(getClientIp(req));
  if (!allowed) return tooManyRequests(resetAt);

  // Restrict to same-origin requests only — prevents a malicious third party
  // from completing a device session on behalf of an unsuspecting user.
  const origin = req.headers.get('origin');
  const expectedOrigin = process.env.NEXT_PUBLIC_APP_URL ?? `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  if (!origin || origin !== expectedOrigin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { nonce, privyToken } = await req.json() as { nonce?: string; privyToken?: string };

  if (!nonce || !privyToken) {
    return NextResponse.json({ error: 'Missing nonce or privyToken' }, { status: 400 });
  }

  const entry = deviceStore.get(nonce);
  if (!entry) {
    return NextResponse.json({ error: 'Expired or invalid nonce' }, { status: 404 });
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

    const token = await signJwt(claims.userId, embeddedWallet.id);
    const ok = deviceStore.complete(nonce, token);
    if (!ok) {
      return NextResponse.json({ error: 'Nonce expired during token exchange' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid Privy token' }, { status: 401 });
  }
}
