CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_card_url TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  version TEXT,
  icon_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  skills JSONB NOT NULL DEFAULT '[]',
  x402 JSONB,
  search_vector tsvector,
  embedding vector(1536),
  is_verified TEXT DEFAULT 'pending',
  last_fetched_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
