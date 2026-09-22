#!/usr/bin/env node
/**
 * FASE5 Inc1 — ephemeral Postgres validation for 0059_partner_domain.
 * Does NOT use rsv360-postgres shared stack. Spins disposable container.
 *
 * Usage (from backend/): node scripts/validate-partner-domain-0059.mjs
 */
import { execSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL_UP = readFileSync(resolve(__dirname, '../drizzle/0059_partner_domain.sql'), 'utf8');
const SQL_DOWN = `
DROP TABLE IF EXISTS partner_ledger_entries;
DROP TABLE IF EXISTS partner_payout_items;
DROP TABLE IF EXISTS partner_payouts;
DROP TABLE IF EXISTS partner_earnings;
DROP TABLE IF EXISTS partner_links;
DROP TABLE IF EXISTS partner_memberships;
DROP TABLE IF EXISTS partners;
`;

const CONTAINER = `rsv360-inc1-ephemeral-${Date.now()}`;
const PORT = 55439;
const USER = 'inc1';
const PASS = 'inc1pass';
const DB = 'inc1db';
const URL = `postgresql://${USER}:${PASS}@127.0.0.1:${PORT}/${DB}`;

const results = [];

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? `: ${detail}` : ''}`);
}

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

async function waitReady(pool, attempts = 30) {
  for (let i = 0; i < attempts; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch {
      await delay(500);
    }
  }
  throw new Error('postgres not ready');
}

async function main() {
  console.log(`[inc1] starting ephemeral postgres ${CONTAINER} on :${PORT}`);
  sh(
    `docker run -d --name ${CONTAINER} -e POSTGRES_USER=${USER} -e POSTGRES_PASSWORD=${PASS} -e POSTGRES_DB=${DB} -p ${PORT}:5432 postgres:16-alpine`,
  );

  const pool = new pg.Pool({ connectionString: URL });
  try {
    await waitReady(pool);

    // Minimal users stub (FK dependency only — not full schema)
    await pool.query(`
      CREATE TABLE users (
        id serial PRIMARY KEY,
        email varchar(255)
      );
      INSERT INTO users (email) VALUES ('inc1-test@example.invalid');
    `);
    record('stub users table', true);

    // Apply UP
    await pool.query(SQL_UP);
    record('migration apply (UP)', true);

    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name LIKE 'partner%'
      ORDER BY table_name
    `);
    const names = tables.rows.map((r) => r.table_name);
    const expected = [
      'partner_earnings',
      'partner_ledger_entries',
      'partner_links',
      'partner_memberships',
      'partner_payout_items',
      'partner_payouts',
      'partners',
    ];
    record(
      'seven Partner* tables present',
      expected.every((t) => names.includes(t)),
      names.join(','),
    );

    // Create partner + UUID + FK
    const inserted = await pool.query(
      `INSERT INTO partners (code, display_name, primary_user_id)
       VALUES ('INC1-TEST', 'Inc1 Partner', 1)
       RETURNING id, status`,
    );
    const partnerRow = inserted.rows[0];

    const uuidOk = /^[0-9a-f-]{36}$/i.test(partnerRow.id);
    record('partner insert + UUID', uuidOk, partnerRow.id);
    record('default status draft', partnerRow.status === 'draft', partnerRow.status);

    await pool.query(
      `INSERT INTO partner_memberships (partner_id, user_id, role)
       VALUES ($1, 1, 'owner')`,
      [partnerRow.id],
    );
    record('membership FK users+partners', true);

    // Constraint: invalid status
    let statusRejected = false;
    try {
      await pool.query(`UPDATE partners SET status = 'nope' WHERE id = $1`, [partnerRow.id]);
    } catch {
      statusRejected = true;
    }
    record('status CHECK rejects invalid', statusRejected);

    // Unique code
    let uniqueRejected = false;
    try {
      await pool.query(
        `INSERT INTO partners (code, display_name) VALUES ('INC1-TEST', 'Dup')`,
      );
    } catch {
      uniqueRejected = true;
    }
    record('UNIQUE code enforced', uniqueRejected);

    // Legacy isolation: no accidental tables
    const legacy = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'affiliates','marketplace_listings','comissoes_lancamento',
          'empreendimentos','acomodacoes','payments'
        )
    `);
    record('legacy tables absent on ephemeral', legacy.rows.length === 0);

    // No enterprise_id column
    const cols = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'partners' AND column_name = 'enterprise_id'
    `);
    record('no enterprise_id column', cols.rows.length === 0);

    // DOWN
    await pool.query(SQL_DOWN);
    const afterDown = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name LIKE 'partner%'
    `);
    record('migration rollback (DOWN)', afterDown.rows.length === 0);

    // Re-apply UP
    await pool.query(SQL_UP);
    const afterReup = await pool.query(`
      SELECT count(*)::int AS n FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name LIKE 'partner%'
    `);
    record('migration re-apply (UP again)', afterReup.rows[0].n === 7, String(afterReup.rows[0].n));

    // Re-insert works after re-apply
    const again = await pool.query(
      `INSERT INTO partners (code, display_name) VALUES ('INC1-REUP', 'Reup') RETURNING id`,
    );
    record('insert after re-apply', !!again.rows[0]?.id);
  } finally {
    await pool.end().catch(() => {});
    spawnSync('docker', ['rm', '-f', CONTAINER], { encoding: 'utf8' });
    console.log(`[inc1] removed container ${CONTAINER}`);
  }

  const failed = results.filter((r) => !r.ok);
  console.log('\n--- SUMMARY ---');
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name}`);
  if (failed.length) {
    console.error(`\nINC1_EPHEMERAL_FAIL (${failed.length})`);
    process.exit(1);
  }
  console.log('\nINC1_EPHEMERAL_PASS');
}

main().catch((err) => {
  console.error(err);
  spawnSync('docker', ['rm', '-f', CONTAINER], { encoding: 'utf8' });
  process.exit(1);
});
