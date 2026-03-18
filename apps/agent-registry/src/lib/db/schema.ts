import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core";

export const agents = pgTable(
  "agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentCardUrl: text("agent_card_url").notNull().unique(),

    // Agent Card mirrored data
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    version: text("version"),
    iconUrl: text("icon_url"),
    tags: text("tags").array().notNull().default([]),

    // Structured data (skill list, x402 config)
    skills: jsonb("skills").notNull().default([]),
    x402: jsonb("x402"),

    // Full-text search (sparse) — raw tsvector string for update
    searchVector: text("search_vector"),

    // Dense vector (1536-dim, text-embedding-3-small)
    embedding: vector("embedding", { dimensions: 1536 }),

    // Content hash for change detection (SHA-256 of card fields)
    contentHash: text("content_hash"),

    // Meta
    isVerified: text("is_verified").default("pending"), // pending | verified | flagged
    lastFetchedAt: timestamp("last_fetched_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("agents_embedding_hnsw").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
  ],
);
