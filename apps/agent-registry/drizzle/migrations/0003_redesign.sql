-- Drop old table and recreate with new schema
DROP TABLE IF EXISTS agents;

CREATE TABLE agents (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_card_url       TEXT        NOT NULL UNIQUE,
  name                 TEXT        NOT NULL,
  description          TEXT        NOT NULL DEFAULT '',
  version              TEXT,
  icon_url             TEXT,
  documentation_url    TEXT,
  provider_organization TEXT,
  provider_url         TEXT,
  skills               JSONB       NOT NULL DEFAULT '[]',
  extensions           JSONB,
  embedding            vector(1536),
  content_hash         TEXT,
  created_at           TIMESTAMP   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX agents_embedding_hnsw
  ON agents
  USING hnsw (embedding vector_cosine_ops);
