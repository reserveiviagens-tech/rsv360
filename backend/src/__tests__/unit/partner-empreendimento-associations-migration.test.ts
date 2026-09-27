import { readFileSync } from 'fs';
import { join } from 'path';

const SQL_PATH = join(__dirname, '../../../drizzle/0060_partner_empreendimento_associations.sql');

describe('Migration 0060_partner_empreendimento_associations (FASE5 Inc2 / C36-AZ)', () => {
  const sqlRaw = readFileSync(SQL_PATH, 'utf8');
  const sql = sqlRaw
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

  it('cria partner_empreendimento_associations (CREATE IF NOT EXISTS)', () => {
    expect(sql).toMatch(
      /CREATE TABLE IF NOT EXISTS partner_empreendimento_associations/i,
    );
  });

  it('usa UUID PK + gen_random_uuid e FKs CASCADE/RESTRICT', () => {
    expect(sql).toMatch(/id uuid PRIMARY KEY DEFAULT gen_random_uuid()/i);
    expect(sql).toMatch(
      /partner_id uuid NOT NULL\s+REFERENCES partners\(id\) ON DELETE CASCADE/i,
    );
    expect(sql).toMatch(
      /empreendimento_id integer NOT NULL\s+REFERENCES empreendimentos\(id\) ON DELETE RESTRICT/i,
    );
    expect(sql).toMatch(
      /created_by_user_id integer\s+REFERENCES users\(id\) ON DELETE SET NULL/i,
    );
  });

  it('define UNIQUE(partner_id, empreendimento_id) e CHECKs de role/status', () => {
    expect(sql).toMatch(
      /CONSTRAINT pea_partner_empreendimento_unique\s+UNIQUE \(partner_id, empreendimento_id\)/i,
    );
    expect(sql).toMatch(/commercial_owner.*agency.*channel.*viewer/is);
    expect(sql).toMatch(/active.*suspended.*ended/is);
  });

  it('cria índices bidirecionais por status', () => {
    expect(sql).toMatch(
      /CREATE INDEX IF NOT EXISTS idx_pea_partner_status\s+ON partner_empreendimento_associations \(partner_id, status\)/i,
    );
    expect(sql).toMatch(
      /CREATE INDEX IF NOT EXISTS idx_pea_empreendimento_status\s+ON partner_empreendimento_associations \(empreendimento_id, status\)/i,
    );
  });

  it('é CREATE-only: sem ALTER, sem partner_bookings, sem tocar money/links', () => {
    expect(sql).not.toMatch(/\bALTER\s+TABLE\b/i);
    expect(sql).not.toMatch(/partner_bookings/i);
    expect(sql).not.toMatch(/CREATE TABLE IF NOT EXISTS partner_links/i);
    expect(sql).not.toMatch(/CREATE TABLE IF NOT EXISTS partner_earnings/i);
    expect(sql).not.toMatch(/CREATE TABLE IF NOT EXISTS bookings/i);
    expect(sql).not.toMatch(/ADD\s+COLUMN\s+.*partner_id/i);
  });

  it('documenta rollback formal DROP da tabela L3', () => {
    expect(sqlRaw).toMatch(/DROP TABLE IF EXISTS partner_empreendimento_associations/i);
    expect(sqlRaw).toMatch(/never ad-hoc in prod/i);
  });
});
