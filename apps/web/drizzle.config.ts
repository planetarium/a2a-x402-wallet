// ⚠️  MIGRATION WORKFLOW — read before touching drizzle/migrations/
//
// ALWAYS use drizzle-kit to create migrations. Never write SQL files manually.
//
//   1. Edit src/lib/schema.ts
//   2. pnpm db:generate   ← generates SQL + updates meta/_journal.json + snapshot
//   3. pnpm db:migrate    ← applies to local DB
//
// WHY: drizzle-orm's migrate() (used in production via `fly deploy` release_command)
// reads meta/_journal.json to decide which SQL files to run.
// A manually created SQL file that is NOT listed in the journal will be silently skipped
// in both local and production environments.

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema:    './src/lib/schema.ts',
  out:       './drizzle/migrations',
  dialect:   'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
