import { randomUUID } from 'crypto';
import type { Task } from '@a2a-js/sdk';
import { NETWORKS, type NetworkName, type PaymentRequirements } from '@a2a-x402-wallet/x402';

// ---------------------------------------------------------------------------
// Payment requirements from environment
// ---------------------------------------------------------------------------

interface AcceptsEntry {
  network:   string;
  asset:     string;
  maxAmount: string;
}

export function getBaseFeePaymentRequirements(): PaymentRequirements[] {
  const payTo = process.env.A2A_X402_PAY_TO as `0x${string}` | undefined;
  if (!payTo) return [];

  const acceptsRaw = process.env.A2A_X402_ACCEPTS;
  if (!acceptsRaw) return [];

  let entries: AcceptsEntry[];
  try {
    entries = JSON.parse(acceptsRaw) as AcceptsEntry[];
  } catch {
    console.error('[x402] Failed to parse A2A_X402_ACCEPTS JSON:', acceptsRaw);
    return [];
  }

  return entries.map((entry) => {
    const network    = entry.network as NetworkName;
    const networkCfg = NETWORKS[network];
    return {
      scheme: 'exact',
      network,
      maxAmountRequired: entry.maxAmount,
      asset: entry.asset as `0x${string}`,
      payTo,
      resource: 'baseFee',
      mimeType: 'application/json',
      maxTimeoutSeconds: 0,
      extra: {
        name:    networkCfg?.usdcEip712.name    ?? 'USDC',
        version: networkCfg?.usdcEip712.version ?? '2',
      },
    } satisfies PaymentRequirements;
  });
}

// ---------------------------------------------------------------------------
// A2A task response builders (x402 metadata convention)
// ---------------------------------------------------------------------------

export function makePaymentRequiredTask(taskId: string, requirements: PaymentRequirements[]): Task {
  return {
    kind:      'task',
    id:        taskId,
    contextId: taskId,
    status: {
      state:   'input-required',
      message: {
        kind:      'message',
        messageId: randomUUID(),
        role:      'agent',
        parts:     [{ kind: 'text', text: 'Payment is required to use this service.' }],
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

export function makePaymentCompletedTask(taskId: string, network: string, transaction: string): Task {
  return {
    kind:      'task',
    id:        taskId,
    contextId: taskId,
    status: {
      state:   'completed',
      message: {
        kind:      'message',
        messageId: randomUUID(),
        role:      'agent',
        parts:     [{ kind: 'text', text: 'Payment received. Service request completed.' }],
        metadata: {
          'x402.payment.status':   'payment-completed',
          'x402.payment.receipts': [{ success: true, transaction, network }],
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

export function makePaymentFailedTask(taskId: string, reason: string, errorCode: string, network: string): Task {
  return {
    kind:      'task',
    id:        taskId,
    contextId: taskId,
    status: {
      state:   'failed',
      message: {
        kind:      'message',
        messageId: randomUUID(),
        role:      'agent',
        parts:     [{ kind: 'text', text: `Payment failed: ${reason}` }],
        metadata: {
          'x402.payment.status': 'payment-failed',
          'x402.payment.error':  errorCode,
          'x402.payment.receipts': [{ success: false, errorReason: reason, network, transaction: '' }],
        },
      },
      timestamp: new Date().toISOString(),
    },
  };
}
