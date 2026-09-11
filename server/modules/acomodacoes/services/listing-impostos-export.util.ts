/**
 * Fiscal CSV export for host-scoped listings.
 * Never log or export full CNPJ or internal notas text (LGPD).
 */

import { maskCnpj, type ListingImpostos } from './listing-impostos.util';

export type ImpostosExportUnit = {
  id: number;
  titulo: string;
  hotelId: string;
  metadata?: unknown;
};

const CSV_HEADER =
  'id,titulo,hotelId,isento,aliquotaPct,inscricaoMunicipal,cnpjMascarado,temNotas';

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function extractImpostos(metadata: unknown): ListingImpostos | undefined {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return undefined;
  }
  const raw = (metadata as Record<string, unknown>).impostos;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  return raw as ListingImpostos;
}

function formatAliquota(impostos: ListingImpostos | undefined): string {
  if (!impostos || impostos.isento === true) return '';
  const n = impostos.aliquotaPct;
  if (typeof n !== 'number' || !Number.isFinite(n)) return '';
  return String(n);
}

function formatCnpjMascarado(impostos: ListingImpostos | undefined): string {
  const digits =
    typeof impostos?.cnpj === 'string' ? impostos.cnpj.replace(/\D/g, '') : '';
  if (!digits) return '';
  return maskCnpj(digits);
}

function formatTemNotas(impostos: ListingImpostos | undefined): 'sim' | 'nao' {
  const text = typeof impostos?.notas === 'string' ? impostos.notas.trim() : '';
  return text.length > 0 ? 'sim' : 'nao';
}

function impostosRow(unit: ImpostosExportUnit): string {
  const impostos = extractImpostos(unit.metadata);
  const isento = impostos?.isento === true ? 'true' : 'false';
  const inscricao =
    typeof impostos?.inscricaoMunicipal === 'string'
      ? impostos.inscricaoMunicipal.trim()
      : '';

  return [
    String(unit.id),
    escapeCsvField(String(unit.titulo ?? '')),
    escapeCsvField(String(unit.hotelId ?? '')),
    isento,
    formatAliquota(impostos),
    escapeCsvField(inscricao),
    escapeCsvField(formatCnpjMascarado(impostos)),
    formatTemNotas(impostos),
  ].join(',');
}

/** Build fiscal CSV for host export (CNPJ masked; notas never included). */
export function buildImpostosExportCsv(units: ImpostosExportUnit[]): string {
  const rows = units.map(impostosRow);
  return [CSV_HEADER, ...rows].join('\n');
}
