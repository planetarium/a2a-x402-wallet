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
    documentationUrl: text("documentation_url"),

    // Provider
    providerOrganization: text("provider_organization"),
    providerUrl: text("provider_url"),

    // Structured data
    skills: jsonb("skills").notNull().default([]),
    extensions: jsonb("extensions"), // capabilities.extensions

    // Dense vector (1536-dim, text-embedding-3-small)
    embedding: vector("embedding", { dimensions: 1536 }),

    // Content hash for change detection (SHA-256 of Agent Card JSON)
    contentHash: text("content_hash"),

    // Meta
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
