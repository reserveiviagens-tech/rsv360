/**
 * C36-DD — migration 0062 refund_requests (static SQL assertions).
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const SQL_062 = join(__dirname, '../../../drizzle/0062_refund_requests.sql');
const SQL_059 = join(__dirname, '../../../drizzle/0059_partner_domain.sql');
const JOURNAL = join(__dirname, '../../../drizzle/meta/_journal.json');

describe('Migration 0062_refund_requests (C36-DD)', () => {
  const sqlRaw = readFileSync(SQL_062, 'utf8');
  const sql = sqlRaw
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
  const sql059 = readFileSync(SQL_059, 'utf8');
  const journal = JSON.parse(readFileSync(JOURNAL, 'utf8')) as {
    entries: Array<{ idx: number; tag: string; when: number }>;
  };

  it('creates refund_requests table', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS refund_requests/i);
  });

  it('FK payment_id → payments RESTRICT', () => {
    expect(sql).toMatch(
      /payment_id uuid NOT NULL REFERENCES payments\(id\) ON DELETE RESTRICT/i,
    );
  });

  it('open-request uniqueness per payment', () => {
    expect(sql).toMatch(/refund_requests_one_open_per_payment/i);
    expect(sql).toMatch(/WHERE status IN \('draft', 'pending'\)/i);
  });

  it('does not INSERT financial writers', () => {
    expect(sql).not.toMatch(/INSERT INTO partner_earnings/i);
    expect(sql).not.toMatch(/INSERT INTO partner_ledger/i);
    expect(sql).not.toMatch(/INSERT INTO refunds/i);
  });

  it('0059 unchanged (no refund_requests)', () => {
    expect(sql059).not.toMatch(/refund_requests/);
  });

  it('journal idx 62 points to 0062', () => {
    const e62 = journal.entries.find((e) => e.idx === 62);
    expect(e62?.tag).toBe('0062_refund_requests');
    const e61 = journal.entries.find((e) => e.idx === 61);
    expect(e61?.when).toBeLessThan(e62!.when);
  });
});
