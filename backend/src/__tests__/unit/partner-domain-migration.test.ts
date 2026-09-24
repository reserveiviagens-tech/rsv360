import { readFileSync } from 'fs';
import { join } from 'path';

const SQL_PATH = join(__dirname, '../../../drizzle/0059_partner_domain.sql');

describe('Migration 0059_partner_domain (FASE5 Inc1)', () => {
  const sqlRaw = readFileSync(SQL_PATH, 'utf8');
  const sql = sqlRaw
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

  it('cria as 7 tabelas Partner* (CREATE IF NOT EXISTS)', () => {
    for (const table of [
      'partners',
      'partner_memberships',
      'partner_links',
      'partner_earnings',
      'partner_payouts',
      'partner_payout_items',
      'partner_ledger_entries',
    ]) {
      expect(sql).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`, 'i'));
    }
  });

  it('usa UUID + gen_random_uuid e FK users integer', () => {
    expect(sql).toMatch(/id uuid PRIMARY KEY DEFAULT gen_random_uuid()/i);
    expect(sql).toMatch(/primary_user_id integer REFERENCES users\(id\)/i);
    expect(sql).toMatch(/user_id integer NOT NULL REFERENCES users\(id\)/i);
  });

  it('não cria enterprise_id UUID e não ALTER tabelas vivas', () => {
    expect(sql).not.toMatch(/enterprise_id/i);
    expect(sql).not.toMatch(/\bALTER\s+TABLE\b/i);
  });

  it('não ALTER tabelas legadas nem REFERENCES a inventário/comissões/payments', () => {
    expect(sql).not.toMatch(/\bALTER\s+TABLE\b/i);
    expect(sql).not.toMatch(
      /REFERENCES\s+(empreendimentos|acomodacoes|affiliates|marketplace_\w+|comissoes_lancamento|payments)\b/i,
    );
    expect(sql).not.toMatch(
      /CREATE TABLE IF NOT EXISTS (empreendimentos|acomodacoes|affiliates|marketplace_|comissoes_lancamento|payments)\b/i,
    );
  });

  it('documenta rollback formal (DROP só Partner*)', () => {
    expect(sqlRaw).toMatch(/DROP TABLE IF EXISTS partner_ledger_entries/i);
    expect(sqlRaw).toMatch(/DROP TABLE IF EXISTS partners/i);
    expect(sqlRaw).toMatch(/never ad-hoc in prod/i);
  });

  it('ordem CREATE: partners antes de filhas; ledger por último', () => {
    const partnersAt = sql.indexOf('CREATE TABLE IF NOT EXISTS partners');
    const membershipsAt = sql.indexOf('CREATE TABLE IF NOT EXISTS partner_memberships');
    const ledgerAt = sql.indexOf('CREATE TABLE IF NOT EXISTS partner_ledger_entries');
    const payoutsAt = sql.indexOf('CREATE TABLE IF NOT EXISTS partner_payouts');
    expect(partnersAt).toBeGreaterThanOrEqual(0);
    expect(membershipsAt).toBeGreaterThan(partnersAt);
    expect(payoutsAt).toBeGreaterThan(membershipsAt);
    expect(ledgerAt).toBeGreaterThan(payoutsAt);
  });
});
