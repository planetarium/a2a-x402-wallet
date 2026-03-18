import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { Task, MessageSendParams } from '@a2a-js/sdk';
import { a2aDeviceStore } from '@/lib/a2a-device-store';
import { X402Facilitator, type PaymentPayload } from '@a2a-x402-wallet/x402';
import {
  getBaseFeePaymentRequirements,
  makePaymentRequiredTask,
  makePaymentCompletedTask,
  makePaymentFailedTask,
} from '@/lib/x402-payment';

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

  const rpcId = body.id ?? null;

  // -------------------------------------------------------------------------
  // message/send — primary A2A method, implements x402 Standalone Flow
  // -------------------------------------------------------------------------
  if (body.method === 'message/send') {
    const params = body.params as MessageSendParams | undefined;
    const msg = params?.message;
    const paymentStatus = msg?.metadata?.['x402.payment.status'] as string | undefined;

    // --- Step 3: Client submits signed PaymentPayload ---
    if (paymentStatus === 'payment-submitted') {
      const taskId  = msg?.taskId ?? randomUUID();
      const payload = msg?.metadata?.['x402.payment.payload'] as PaymentPayload | undefined;

      if (!payload) {
        return NextResponse.json({
          jsonrpc: '2.0', id: rpcId,
          result: makePaymentFailedTask(taskId, 'Missing x402.payment.payload in metadata', 'INVALID_SIGNATURE', 'unknown'),
        });
      }

      const { to } = payload.payload.authorization;
      const requirements = getBaseFeePaymentRequirements();
      const candidates = requirements.filter(r =>
        r.network === payload.network &&
        r.maxAmountRequired === payload.payload.authorization.value &&
        r.payTo.toLowerCase() === to.toLowerCase()
      );

      if (candidates.length === 0) {
        return NextResponse.json({
          jsonrpc: '2.0', id: rpcId,
          result: makePaymentFailedTask(
            taskId,
            `No matching payment requirement for network=${payload.network}, value=${payload.payload.authorization.value.toString()}, to=${to}`,
            'INVALID_SIGNATURE',
            payload.network,
          ),
        });
      }

      const facilitator = new X402Facilitator(
        process.env.X402_FACILITATOR_URL ?? 'https://x402.org/facilitator',
      );

      let matchedReq = candidates[0];
      let verifyResult = await facilitator.verify(payload, matchedReq);
      for (let i = 1; !verifyResult.valid && i < candidates.length; i++) {
        matchedReq = candidates[i];
        verifyResult = await facilitator.verify(payload, matchedReq);
      }

      if (!verifyResult.valid) {
        return NextResponse.json({
          jsonrpc: '2.0', id: rpcId,
          result: makePaymentFailedTask(taskId, verifyResult.reason ?? 'Verification failed', 'VERIFICATION_FAILED', payload.network),
        });
      }

      const settleResult = await facilitator.settle(payload, matchedReq);
      if (!settleResult.success) {
        return NextResponse.json({
          jsonrpc: '2.0', id: rpcId,
          result: makePaymentFailedTask(taskId, settleResult.errorReason ?? 'Settlement failed', 'SETTLEMENT_FAILED', payload.network),
        });
      }

      return NextResponse.json({
        jsonrpc: '2.0', id: rpcId,
        result: makePaymentCompletedTask(taskId, matchedReq.network, settleResult.transaction),
      });
    }

    // --- Client explicitly rejects payment ---
    if (paymentStatus === 'payment-rejected') {
      const taskId = msg?.taskId ?? randomUUID();
      const task: Task = {
        kind:      'task',
        id:        taskId,
        contextId: taskId,
        status: {
          state:   'canceled',
          message: {
            kind:      'message',
            messageId: randomUUID(),
            role:      'agent',
            parts:     [{ kind: 'text', text: 'Payment rejected by client. Task canceled.' }],
            metadata:  { 'x402.payment.status': 'payment-rejected' },
          },
          timestamp: new Date().toISOString(),
        },
      };
      return NextResponse.json({ jsonrpc: '2.0', id: rpcId, result: task });
    }

    // --- Step 1: New service request — require payment if configured ---
    const requirements = getBaseFeePaymentRequirements();
    const taskId = randomUUID();

    if (requirements.length > 0) {
      return NextResponse.json({
        jsonrpc: '2.0', id: rpcId,
        result: makePaymentRequiredTask(taskId, requirements),
      });
    }

    // No payment configured — echo response (development fallback)
    const parts = msg?.parts ?? [];
    const text  = parts.map((p) => p.kind === 'text' ? p.text : '').join(' ').trim() || '(empty)';
    const task: Task = {
      kind:      'task',
      id:        taskId,
      contextId: taskId,
      status: {
        state:   'completed',
        message: {
          kind:      'message',
          messageId: randomUUID(),
          role:      'agent',
          parts:     [{ kind: 'text', text: `Echo: ${text}` }],
        },
        timestamp: new Date().toISOString(),
      },
    };
    return NextResponse.json({ jsonrpc: '2.0', id: rpcId, result: task });
  }

  // -------------------------------------------------------------------------
  // tasks/get — stub: no persistent task store, return unknown state
  // -------------------------------------------------------------------------
  if (body.method === 'tasks/get') {
    const taskId = (body.params?.id as string | undefined) ?? 'unknown';
    const task: Task = {
      kind:      'task',
      id:        taskId,
      contextId: taskId,
      status:    { state: 'unknown', timestamp: new Date().toISOString() },
    };
    return NextResponse.json({ jsonrpc: '2.0', id: rpcId, result: task });
  }

  // -------------------------------------------------------------------------
  // tasks/cancel
  // -------------------------------------------------------------------------
  if (body.method === 'tasks/cancel') {
    const taskId = (body.params?.id as string | undefined) ?? 'unknown';
    const task: Task = {
      kind:      'task',
      id:        taskId,
      contextId: taskId,
      status: {
        state:   'canceled',
        message: {
          kind:      'message',
          messageId: randomUUID(),
          role:      'agent',
          parts:     [{ kind: 'text', text: 'Task canceled.' }],
        },
        timestamp: new Date().toISOString(),
      },
    };
    return NextResponse.json({ jsonrpc: '2.0', id: rpcId, result: task });
  }

  return NextResponse.json({
    jsonrpc: '2.0',
    id:      rpcId,
    error:   { code: -32601, message: 'Method not found' },
  });
}
