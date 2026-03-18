# Database Migrations

## Rules

**Always use `drizzle-kit generate` to create migration files. Never write migration SQL files by hand.**

Manually written SQL files lack the snapshot metadata that drizzle-kit relies on to compute schema diffs. This causes `drizzle-kit generate` to produce incorrect or duplicate migrations in the future.

## Workflow

### 1. Modify the schema

Edit `src/lib/db/schema.ts`.

### 2. Generate a migration

```bash
pnpm registry:db:generate
```

This creates a new SQL file and updates `drizzle/migrations/meta/` (snapshots + `_journal.json`) automatically.

### 3. Apply migrations

```bash
pnpm registry:db:migrate
```

### 4. (Optional) Inspect data

```bash
pnpm registry:db:studio
```

Opens Drizzle Studio in the browser for querying and editing data directly.

## Migration History

| File | Description |
|------|-------------|
| `0000_init.sql` | Initial `agents` table |
| `0001_add_pgvector.sql` | GIN index, HNSW index, tsvector trigger |
| `0002_add_content_hash.sql` | `content_hash` column for change detection |

> **Note:** Migrations `0000`–`0002` were written manually before this guideline was established.
> The `meta/_journal.json` was also created manually to match.
> From `0003` onward, always use `drizzle-kit generate`.
