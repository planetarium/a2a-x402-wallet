import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import type { WalletWithMetadata } from '@privy-io/server-auth';
import { privy } from '@/lib/privy';
import { faucetLimiter, tooManyRequests } from '@/lib/rate-limit';
import {
  buildTransferWithAuthorizationTypedData,
  generateNonce,
  type PaymentPayload,
  type TransferWithAuthorizationPayload,
} from '@a2a-x402-wallet/x402';

// ── constants ────────────────────────────────────────────────────────────────

const NETWORK = 'base-sepolia';
const CHAIN = baseSepolia;
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;
const USDC_DECIMALS = 6;
const USDC_EIP712 = { name: 'USDC', version: '2' };
const CHAIN_ID = 84532;
const FACILITATOR_URL = 'https://x402.org/facilitator';

const FAUCET_AMOUNT = '1000000';           // 1 USDC
const FAUCET_THRESHOLD = BigInt(100_000);  // 0.1 USDC — gate condition
const VALID_FOR_SECONDS = 300;             // 5 min signature window

// ── env ──────────────────────────────────────────────────────────────────────

const ADMIN_WALLET_ID = process.env.FAUCET_ADMIN_WALLET_ID;
const ADMIN_ADDRESS   = process.env.FAUCET_ADMIN_ADDRESS as `0x${string}` | undefined;

// ── helpers ──────────────────────────────────────────────────────────────────

const publicClient = createPublicClient({ chain: CHAIN, transport: http() });

const ERC20_BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

async function getUsdcBalance(address: `0x${string}`): Promise<bigint> {
  return publicClient.readContract({
    address: USDC_ADDRESS,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: [address],
  });
}

async function settlePayment(
  payload: PaymentPayload,
  requirements: object,
): Promise<{ transaction: string; network: string; payer?: string }> {
  const res = await fetch(`${FACILITATOR_URL}/settle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      x402Version: 1,
      paymentPayload: payload,
      paymentRequirements: requirements,
    }),
  });

  const data = (await res.json()) as {
    success: boolean;
    transaction: string;
    network: string;
    payer?: string;
    errorReason?: string;
    errorMessage?: string;
  };

  if (!res.ok || !data.success) {
    const reason = data.errorReason ?? `http_${res.status}`;
    const detail = data.errorMessage ? `: ${data.errorMessage}` : '';
    throw new Error(`Facilitator settle failed — ${reason}${detail}`);
  }

  return { transaction: data.transaction, network: data.network, payer: data.payer };
}

// ── route ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/faucet
 *
 * Sends 1 USDC (1 000 000 units) from the admin wallet to the authenticated
 * user's wallet on Base Sepolia, using the x402 facilitator.
 *
 * Conditions:
 *   - Authorization: Bearer <privy-access-token>
 *   - User's USDC balance must be < 0.1 USDC
 *   - Rate limited: 3 requests per user per hour
 *
 * Required env vars:
 *   FAUCET_ADMIN_WALLET_ID  — Privy wallet ID of the admin wallet
 *   FAUCET_ADMIN_ADDRESS    — Ethereum address of the admin wallet (0x...)
 */
export async function POST(req: NextRequest) {
  // ── env check ──────────────────────────────────────────────────────────────
  if (!ADMIN_WALLET_ID || !ADMIN_ADDRESS) {
    console.error('[faucet] FAUCET_ADMIN_WALLET_ID or FAUCET_ADMIN_ADDRESS is not set');
    return NextResponse.json({ error: 'Faucet not configured' }, { status: 503 });
  }

  // ── auth ───────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  const privyToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!privyToken) {
    return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
  }

  let userId: string;
  let userAddress: `0x${string}`;
  try {
    const claims = await privy.verifyAuthToken(privyToken);
    userId = claims.userId;

    const user = await privy.getUser(userId);
    const wallet = user.linkedAccounts.find(
      (a): a is WalletWithMetadata =>
        a.type === 'wallet' && typeof (a as WalletWithMetadata).address === 'string',
    ) as WalletWithMetadata | undefined;

    if (!wallet?.address) {
      return NextResponse.json({ error: 'No wallet found for this account' }, { status: 400 });
    }
    userAddress = wallet.address as `0x${string}`;
  } catch {
    return NextResponse.json({ error: 'Invalid Privy token' }, { status: 401 });
  }

  // ── rate limit ─────────────────────────────────────────────────────────────
  const { allowed, resetAt } = faucetLimiter.check(userId);
  if (!allowed) return tooManyRequests(resetAt);

  // ── balance gate ───────────────────────────────────────────────────────────
  let balance: bigint;
  try {
    balance = await getUsdcBalance(userAddress);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to check balance: ${msg}` }, { status: 500 });
  }

  if (balance >= FAUCET_THRESHOLD) {
    return NextResponse.json(
      {
        error: 'Faucet unavailable: your USDC balance is sufficient',
        balance: formatUnits(balance, USDC_DECIMALS),
        threshold: formatUnits(FAUCET_THRESHOLD, USDC_DECIMALS),
      },
      { status: 422 },
    );
  }

  // ── sign ───────────────────────────────────────────────────────────────────
  const now = Math.floor(Date.now() / 1000);
  const authorization: TransferWithAuthorizationPayload = {
    from: ADMIN_ADDRESS,
    to: userAddress,
    value: FAUCET_AMOUNT,
    validAfter: String(now - 60),
    validBefore: String(now + VALID_FOR_SECONDS),
    nonce: generateNonce(),
  };

  const typedData = buildTransferWithAuthorizationTypedData(
    USDC_ADDRESS,
    CHAIN_ID,
    USDC_EIP712.name,
    USDC_EIP712.version,
    authorization,
  );

  let paymentPayload: PaymentPayload;
  try {
    const { signature } = await privy.walletApi.ethereum.signTypedData({
      walletId: ADMIN_WALLET_ID,
      typedData,
    });

    paymentPayload = {
      x402Version: 1,
      scheme: 'exact',
      network: NETWORK,
      payload: {
        signature: signature as `0x${string}`,
        authorization,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[faucet] Signing failed:', msg);
    return NextResponse.json({ error: `Signing failed: ${msg}` }, { status: 500 });
  }

  // ── settle ─────────────────────────────────────────────────────────────────
  const requirements = {
    scheme: 'exact',
    network: NETWORK,
    asset: USDC_ADDRESS,
    payTo: userAddress,
    maxAmountRequired: FAUCET_AMOUNT,
    maxTimeoutSeconds: VALID_FOR_SECONDS,
    extra: USDC_EIP712,
  };

  try {
    const settled = await settlePayment(paymentPayload, requirements);
    return NextResponse.json({
      success: true,
      transaction: settled.transaction,
      network: settled.network,
      payer: settled.payer,
      recipient: userAddress,
      amount: formatUnits(BigInt(FAUCET_AMOUNT), USDC_DECIMALS),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[faucet] Settle failed:', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
