# Hybrid Search Strategy for A2A Agent Registry

## Why Hybrid Search?

The core value of the Agent Registry is **"finding the right agent when you describe what you need"** — even when the exact keywords don't match.

Examples:
- `"translate to Korean"` → agent whose skill is `translate` and description says `"Korean-English translation"`
- `"accept USDC payments on Base"` → agent whose x402 config includes Base + USDC
- `"schedule my calendar"` → agent with `calendar` or `scheduling` skill

Neither sparse (keyword) nor dense (vector) search alone handles all these cases well:

| Problem | Sparse only | Dense only |
|---------|-------------|------------|
| Exact skill ID match (`"calendar"`) | ✅ | ❌ may miss |
| Cross-lingual query (`"일정"` → `"scheduling"`) | ❌ | ✅ |
| Synonym (`"translate"` ≠ `"translation"`) | ❌ | ✅ |

Hybrid Search combines both signals — and consistently outperforms either alone (BEIR benchmark).

---

## How It Works

```
Query
  ├── tsvector search  →  sparse ranks  [agent_a=1, agent_b=3, ...]
  └── pgvector search  →  dense ranks   [agent_b=1, agent_c=2, ...]
                                  ↓
                    Reciprocal Rank Fusion (RRF)
                    score = Σ 1 / (k + rank_i)   (k = 60)
                                  ↓
                         unified ranking → top-k agents
```

**Sparse side** — PostgreSQL `tsvector`: scores by term frequency (TF-IDF variant). Fast, no extra infrastructure, but limited to exact word or morpheme matches.

**Dense side** — `pgvector` with cosine similarity: embeds agent card text (name + description + skills + tags) and the query into high-dimensional vectors, then finds nearest neighbors. Handles synonyms, paraphrases, and cross-lingual queries.

**Fusion** — Reciprocal Rank Fusion (RRF) merges the two ranked lists without needing manual weight tuning. Each candidate's score is the sum of `1 / (k + rank)` across both lists, where `k = 60` dampens the effect of outlier ranks.

---

## Data Model

```sql
-- Enable pgvector extension (one-time, in Neon/Supabase dashboard or migration)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add columns to the agents table
ALTER TABLE agents ADD COLUMN embedding vector(1536);     -- text-embedding-3-small
ALTER TABLE agents ADD COLUMN search_vector tsvector;

-- GIN index for full-text search
CREATE INDEX agents_search_vector_gin
  ON agents USING gin(search_vector);

-- HNSW index for approximate nearest-neighbor search
-- HNSW offers better query-time accuracy than IVFFlat at the cost of slower builds
CREATE INDEX agents_embedding_hnsw
  ON agents USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Trigger: keep search_vector in sync on insert/update
CREATE OR REPLACE FUNCTION agents_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agents_search_vector_trig
  BEFORE INSERT OR UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION agents_search_vector_update();
```

**Why `pgvector`?** It runs inside the existing PostgreSQL instance (Neon / Supabase support it natively), so no separate vector store service is needed. SQL joins against the `agents` table remain straightforward.

**Embedding model**: `text-embedding-3-small` (OpenAI) — 1536 dimensions, multilingual, fast, low cost. Swap to `text-embedding-3-large` or a self-hosted model without schema changes.

**Text to embed** (agent registration time):
```
{name}. {description}. {tags joined by space}. {skill names and descriptions}
```

---

## Search Query (RRF in SQL)

```sql
CREATE OR REPLACE FUNCTION search_agents(
  query_text text,
  query_embedding vector(1536),
  k int DEFAULT 10
) RETURNS TABLE(id uuid, name text, score float) AS $$
  WITH sparse AS (
    SELECT id,
           ROW_NUMBER() OVER (
             ORDER BY ts_rank(search_vector, plainto_tsquery('english', query_text)) DESC
           ) AS rank
    FROM agents
    WHERE search_vector @@ plainto_tsquery('english', query_text)
    LIMIT 60
  ),
  dense AS (
    SELECT id,
           ROW_NUMBER() OVER (
             ORDER BY embedding <=> query_embedding
           ) AS rank
    FROM agents
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> query_embedding
    LIMIT 60
  )
  SELECT
    COALESCE(s.id, d.id)                          AS id,
    a.name,
    COALESCE(1.0 / (60 + s.rank), 0)
      + COALESCE(1.0 / (60 + d.rank), 0)          AS score
  FROM sparse s
  FULL OUTER JOIN dense d ON s.id = d.id
  JOIN agents a ON a.id = COALESCE(s.id, d.id)
  ORDER BY score DESC
  LIMIT k;
$$ LANGUAGE sql;
```

The `FULL OUTER JOIN` ensures agents that appear in only one of the two lists are still included and scored.

---

## Embedding at Registration Time

Every time an agent is registered or its Agent Card is re-fetched:

1. Concatenate `name + description + tags + skill descriptions` into one string.
2. Call the embedding API once.
3. Store the resulting vector in `agents.embedding`.

The `search_vector` column is maintained automatically by the DB trigger — no application-side tsvector computation needed.

---

## Choosing the Right Tool per Query Type

| Query type | Primary signal | Example |
|------------|---------------|---------|
| Exact skill ID | Sparse | `"find agents with skill: translate"` |
| Natural language intent | Dense | `"I need something that translates Korean"` |
| Cross-lingual | Dense | `"번역 에이전트"` → `"translate"` |
| Both / uncertain | **Hybrid (default)** | anything else |

Use plain Hybrid Search as the default path. Layer Query Expansion (Phase 2) on top when cross-lingual or paraphrase queries become common.
