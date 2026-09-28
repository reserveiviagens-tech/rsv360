import { readFileSync } from 'fs';
import { join } from 'path';

const SQL_061 = join(
  __dirname,
  '../../../drizzle/0061_partner_earnings_booking_payment_and_terms.sql',
);
const SQL_059 = join(__dirname, '../../../drizzle/0059_partner_domain.sql');
const JOURNAL = join(__dirname, '../../../drizzle/meta/_journal.json');

describe('Migration 0061_partner_earnings_booking_payment_and_terms (C36-CE)', () => {
  const sqlRaw = readFileSync(SQL_061, 'utf8');
  const sql = sqlRaw
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
  const sql059 = readFileSync(SQL_059, 'utf8');
  const journal = JSON.parse(readFileSync(JOURNAL, 'utf8')) as {
    entries: Array<{ idx: number; tag: string; when: number }>;
  };

  it('cria partner_commercial_terms (CREATE IF NOT EXISTS)', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS partner_commercial_terms/i);
  });

  it('FK pea_id → partner_empreendimento_associations RESTRICT', () => {
    expect(sql).toMatch(
      /pea_id uuid NOT NULL\s+REFERENCES partner_empreendimento_associations\(id\) ON DELETE RESTRICT/i,
    );
  });

  it('constraints: rate_bps, window, v1 percent-only, fixed null', () => {
    expect(sql).toMatch(/rate_bps >= 0 AND rate_bps <= 10000/i);
    expect(sql).toMatch(/rate_kind IN \('percent_bps'\)/i);
    expect(sql).toMatch(/basis IN \('booking_total'\)/i);
    expect(sql).toMatch(/status IN \('draft', 'active', 'superseded'\)/i);
    expect(sql).toMatch(/fixed_amount_cents IS NULL/i);
    expect(sql).toMatch(/effective_to > effective_from/i);
  });

  it('concorrência: unique parcial um active por pea_id', () => {
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS partner_commercial_terms_one_active_per_pea\s+ON partner_commercial_terms \(pea_id\)\s+WHERE status = 'active'/i,
    );
  });

  it('expande source_type CHECK com booking_payment (aditivo)', () => {
    expect(sql).toMatch(/DROP CONSTRAINT IF EXISTS partner_earnings_source_type_check/i);
    expect(sql).toMatch(/booking_payment/);
    expect(sql).toMatch(/comissao_lancamento/);
    expect(sql).toMatch(/affiliate/);
    expect(sql).toMatch(/marketplace_order/);
    expect(sql).toMatch(/manual/);
    expect(sql).toMatch(/adjust/);
  });

  it('adiciona partner_earnings.metadata jsonb', () => {
    expect(sql).toMatch(
      /ALTER TABLE partner_earnings\s+ADD COLUMN IF NOT EXISTS metadata jsonb/i,
    );
  });

  it('0059 permanece imutável quanto a booking_payment', () => {
    expect(sql059).not.toMatch(/booking_payment/);
    expect(sql059).toMatch(
      /'comissao_lancamento', 'affiliate', 'marketplace_order', 'manual', 'adjust'/,
    );
  });

  it('journal idx 61 aponta para 0061 tag', () => {
    const e61 = journal.entries.find((e) => e.idx === 61);
    expect(e61).toBeDefined();
    expect(e61?.tag).toBe('0061_partner_earnings_booking_payment_and_terms');
    expect(e61?.when).toBe(1788570000000);
    const e60 = journal.entries.find((e) => e.idx === 60);
    expect(e60?.when).toBeLessThan(e61!.when);
  });

  it('não cria writer / partner_bookings / não DROP money tables', () => {
    expect(sql).not.toMatch(/partner_bookings/i);
    expect(sql).not.toMatch(/INSERT INTO partner_earnings/i);
    expect(sql).not.toMatch(/INSERT INTO partner_ledger/i);
    expect(sqlRaw).toMatch(/never ad-hoc in prod/i);
  });
});
