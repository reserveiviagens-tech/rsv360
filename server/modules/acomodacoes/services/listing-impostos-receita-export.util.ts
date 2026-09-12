/**
 * Monthly fiscal estimate CSV: receita × aliquotaPct (no NFSe).
 * Never export notas or full CNPJ (LGPD).
 */

import type { ListingImpostos } from './listing-impostos.util';

export type FiscalReceitaUnitRow = {
  acomodacaoId: number;
  titulo: string;
  receita: number;
  metadata?: unknown;
};

export type FiscalReceitaPeriodo = {
  mes: string;
  de: string;
  ate: string;
};

const CSV_HEADER =
  'acomodacao_id,titulo,mes,de,ate,receita,aliquotaPct,isento,impostoEstimado,inscricaoMunicipal';

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function extractImpostosFromMetadata(metadata: unknown): ListingImpostos | undefined {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return undefined;
  }
  const raw = (metadata as Record<string, unknown>).impostos;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  return raw as ListingImpostos;
}

/** Round money to 2 decimal places (BRL cents). */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Estimated municipal tax for the period.
 * isento → 0; missing/invalid aliquota → null (CSV cell empty).
 */
export function computeImpostoEstimado(
  receita: number,
  impostos: ListingImpostos | undefined,
): number | null {
  const receitaSafe = Number.isFinite(receita) ? Math.max(0, receita) : 0;
  if (impostos?.isento === true) return 0;
  const pct = impostos?.aliquotaPct;
  if (typeof pct !== 'number' || !Number.isFinite(pct) || pct < 0) return null;
  return roundMoney(receitaSafe * (pct / 100));
}

function formatAliquota(impostos: ListingImpostos | undefined): string {
  if (!impostos || impostos.isento === true) return '';
  const n = impostos.aliquotaPct;
  if (typeof n !== 'number' || !Number.isFinite(n)) return '';
  return String(n);
}

function formatImposto(value: number | null): string {
  if (value == null) return '';
  return String(value);
}

function fiscalRow(unit: FiscalReceitaUnitRow, periodo: FiscalReceitaPeriodo): string {
  const impostos = extractImpostosFromMetadata(unit.metadata);
  const receita = roundMoney(Number.isFinite(unit.receita) ? unit.receita : 0);
  const isento = impostos?.isento === true ? 'true' : 'false';
  const inscricao =
    typeof impostos?.inscricaoMunicipal === 'string'
      ? impostos.inscricaoMunicipal.trim()
      : '';
  const imposto = computeImpostoEstimado(receita, impostos);

  return [
    String(unit.acomodacaoId),
    escapeCsvField(String(unit.titulo ?? '')),
    periodo.mes,
    periodo.de,
    periodo.ate,
    String(receita),
    formatAliquota(impostos),
    isento,
    formatImposto(imposto),
    escapeCsvField(inscricao),
  ].join(',');
}

/** Build monthly receita × alíquota CSV (estimate only — not an NFSe). */
export function buildImpostosReceitaMensalCsv(
  units: FiscalReceitaUnitRow[],
  periodo: FiscalReceitaPeriodo,
): string {
  const rows = units.map((u) => fiscalRow(u, periodo));
  return [CSV_HEADER, ...rows].join('\n');
}
