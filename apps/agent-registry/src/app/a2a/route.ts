import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import type { Task } from "@a2a-js/sdk";
import { hybridSearch } from "@/lib/search";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as {
    jsonrpc?: string;
    method?: string;
    id?: unknown;
    params?: Record<string, unknown>;
  } | null;

  if (!body?.jsonrpc || !body?.method) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const rpcId = body.id ?? null;

  if (body.method === "message/send") {
    const params = body.params as { message?: { parts?: Array<{ kind?: string; text?: string }> } } | undefined;
    const query = params?.message?.parts?.find((p) => p.kind === "text")?.text ?? "";

    const taskId = randomUUID();

    if (!query) {
      const task: Task = {
        kind: "task",
        id: taskId,
        contextId: taskId,
        status: {
          state: "completed",
          message: {
            kind: "message",
            messageId: randomUUID(),
            role: "agent",
            parts: [{ kind: "text", text: "Please provide a search query." }],
          },
          timestamp: new Date().toISOString(),
        },
      };
      return NextResponse.json({ jsonrpc: "2.0", id: rpcId, result: task });
    }

    const results = await hybridSearch(query, 5);

    const text =
      results.length === 0
        ? "No matching agents found."
        : results
            .map(
              (a, i) =>
                `${i + 1}. **${a.name}** — ${a.description}\n   ${a.agentCardUrl}`,
            )
            .join("\n\n");

    const task: Task = {
      kind: "task",
      id: taskId,
      contextId: taskId,
      status: {
        state: "completed",
        message: {
          kind: "message",
          messageId: randomUUID(),
          role: "agent",
          parts: [{ kind: "text", text }],
        },
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json({ jsonrpc: "2.0", id: rpcId, result: task });
  }

  return NextResponse.json({
    jsonrpc: "2.0",
    id: rpcId,
    error: { code: -32601, message: "Method not found" },
  });
}
