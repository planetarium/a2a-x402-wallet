import type { PaymentRequirements } from '@a2a-x402-wallet/x402';

export interface X402PaymentInfo {
  taskId: string;
  contextId?: string;
  requirements: PaymentRequirements;
}

/**
 * Checks if an A2A event is an x402 Standalone Flow payment-required task.
 * Handles both 'task' and 'status-update' event kinds.
 * Returns payment info if payment is required, null otherwise.
 */
export function getX402PaymentInfo(event: unknown): X402PaymentInfo | null {
  if (!event || typeof event !== 'object') return null;
  const e = event as Record<string, unknown>;

  let taskId: string | undefined;
  let contextId: string | undefined;
  let status: Record<string, unknown> | undefined;

  if (e['kind'] === 'task') {
    taskId = e['id'] as string;
    contextId = e['contextId'] as string | undefined;
    status = e['status'] as Record<string, unknown> | undefined;
  } else if (e['kind'] === 'status-update') {
    taskId = e['taskId'] as string;
    contextId = e['contextId'] as string | undefined;
    status = e['status'] as Record<string, unknown> | undefined;
  } else {
    return null;
  }

  if (!taskId || !status || status['state'] !== 'input-required') return null;

  const message = status['message'] as Record<string, unknown> | undefined;
  const metadata = message?.['metadata'] as Record<string, unknown> | undefined;
  if (!metadata || metadata['x402.payment.status'] !== 'payment-required') return null;

  const required = metadata['x402.payment.required'] as { x402Version?: number; accepts?: PaymentRequirements[] } | undefined;
  if (!required?.accepts?.length) return null;

  return { taskId, contextId, requirements: required.accepts[0]! };
}
