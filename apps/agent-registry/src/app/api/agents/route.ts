import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { buildEmbeddingText, generateEmbedding } from "@/lib/embedding";
import { fetchAgentCard } from "@/lib/agentCard";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(agents);
  return NextResponse.json({ count });
}

export async function POST(req: NextRequest) {
  let agentCardUrl: string;
  try {
    const body = await req.json();
    agentCardUrl = body.agentCardUrl;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!agentCardUrl) {
    return NextResponse.json({ error: "agentCardUrl required" }, { status: 400 });
  }

  let card;
  try {
    card = await fetchAgentCard(agentCardUrl);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch agent card" },
      { status: 422 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const x402 = (card as any).extensions?.x402 ?? null;
  const contentHash = createHash("sha256")
    .update(JSON.stringify(card))
    .digest("hex");

  const existing = await db
    .select({ id: agents.id, contentHash: agents.contentHash })
    .from(agents)
    .where(eq(agents.agentCardUrl, agentCardUrl))
    .limit(1);

  const now = new Date();

  if (existing.length > 0 && existing[0].contentHash === contentHash) {
    // 내용 변경 없음 — lastFetchedAt만 갱신, embedding 비용 없음
    const [agent] = await db
      .update(agents)
      .set({ lastFetchedAt: now })
      .where(eq(agents.agentCardUrl, agentCardUrl))
      .returning();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { embedding: _embedding, searchVector: _searchVector, contentHash: _contentHash, ...agentResponse } = agent;
    return NextResponse.json({ result: "unchanged", agent: agentResponse }, { status: 200 });
  }

  const isUpdate = existing.length > 0;

  const embeddingText = buildEmbeddingText({
    name: card.name,
    description: card.description ?? "",
    tags: card.defaultInputModes ?? [],
    skills: (card.skills ?? []) as Array<{ id?: string; name?: string; description?: string }>,
  });
  const embedding = await generateEmbedding(embeddingText);

  const [agent] = await db
    .insert(agents)
    .values({
      agentCardUrl,
      name: card.name,
      description: card.description ?? "",
      version: card.version,
      iconUrl: card.iconUrl,
      tags: [],
      skills: card.skills ?? [],
      x402,
      embedding,
      contentHash,
      lastFetchedAt: now,
    })
    .onConflictDoUpdate({
      target: agents.agentCardUrl,
      set: {
        name: card.name,
        description: card.description ?? "",
        version: card.version,
        iconUrl: card.iconUrl,
        skills: card.skills ?? [],
        x402,
        embedding,
        contentHash,
        lastFetchedAt: now,
        updatedAt: now,
      },
    })
    .returning();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { embedding: _embedding, searchVector: _searchVector, contentHash: _contentHash, ...agentResponse } = agent;
  return NextResponse.json(
    { result: isUpdate ? "updated" : "created", agent: agentResponse },
    { status: isUpdate ? 200 : 201 },
  );
}
