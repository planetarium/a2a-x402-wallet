# Database Migrations

> **Never create `.sql` files in this directory by hand.**

## Correct workflow

```bash
# 1. Edit src/lib/schema.ts

# 2. Generate migration (creates SQL + updates meta/_journal.json + snapshot)
pnpm db:generate

# 3. Apply to local DB
pnpm db:migrate
```

## Why this matters

`drizzle-orm`'s `migrate()` function — used in production via Fly.io's `release_command` — reads
`meta/_journal.json` to determine which SQL files to run.

**A manually written `.sql` file that is not registered in `_journal.json` will be silently skipped
in both local and production environments.**

This is what happened with `0002_user_settings.sql`: the file existed but the journal entry was
missing, so the `user_settings` table was never created until the journal was fixed manually.

## Production deployment

Migrations run automatically on every `fly deploy` before the new app version receives traffic:

```
fly deploy
  └─► release_command: node apps/web/migrate.mjs
        └─► drizzle-orm migrate() reads _journal.json → applies pending migrations
  └─► app server starts
```

The `migrate.mjs` bundle and the `migrations/` folder are both embedded in the Docker image at
build time, so whatever is in this directory at deploy time is what runs in production.
