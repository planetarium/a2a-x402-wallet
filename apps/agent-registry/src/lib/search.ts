import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { generateEmbedding } from "@/lib/embedding";
import type { AgentResponse } from "@/lib/types";
import { sql } from "drizzle-orm";

const RRF_K = 60;

export interface SearchResult extends Record<string, unknown> {
  id: string;
  name: string;
  description: string;
  agentCardUrl: string;
  tags: string[];
  skills: unknown;
  x402: unknown;
  score: number;
}

export async function hybridSearch(
  query: string,
  limit = 10,
): Promise<SearchResult[]> {
  const queryEmbedding = await generateEmbedding(query);
  const embeddingLiteral = `[${queryEmbedding.join(",")}]`;

  // Sparse: tsvector full-text search (top-60)
  const sparseQuery = sql`
    SELECT id, ROW_NUMBER() OVER (
      ORDER BY ts_rank(search_vector, plainto_tsquery('english', ${query})) DESC
    ) AS rank
    FROM agents
    WHERE search_vector @@ plainto_tsquery('english', ${query})
    ORDER BY rank
    LIMIT 60
  `;

  // Dense: pgvector cosine similarity (top-60, threshold 0.5)
  const denseQuery = sql`
    SELECT id, ROW_NUMBER() OVER (
      ORDER BY embedding <=> ${embeddingLiteral}::vector
    ) AS rank
    FROM agents
    WHERE embedding IS NOT NULL
      AND embedding <=> ${embeddingLiteral}::vector < 0.5
    ORDER BY embedding <=> ${embeddingLiteral}::vector
    LIMIT 60
  `;

  // RRF merge via CTE
  const results = await db.execute<SearchResult & { score: number }>(sql`
    WITH sparse AS (${sparseQuery}),
    dense AS (${denseQuery})
    SELECT
      a.id,
      a.name,
      a.description,
      a.agent_card_url AS "agentCardUrl",
      a.tags,
      a.skills,
      a.x402,
      COALESCE(1.0 / (${RRF_K} + s.rank), 0)
        + COALESCE(1.0 / (${RRF_K} + d.rank), 0) AS score
    FROM (
      SELECT COALESCE(s.id, d.id) AS id,
             s.rank AS sparse_rank,
             d.rank AS dense_rank
      FROM sparse s
      FULL OUTER JOIN dense d USING (id)
    ) ranked
    JOIN agents a ON a.id = ranked.id
    LEFT JOIN sparse s ON s.id = ranked.id
    LEFT JOIN dense  d ON d.id  = ranked.id
    ORDER BY score DESC
    LIMIT ${limit}
  `);

  return results.rows;
}

export async function hybridSearchWithExpansion(
  userQuery: string,
  limit = 10,
): Promise<SearchResult[]> {
  const { expandQuery } = await import("@/lib/queryExpansion");
  const expanded = await expandQuery(userQuery);

  const queryEmbedding = await generateEmbedding(expanded.intent);
  const embeddingLiteral = `[${queryEmbedding.join(",")}]`;

  const sparseKeywords = expanded.keywords.join(" | ");

  const x402Filter = expanded.filters?.network
    ? sql`AND x402->>'network' = ${expanded.filters.network}`
    : sql``;

  const sparseQuery = sql`
    SELECT id, ROW_NUMBER() OVER (
      ORDER BY ts_rank(search_vector, to_tsquery('english', ${sparseKeywords})) DESC
    ) AS rank
    FROM agents
    WHERE search_vector @@ to_tsquery('english', ${sparseKeywords})
    ${x402Filter}
    ORDER BY rank
    LIMIT 60
  `;

  const denseQuery = sql`
    SELECT id, ROW_NUMBER() OVER (
      ORDER BY embedding <=> ${embeddingLiteral}::vector
    ) AS rank
    FROM agents
    WHERE embedding IS NOT NULL
      AND embedding <=> ${embeddingLiteral}::vector < 0.5
    ${x402Filter}
    ORDER BY embedding <=> ${embeddingLiteral}::vector
    LIMIT 60
  `;

  const results = await db.execute<SearchResult & { score: number }>(sql`
    WITH sparse AS (${sparseQuery}),
    dense AS (${denseQuery})
    SELECT
      a.id,
      a.name,
      a.description,
      a.agent_card_url AS "agentCardUrl",
      a.tags,
      a.skills,
      a.x402,
      COALESCE(1.0 / (${RRF_K} + s.rank), 0)
        + COALESCE(1.0 / (${RRF_K} + d.rank), 0) AS score
    FROM (
      SELECT COALESCE(s.id, d.id) AS id,
             s.rank AS sparse_rank,
             d.rank AS dense_rank
      FROM sparse s
      FULL OUTER JOIN dense d USING (id)
    ) ranked
    JOIN agents a ON a.id = ranked.id
    LEFT JOIN sparse s ON s.id = ranked.id
    LEFT JOIN dense  d ON d.id  = ranked.id
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
      tags: agents.tags,
      skills: agents.skills,
      x402: agents.x402,
      isVerified: agents.isVerified,
      lastFetchedAt: agents.lastFetchedAt,
      createdAt: agents.createdAt,
      updatedAt: agents.updatedAt,
    })
    .from(agents)
    .orderBy(agents.createdAt)
    .limit(limit);
}
