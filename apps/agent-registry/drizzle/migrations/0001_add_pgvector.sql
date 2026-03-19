-- Full-text GIN index
CREATE INDEX IF NOT EXISTS agents_search_vector_gin
  ON agents USING gin(search_vector);

-- HNSW index for cosine similarity
CREATE INDEX IF NOT EXISTS agents_embedding_hnsw
  ON agents USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- tsvector auto-update trigger
CREATE OR REPLACE FUNCTION agents_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agents_search_vector_trig ON agents;
CREATE TRIGGER agents_search_vector_trig
  BEFORE INSERT OR UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION agents_search_vector_update();
