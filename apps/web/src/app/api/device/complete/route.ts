// RFC 8628 browser-side completion — called by /device-auth after the user
// authenticates with Privy and delegates their embedded wallet.
// POST /api/device/complete
//
// Body: { userCode: string, privyToken: string }
// Same-origin only to prevent CSRF abuse.

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { privy } from '@/lib/privy';
import { signJwt } from '@/lib/jwt';
import { db } from '@/lib/db';
import { userSettings } from '@/lib/schema';
import { cliDeviceStore } from '@/lib/cli-device-store';
import { cliV2CompleteLimiter, getClientIp, tooManyRequests } from '@/lib/rate-limit';
import type { WalletWithMetadata } from '@privy-io/server-auth';

export async function POST(req: NextRequest) {
  const { allowed, resetAt } = cliV2CompleteLimiter.check(getClientIp(req));
  if (!allowed) return tooManyRequests(resetAt);

  // Same-origin guard — prevents a malicious third party from completing a session.
  const origin         = req.headers.get('origin');
  const proto          = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(/:$/, '');
  const host           = req.headers.get('x-forwarded-host') ?? req.nextUrl.host;
  const expectedOrigin = `${proto}://${host}`;
  if (!origin || origin !== expectedOrigin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userCode, privyToken } = await req.json() as { userCode?: string; privyToken?: string };

  if (!userCode || !privyToken) {
    return NextResponse.json({ error: 'Missing userCode or privyToken' }, { status: 400 });
  }

  const entry = await cliDeviceStore.getByUserCode(userCode);
  if (!entry) {
    return NextResponse.json({ error: 'Expired or invalid user code' }, { status: 404 });
  }

  try {
    const claims = await privy.verifyAuthToken(privyToken);
    const user   = await privy.getUser(claims.userId);

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

    const settingRows = await db
      .select({ jwtExpiresIn: userSettings.jwtExpiresIn })
      .from(userSettings)
      .where(eq(userSettings.userId, claims.userId))
      .limit(1);
    const jwtExpiresIn = settingRows[0]?.jwtExpiresIn ?? undefined;

    const token = await signJwt(claims.userId, embeddedWallet.id, jwtExpiresIn);
    const ok    = await cliDeviceStore.complete(userCode, token);
    if (!ok) {
      return NextResponse.json({ error: 'User code expired during token exchange' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid Privy token' }, { status: 401 });
  }
}
