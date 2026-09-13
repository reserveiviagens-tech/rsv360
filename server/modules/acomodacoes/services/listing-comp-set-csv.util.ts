/**
 * Comp-set CSV import/export (manual prices only — no OTA scrape).
 * Do not call ota-scraper.service.ts from this module.
 */

import { randomUUID } from 'crypto';
import {
  COMP_SET_MAX,
  validateListingCompSet,
  type CompSetEntry,
} from './listing-comp-set.util';

export type ParseCompSetCsvOk = { ok: true; value: CompSetEntry[] };
export type ParseCompSetCsvErr = {
  ok: false;
  error: 'comp_set_csv_invalido' | 'comp_set_invalido';
  message: string;
};

const SCRAPE_URL_RE =
  /https?:\/\/|www\.|booking\.com|airbnb\.|vrbo\.|expedia\.|tripadvisor\./i;

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

function parseOptionalNumber(raw: string): number | undefined {
  const t = raw.trim().replace(',', '.');
  if (!t) return undefined;
  const n = Number(t);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function looksLikeScrapeUrl(text: string): boolean {
  return SCRAPE_URL_RE.test(text);
}

/**
 * Parse CSV with header: nome,precoNoite,precoMin,precoMax[,notas]
 * Generates UUIDs; validates via validateListingCompSet.
 */
export function parseCompSetCsv(text: string): ParseCompSetCsvOk | ParseCompSetCsvErr {
  const normalized = String(text ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  if (!normalized) {
    return { ok: false, error: 'comp_set_csv_invalido', message: 'CSV vazio' };
  }

  const lines = normalized.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return {
      ok: false,
      error: 'comp_set_csv_invalido',
      message: 'CSV deve ter cabeçalho e ao menos uma linha de dados',
    };
  }

  const headerCells = splitCsvLine(lines[0]!).map((h) => h.toLowerCase().replace(/\s+/g, ''));
  const idx = {
    nome: headerCells.indexOf('nome'),
    precoNoite: headerCells.indexOf('preconoite'),
    precoMin: headerCells.indexOf('precomin'),
    precoMax: headerCells.indexOf('precomax'),
    notas: headerCells.indexOf('notas'),
  };

  if (idx.nome < 0 || idx.precoNoite < 0 || idx.precoMin < 0 || idx.precoMax < 0) {
    return {
      ok: false,
      error: 'comp_set_csv_invalido',
      message: 'Cabeçalho esperado: nome,precoNoite,precoMin,precoMax (notas opcional)',
    };
  }

  const dataLines = lines.slice(1);
  if (dataLines.length > COMP_SET_MAX) {
    return {
      ok: false,
      error: 'comp_set_csv_invalido',
      message: `Máximo de ${COMP_SET_MAX} concorrentes no CSV`,
    };
  }

  const rows: CompSetEntry[] = [];
  const now = new Date().toISOString();

  for (let i = 0; i < dataLines.length; i++) {
    const cells = splitCsvLine(dataLines[i]!);
    const nome = cells[idx.nome] ?? '';
    const notas =
      idx.notas >= 0 && cells[idx.notas] != null && String(cells[idx.notas]).trim()
        ? String(cells[idx.notas]).trim()
        : undefined;

    if (looksLikeScrapeUrl(nome) || (notas != null && looksLikeScrapeUrl(notas))) {
      return {
        ok: false,
        error: 'comp_set_csv_invalido',
        message: `Linha ${i + 2}: URLs / links OTA não são permitidos (cadastro manual apenas)`,
      };
    }

    const entry: CompSetEntry = {
      id: randomUUID(),
      nome,
      atualizadoEm: now,
    };

    const precoNoite = parseOptionalNumber(cells[idx.precoNoite] ?? '');
    const precoMin = parseOptionalNumber(cells[idx.precoMin] ?? '');
    const precoMax = parseOptionalNumber(cells[idx.precoMax] ?? '');
    if (precoNoite !== undefined) entry.precoNoite = precoNoite;
    if (precoMin !== undefined) entry.precoMin = precoMin;
    if (precoMax !== undefined) entry.precoMax = precoMax;
    if (notas) entry.notas = notas;
    rows.push(entry);
  }

  const validated = validateListingCompSet(rows);
  if (!validated.ok) {
    return {
      ok: false,
      error: validated.error,
      message: validated.message,
    };
  }

  return { ok: true, value: validated.value ?? [] };
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Export current comp-set as CSV (same header as import). */
export function formatCompSetCsv(entries: CompSetEntry[]): string {
  const header = 'nome,precoNoite,precoMin,precoMax,notas';
  const rows = entries.map((e) =>
    [
      escapeCsvField(e.nome),
      e.precoNoite != null ? String(e.precoNoite) : '',
      e.precoMin != null ? String(e.precoMin) : '',
      e.precoMax != null ? String(e.precoMax) : '',
      escapeCsvField(e.notas ?? ''),
    ].join(','),
  );
  return [header, ...rows].join('\n');
}
