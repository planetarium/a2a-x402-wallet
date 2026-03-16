import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits, isAddress } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privy } from '@/lib/privy';
import { faucetLimiter, tooManyRequests } from '@/lib/rate-limit';
import {
  NETWORKS,
  USDC_DECIMALS,
  buildTransferWithAuthorizationTypedData,
  generateNonce,
  type PaymentPayload,
  type TransferWithAuthorizationPayload,
} from '@a2a-x402-wallet/x402';

// ── constants ────────────────────────────────────────────────────────────────

const NETWORK = 'base-sepolia';
const CHAIN = baseSepolia;
const { usdcAddress: USDC_ADDRESS, chainId: CHAIN_ID, usdcEip712: USDC_EIP712 } = NETWORKS[NETWORK];
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
 * Sends 1 USDC (1 000 000 units) from the admin wallet to the given address
 * on Base Sepolia, using the x402 facilitator. No authentication required.
 *
 * Request body:
 *   { "address": "0x..." }
 *
 * Conditions:
 *   - address must be a valid Ethereum address
 *   - address USDC balance must be < 0.1 USDC
 *   - Rate limited: 3 requests per address per hour
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

  // ── parse body ─────────────────────────────────────────────────────────────
  let userAddress: `0x${string}`;
  try {
    const body = await req.json();
    if (!body?.address || !isAddress(body.address)) {
      return NextResponse.json({ error: 'Valid Ethereum address required' }, { status: 400 });
    }
    userAddress = body.address as `0x${string}`;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // ── rate limit ─────────────────────────────────────────────────────────────
  const { allowed, resetAt } = faucetLimiter.check(userAddress.toLowerCase());
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
