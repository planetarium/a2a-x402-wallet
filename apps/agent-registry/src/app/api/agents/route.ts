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

  const contentHash = createHash("sha256")
    .update(JSON.stringify(card))
    .digest("hex");

  const existing = await db
    .select({ id: agents.id, contentHash: agents.contentHash })
    .from(agents)
    .where(eq(agents.agentCardUrl, agentCardUrl))
    .limit(1);

  // 내용 변경 없음 — 임베딩 재생성 없이 그대로 반환
  if (existing.length > 0 && existing[0].contentHash === contentHash) {
    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.agentCardUrl, agentCardUrl))
      .limit(1);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { embedding: _embedding, contentHash: _contentHash, ...agentResponse } = agent;
    return NextResponse.json({ result: "unchanged", agent: agentResponse }, { status: 200 });
  }

  const isUpdate = existing.length > 0;
  const extensions = card.capabilities?.extensions ?? [];
  const now = new Date();

  const embeddingText = buildEmbeddingText({
    name: card.name,
    description: card.description ?? "",
    skills: card.skills ?? [],
    extensions,
    defaultInputModes: card.defaultInputModes,
    defaultOutputModes: card.defaultOutputModes,
    provider: card.provider,
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
      documentationUrl: card.documentationUrl,
      providerOrganization: card.provider?.organization ?? null,
      providerUrl: card.provider?.url ?? null,
      skills: card.skills ?? [],
      extensions: extensions.length > 0 ? extensions : null,
      embedding,
      contentHash,
    })
    .onConflictDoUpdate({
      target: agents.agentCardUrl,
      set: {
        name: card.name,
        description: card.description ?? "",
        version: card.version,
        iconUrl: card.iconUrl,
        documentationUrl: card.documentationUrl,
        providerOrganization: card.provider?.organization ?? null,
        providerUrl: card.provider?.url ?? null,
        skills: card.skills ?? [],
        extensions: extensions.length > 0 ? extensions : null,
        embedding,
        contentHash,
        updatedAt: now,
      },
    })
    .returning();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { embedding: _embedding, contentHash: _contentHash, ...agentResponse } = agent;
  return NextResponse.json(
    { result: isUpdate ? "updated" : "created", agent: agentResponse },
    { status: isUpdate ? 200 : 201 },
  );
}
