#!/usr/bin/env node
/**
 * Phase 7.1 — optional ops wrapper for migration 0051_coanfitriao_convites_backfill.sql
 *
 * Preferred path: apply via Drizzle migrate (runs all pending migrations idempotently):
 *   npm run migrate --workspace=backend
 *
 * This script supports dry-run counts or re-applying only the 0051 SQL when migrate
 * is not convenient. No e-mail addresses are logged (LGPD).
 *
 * Usage:
 *   $env:DATABASE_URL="postgresql://..."
 *   node scripts/backfill-coanfitriao-convites.mjs --dry-run
 *   node scripts/backfill-coanfitriao-convites.mjs
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const dryRun = process.argv.includes('--dry-run');
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(scriptDir, '..', 'drizzle', '0051_coanfitriao_convites_backfill.sql');

const ELIGIBLE_COUNT_SQL = `
SELECT
  COUNT(*)::int AS eligible,
  COUNT(DISTINCT a.id)::int AS accommodations
FROM acomodacoes a
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(a.metadata->'coanfitrioes') = 'array' THEN a.metadata->'coanfitrioes'
    ELSE '[]'::jsonb
  END
) AS elem
WHERE length(btrim(coalesce(elem->>'email', ''))) > 0
  AND lower(btrim(coalesce(elem->>'email', ''))) ~ '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
  AND length(
    btrim(regexp_replace(coalesce(elem->>'nome', ''), '[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]', '', 'g'))
  ) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM coanfitriao_convites existing
    WHERE existing.acomodacao_id = a.id
      AND lower(existing.email) = lower(btrim(coalesce(elem->>'email', '')))
      AND existing.status IN ('pendente', 'ativo')
  )
  AND NOT EXISTS (
    SELECT 1
    FROM coanfitriao_convites existing
    WHERE existing.acomodacao_id = a.id
      AND existing.token LIKE 'bf-%'
      AND length(btrim(coalesce(elem->>'id', ''))) > 0
      AND existing.id = left(btrim(elem->>'id'), 64)
  );
`;

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('[backfill-coanfitriao] DATABASE_URL is required');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    const { rows: countRows } = await client.query(ELIGIBLE_COUNT_SQL);
    const { eligible, accommodations } = countRows[0] ?? { eligible: 0, accommodations: 0 };

    const { rows: existingRows } = await client.query(
      `SELECT COUNT(*)::int AS n FROM coanfitriao_convites WHERE token LIKE 'bf-%'`,
    );
    const existingBackfill = existingRows[0]?.n ?? 0;

    console.log(
      `[backfill-coanfitriao] eligible=${eligible} accommodations=${accommodations} existing_bf_rows=${existingBackfill} dryRun=${dryRun}`,
    );

    if (dryRun) {
      console.log('[backfill-coanfitriao] dry-run complete — prefer npm run migrate for production apply');
      return;
    }

    if (eligible === 0) {
      console.log('[backfill-coanfitriao] nothing to insert — noop');
      return;
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    const result = await client.query(sql);
    console.log(`[backfill-coanfitriao] applied 0051 SQL rows=${result.rowCount ?? 'n/a'}`);
    console.log('[backfill-coanfitriao] OK — rollback: DELETE FROM coanfitriao_convites WHERE token LIKE \'bf-%\';');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[backfill-coanfitriao] failed:', err.message);
  process.exit(1);
});
