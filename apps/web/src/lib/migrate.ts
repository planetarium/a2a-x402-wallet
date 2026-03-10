import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL environment variable is required');

const db = drizzle(process.env.DATABASE_URL);
await migrate(db, { migrationsFolder: join(__dirname, '../../drizzle/migrations') });
console.log('Migration complete');
process.exit(0);
