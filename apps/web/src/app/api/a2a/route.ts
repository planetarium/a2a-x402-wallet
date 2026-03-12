import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { a2aDeviceStore } from '@/lib/a2a-device-store';

function makeTask(taskId: string, message: string) {
  return {
    id: taskId,
    status: {
      state: 'completed',
      message: {
        role: 'agent',
        parts: [{ type: 'text', text: `Echo: ${message}` }],
      },
      timestamp: new Date().toISOString(),
    },
    metadata: {},
  };
}

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

  if (body.method === 'message/send') {
    const params = body.params ?? {};
    const msg = params.message as { taskId?: string; contextId?: string; parts?: { text?: string }[] } | undefined;
    const taskId = msg?.taskId ?? randomUUID();
    const parts = msg?.parts ?? [];
    const text = parts.map((p) => p.text ?? '').join(' ').trim() || '(empty)';
    return NextResponse.json({
      jsonrpc: '2.0',
      id: rpcId,
      result: makeTask(taskId, text),
    });
  }

  if (body.method === 'tasks/get') {
    const taskId = (body.params?.id as string | undefined) ?? 'unknown';
    return NextResponse.json({
      jsonrpc: '2.0',
      id: rpcId,
      result: makeTask(taskId, '(retrieved)'),
    });
  }

  if (body.method === 'tasks/cancel') {
    const taskId = (body.params?.id as string | undefined) ?? 'unknown';
    return NextResponse.json({
      jsonrpc: '2.0',
      id: rpcId,
      result: {
        id: taskId,
        status: { state: 'canceled', timestamp: new Date().toISOString() },
      },
    });
  }

  return NextResponse.json({
    jsonrpc: '2.0',
    id: rpcId,
    error: { code: -32601, message: 'Method not found' },
  });
}
