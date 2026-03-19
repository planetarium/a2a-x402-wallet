import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { generateEmbedding } from "@/lib/embedding";
import type { AgentResponse } from "@/lib/types";
import { sql } from "drizzle-orm";

const SIMILARITY_THRESHOLD = parseFloat(
  process.env.SEARCH_SIMILARITY_THRESHOLD ?? "0.3",
);

export interface SearchResult extends Record<string, unknown> {
  id: string;
  name: string;
  description: string;
  agentCardUrl: string;
  version: string | null;
  iconUrl: string | null;
  documentationUrl: string | null;
  providerOrganization: string | null;
  providerUrl: string | null;
  skills: unknown;
  extensions: unknown;
  score: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function search(
  query: string,
  limit = 10,
): Promise<SearchResult[]> {
  const queryEmbedding = await generateEmbedding(query);
  const embeddingLiteral = `[${queryEmbedding.join(",")}]`;

  const results = await db.execute<SearchResult>(sql`
    SELECT
      id,
      name,
      description,
      agent_card_url        AS "agentCardUrl",
      version,
      icon_url              AS "iconUrl",
      documentation_url     AS "documentationUrl",
      provider_organization AS "providerOrganization",
      provider_url          AS "providerUrl",
      skills,
      extensions,
      created_at            AS "createdAt",
      updated_at            AS "updatedAt",
      1 - (embedding <=> ${embeddingLiteral}::vector) AS score
    FROM agents
    WHERE embedding IS NOT NULL
      AND 1 - (embedding <=> ${embeddingLiteral}::vector) >= ${SIMILARITY_THRESHOLD}
    ORDER BY score DESC
    LIMIT ${limit}
  `);

  return results.rows;
}

export async function recentAgents(limit = 10): Promise<AgentResponse[]> {
  return db
    .select({
      id: agents.id,
      agentCardUrl: agents.agentCardUrl,
      name: agents.name,
      description: agents.description,
      version: agents.version,
      iconUrl: agents.iconUrl,
      documentationUrl: agents.documentationUrl,
      providerOrganization: agents.providerOrganization,
      providerUrl: agents.providerUrl,
      skills: agents.skills,
      extensions: agents.extensions,
      createdAt: agents.createdAt,
      updatedAt: agents.updatedAt,
    })
    .from(agents)
    .orderBy(agents.createdAt)
    .limit(limit);
}
