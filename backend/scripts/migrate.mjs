import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..', '..');
// Prefer backend/.env then monorepo root .env (no secrets logged).
loadDotenv({ path: resolve(scriptDir, '..', '.env') });
loadDotenv({ path: resolve(repoRoot, '.env') });

const connectionString = process.env.DATABASE_URL;
const migrationsFolder = resolve(scriptDir, '..', 'drizzle');

if (!connectionString) {
  throw new Error('[migrate] DATABASE_URL is required');
}

const pool = new Pool({ connectionString });

async function main() {
  const db = drizzle(pool);

  try {
    console.log(`[migrate] applying Drizzle migrations from ${migrationsFolder}`);
    await migrate(db, { migrationsFolder });
    console.log('[migrate] migrations applied successfully');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[migrate] migration failed');
  console.error(error);
  process.exit(1);
});
