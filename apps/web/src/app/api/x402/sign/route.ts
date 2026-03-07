import { NextRequest, NextResponse } from 'next/server';
import { privy } from '@/lib/privy';
import { verifyJwt } from '@/lib/jwt';
import type { WalletWithMetadata } from '@privy-io/server-auth';
import {
  buildTransferWithAuthorizationTypedData,
  generateNonce,
  getChainId,
  getTokenMetadata,
  type PaymentPayload,
  type PaymentRequirements,
  type TransferWithAuthorizationPayload,
} from '@a2a-x402-wallet/x402';
import { signLimiter, tooManyRequests } from '@/lib/rate-limit';

/**
 * POST /api/x402/sign
 *
 * Creates a signed x402 PaymentPayload from a PaymentRequirements object.
 * Supports the "exact" scheme using ERC-3009 TransferWithAuthorization (EIP-712).
 *
 * Authorization: Bearer <jwt_token>   (obtained from /api/auth/token)
 *
 * Request body:
 * {
 *   "paymentRequirements": {
 *     "scheme": "exact",
 *     "network": "base",
 *     "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913",
 *     "payTo": "0xMerchantAddress",
 *     "maxAmountRequired": "120000000"
 *   },
 *   "validForSeconds": 3600   // optional, defaults to 3600
 * }
 *
 * Response: PaymentPayload object ready to submit to Merchant Agent
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
  }

  let userId: string;
  let walletId: string;
  try {
    const payload = await verifyJwt(token);
    userId = payload.sub;
    walletId = payload.walletId;
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const { allowed, resetAt } = signLimiter.check(userId);
  if (!allowed) return tooManyRequests(resetAt);

  const body = await req.json() as {
    paymentRequirements?: PaymentRequirements;
    validForSeconds?: number;
  };

  const { paymentRequirements, validForSeconds = 3600 } = body;

  if (!paymentRequirements) {
    return NextResponse.json({ error: 'paymentRequirements is required' }, { status: 400 });
  }

  const { scheme, network, asset, payTo, maxAmountRequired } = paymentRequirements;

  if (!scheme || !network || !asset || !payTo || !maxAmountRequired) {
    return NextResponse.json(
      { error: 'paymentRequirements must include scheme, network, asset, payTo, maxAmountRequired' },
      { status: 400 },
    );
  }

  if (scheme !== 'exact') {
    return NextResponse.json({ error: `Unsupported scheme: ${scheme}. Only "exact" is supported.` }, { status: 400 });
  }

  let chainId: number;
  try {
    chainId = getChainId(network);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }

  // Resolve payer wallet address from Privy
  let fromAddress: `0x${string}`;
  try {
    const user = await privy.getUser(userId);
    const wallet = user.linkedAccounts.find(
      (a): a is WalletWithMetadata => a.type === 'wallet' && a.id === walletId,
    );
    if (!wallet?.address) {
      return NextResponse.json({ error: 'Could not resolve wallet address' }, { status: 400 });
    }
    fromAddress = wallet.address as `0x${string}`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to resolve wallet: ${msg}` }, { status: 500 });
  }

  // Build ERC-3009 authorization object
  const now = Math.floor(Date.now() / 1000);
  const authorization: TransferWithAuthorizationPayload = {
    from: fromAddress,
    to: payTo,
    value: maxAmountRequired,
    validAfter: '0',
    validBefore: String(now + validForSeconds),
    nonce: generateNonce(),
  };

  let tokenMeta: { name: string; version: string };
  try {
    tokenMeta = getTokenMetadata(asset);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }

  const typedData = buildTransferWithAuthorizationTypedData(
    asset,
    chainId,
    tokenMeta.name,
    tokenMeta.version,
    authorization,
  );

  try {
    const { signature } = await privy.walletApi.ethereum.signTypedData({
      walletId,
      typedData,
    });

    const paymentPayload: PaymentPayload = {
      x402Version: 1,
      scheme: 'exact',
      network,
      payload: {
        signature: signature as `0x${string}`,
        authorization,
      },
    };

    return NextResponse.json(paymentPayload);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[/api/x402/sign]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
