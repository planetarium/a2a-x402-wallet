import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { a2aDeviceStore } from '@/lib/a2a-device-store';
import { x402Store } from '@/lib/x402-store';
import {
  NETWORKS,
  type NetworkName,
  type PaymentPayload,
  type PaymentRequirements,
} from '@a2a-x402-wallet/x402';

// ---------------------------------------------------------------------------
// Facilitator — direct HTTP calls (no @x402/core library)
// ---------------------------------------------------------------------------
const FACILITATOR_URL = process.env.X402_FACILITATOR_URL ?? 'https://x402.org/facilitator';

async function verifyPayment(
  payload: PaymentPayload,
  requirements: PaymentRequirements,
): Promise<{ valid: boolean; reason?: string; payer?: string }> {
  let response: Response;
  try {
    response = await fetch(`${FACILITATOR_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x402Version: 1, paymentPayload: payload, paymentRequirements: requirements }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, reason: `facilitator_unreachable: ${msg}` };
  }

  const data = await response.json() as {
    isValid: boolean;
    invalidReason?: string;
    payer?: string;
  };

  if (!response.ok) return { valid: false, reason: data.invalidReason ?? `http_${response.status}` };
  return { valid: data.isValid, reason: data.invalidReason, payer: data.payer };
}

async function settlePayment(
  payload: PaymentPayload,
  requirements: PaymentRequirements,
): Promise<{ success: boolean; transaction: string; network: string; payer?: string; errorReason?: string }> {
  let response: Response;
  try {
    response = await fetch(`${FACILITATOR_URL}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x402Version: 1, paymentPayload: payload, paymentRequirements: requirements }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, transaction: '', network: requirements.network, errorReason: `facilitator_unreachable: ${msg}` };
  }

  const data = await response.json() as {
    success: boolean;
    transaction: string;
    network: string;
    payer?: string;
    errorReason?: string;
  };

  if (!response.ok || !data.success) {
    return { success: false, transaction: data.transaction ?? '', network: data.network ?? requirements.network, payer: data.payer, errorReason: data.errorReason ?? `http_${response.status}` };
  }
  return { success: true, transaction: data.transaction, network: data.network, payer: data.payer };
}

// ---------------------------------------------------------------------------
// Helpers to build x402-compliant task responses
// ---------------------------------------------------------------------------

function makePaymentRequiredTask(taskId: string, requirements: PaymentRequirements[]) {
  return {
    kind:   'task',
    id:     taskId,
    status: {
      state:   'input-required',
      message: {
        kind:  'message',
        role:  'agent',
        parts: [{ kind: 'text', text: 'Payment is required to use this service.' }],
        metadata: {
          'x402.payment.status':   'payment-required',
          'x402.payment.required': {
            x402Version: 1,
            accepts:     requirements,
          },
        },
      },
      timestamp: new Date().toISOString(),
    },
  };
}

function makePaymentCompletedTask(taskId: string, network: string, transaction: string) {
  return {
    kind:   'task',
    id:     taskId,
    status: {
      state:   'completed',
      message: {
        kind:  'message',
        role:  'agent',
        parts: [{ kind: 'text', text: 'Payment received. Service request completed.' }],
        metadata: {
          'x402.payment.status':   'payment-completed',
          'x402.payment.receipts': [
            {
              success: true,
              transaction,
              network,
            },
          ],
        },
      },
      timestamp: new Date().toISOString(),
    },
    artifacts: [
      {
        artifactId: randomUUID(),
        name:       'result',
        parts:      [{ kind: 'text', text: 'Echo: payment accepted.' }],
      },
    ],
  };
}

function makePaymentFailedTask(taskId: string, reason: string, errorCode: string, network: string) {
  return {
    kind:   'task',
    id:     taskId,
    status: {
      state:   'failed',
      message: {
        kind:  'message',
        role:  'agent',
        parts: [{ kind: 'text', text: `Payment failed: ${reason}` }],
        metadata: {
          'x402.payment.status': 'payment-failed',
          'x402.payment.error':  errorCode,
          'x402.payment.receipts': [
            {
              success:     false,
              errorReason: reason,
              network,
              transaction: '',
            },
          ],
        },
      },
      timestamp: new Date().toISOString(),
    },
  };
}

// ---------------------------------------------------------------------------
// Payment requirements — DB first, env vars as fallback
// ---------------------------------------------------------------------------

/**
 * Returns the list of accepted payment options.
 *
 * Priority:
 *   1. DB active config (x402_accepts_configs where is_active = true)
 *   2. A2A_X402_ACCEPTS — JSON array of PaymentRequirements (multi-option env var)
 *   3. Legacy single-option env vars (A2A_X402_PAY_TO, A2A_X402_NETWORK, etc.)
 *
 * Returns null if no payment config is set (dev/echo mode).
 */
async function getAcceptedPaymentOptions(): Promise<PaymentRequirements[] | null> {
  // 1. DB: active config
  const dbAccepts = await x402Store.getActiveAccepts();
  if (dbAccepts) return dbAccepts;

  // 2. Multi-option env var: A2A_X402_ACCEPTS as a JSON array
  const acceptsEnv = process.env.A2A_X402_ACCEPTS;
  if (acceptsEnv) {
    try {
      const parsed = JSON.parse(acceptsEnv) as PaymentRequirements[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      console.error('[a2a] Invalid A2A_X402_ACCEPTS JSON, falling back to legacy env vars');
    }
  }

  // 3. Legacy single-option env vars
  const payTo = process.env.A2A_X402_PAY_TO as `0x${string}` | undefined;
  if (!payTo) return null;

  const network    = (process.env.A2A_X402_NETWORK ?? 'base-sepolia') as NetworkName;
  const networkCfg = NETWORKS[network];
  const asset      = (process.env.A2A_X402_ASSET ?? networkCfg?.usdcAddress) as `0x${string}`;
  const maxAmount  = process.env.A2A_X402_MAX_AMOUNT ?? '1000'; // 0.001 USDC

  return [{
    scheme:            'exact',
    network,
    asset,
    payTo,
    maxAmountRequired: maxAmount,
    extra: {
      name:    networkCfg?.usdcEip712.name    ?? 'USDC',
      version: networkCfg?.usdcEip712.version ?? '2',
    },
  }];
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!apiKey) {
    return NextResponse.json({ error: 'invalid_api_key' }, { status: 401 });
  }

  const valid = await a2aDeviceStore.validateApiKey(apiKey);
  if (!valid) {
    return NextResponse.json({ error: 'invalid_api_key' }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as {
    jsonrpc?: string;
    method?: string;
    id?: unknown;
    params?: Record<string, unknown>;
  } | null;

  if (!body?.jsonrpc || !body?.method) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  // Evict stale tasks in the background (non-blocking)
  x402Store.evictStaleTasks().catch((err) =>
    console.error('[a2a] evictStaleTasks error:', err),
  );

  const rpcId = body.id ?? null;

  // -------------------------------------------------------------------------
  // message/send — primary A2A method, implements x402 Standalone Flow
  // -------------------------------------------------------------------------
  if (body.method === 'message/send') {
    const params = body.params ?? {};
    const msg = params.message as {
      taskId?:   string;
      parts?:    { kind?: string; text?: string }[];
      metadata?: Record<string, unknown>;
    } | undefined;

    const paymentStatus = msg?.metadata?.['x402.payment.status'] as string | undefined;

    // --- Step 3: Client submits signed PaymentPayload ---
    if (paymentStatus === 'payment-submitted') {
      const taskId  = msg?.taskId ?? '';
      const payload = msg?.metadata?.['x402.payment.payload'] as PaymentPayload | undefined;

      const pendingRequirements = taskId ? await x402Store.getPendingTask(taskId) : undefined;

      if (!payload) {
        const network = pendingRequirements?.[0]?.network ?? 'base-sepolia';
        return NextResponse.json({
          jsonrpc: '2.0', id: rpcId,
          result: makePaymentFailedTask(taskId, 'Missing x402.payment.payload in metadata', 'INVALID_SIGNATURE', network),
        });
      }

      if (!pendingRequirements) {
        const network = payload.network ?? 'base-sepolia';
        return NextResponse.json({
          jsonrpc: '2.0', id: rpcId,
          result: makePaymentFailedTask(taskId, 'Unknown or expired task', 'EXPIRED_PAYMENT', network),
        });
      }

      // Match submitted payload to the corresponding PaymentRequirements by network + scheme
      const req0 =
        pendingRequirements.find(
          r => r.network === payload.network && r.scheme === payload.scheme,
        ) ?? pendingRequirements[0];
      const network = req0.network;

      // Verify: signature, amount, recipient, time window (via official facilitator)
      const verifyResult = await verifyPayment(payload, req0);
      if (!verifyResult.valid) {
        return NextResponse.json({
          jsonrpc: '2.0', id: rpcId,
          result: makePaymentFailedTask(
            taskId,
            verifyResult.reason ?? 'Verification failed',
            verifyResult.reason ?? 'unexpected_verify_error',
            network,
          ),
        });
      }

      // Settle: submit on-chain transferWithAuthorization, wait for receipt
      const settleResult = await settlePayment(payload, req0);
      if (!settleResult.success) {
        return NextResponse.json({
          jsonrpc: '2.0', id: rpcId,
          result: makePaymentFailedTask(
            taskId,
            settleResult.errorReason ?? 'Settlement failed',
            settleResult.errorReason ?? 'unexpected_settle_error',
            network,
          ),
        });
      }

      await x402Store.deletePendingTask(taskId);

      return NextResponse.json({
        jsonrpc: '2.0', id: rpcId,
        result: makePaymentCompletedTask(taskId, network, settleResult.transaction),
      });
    }

    // --- Client explicitly rejects payment ---
    if (paymentStatus === 'payment-rejected') {
      const taskId = msg?.taskId ?? randomUUID();
      await x402Store.deletePendingTask(taskId);

      return NextResponse.json({
        jsonrpc: '2.0', id: rpcId,
        result: {
          kind:   'task',
          id:     taskId,
          status: {
            state:   'canceled',
            message: {
              kind:  'message',
              role:  'agent',
              parts: [{ kind: 'text', text: 'Payment rejected by client. Task canceled.' }],
              metadata: { 'x402.payment.status': 'payment-rejected' },
            },
            timestamp: new Date().toISOString(),
          },
        },
      });
    }

    // --- Step 1: New service request — require payment if configured ---
    const requirements = await getAcceptedPaymentOptions();
    const taskId = randomUUID();

    if (requirements) {
      await x402Store.setPendingTask(taskId, requirements);

      return NextResponse.json({
        jsonrpc: '2.0', id: rpcId,
        result: makePaymentRequiredTask(taskId, requirements),
      });
    }

    // No payment configured — echo response (development fallback)
    const parts = msg?.parts ?? [];
    const text  = parts.map((p) => p.text ?? '').join(' ').trim() || '(empty)';
    return NextResponse.json({
      jsonrpc: '2.0', id: rpcId,
      result: {
        kind:   'task',
        id:     taskId,
        status: {
          state:   'completed',
          message: {
            kind:  'message',
            role:  'agent',
            parts: [{ kind: 'text', text: `Echo: ${text}` }],
          },
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  // -------------------------------------------------------------------------
  // tasks/get
  // -------------------------------------------------------------------------
  if (body.method === 'tasks/get') {
    const taskId = (body.params?.id as string | undefined) ?? 'unknown';
    const pendingRequirements = await x402Store.getPendingTask(taskId);

    if (pendingRequirements) {
      return NextResponse.json({
        jsonrpc: '2.0', id: rpcId,
        result: makePaymentRequiredTask(taskId, pendingRequirements),
      });
    }

    return NextResponse.json({
      jsonrpc: '2.0', id: rpcId,
      error: { code: -32001, message: 'Task not found' },
    });
  }

  // -------------------------------------------------------------------------
  // tasks/cancel
  // -------------------------------------------------------------------------
  if (body.method === 'tasks/cancel') {
    const taskId = (body.params?.id as string | undefined) ?? 'unknown';
    await x402Store.deletePendingTask(taskId);

    return NextResponse.json({
      jsonrpc: '2.0', id: rpcId,
      result: {
        kind:   'task',
        id:     taskId,
        status: { state: 'canceled', timestamp: new Date().toISOString() },
      },
    });
  }

  return NextResponse.json({
    jsonrpc: '2.0',
    id:      rpcId,
    error:   { code: -32601, message: 'Method not found' },
  });
}
