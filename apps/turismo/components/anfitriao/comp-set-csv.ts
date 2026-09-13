/**
 * Client-side comp-set CSV helpers (manual prices only — no OTA scrape).
 * Server re-validates on PATCH metadata.compSet via validateListingCompSet.
 */

export type CompSetCsvEntry = {
  id: string;
  nome: string;
  precoNoite?: number;
  precoMin?: number;
  precoMax?: number;
  notas?: string;
  atualizadoEm?: string;
};

export type ParseCompSetCsvClientResult =
  | { ok: true; value: CompSetCsvEntry[] }
  | { ok: false; message: string };

const MAX = 8;
const SCRAPE_URL_RE =
  /https?:\/\/|www\.|booking\.com|airbnb\.|vrbo\.|expedia\.|tripadvisor\./i;

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n * 100) / 100;
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function parseCompSetCsvClient(text: string): ParseCompSetCsvClientResult {
  const normalized = String(text ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  if (!normalized) {
    return { ok: false, message: 'CSV vazio' };
  }

  const lines = normalized.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return {
      ok: false,
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
      message: 'Cabeçalho esperado: nome,precoNoite,precoMin,precoMax (notas opcional)',
    };
  }

  const dataLines = lines.slice(1);
  if (dataLines.length > MAX) {
    return { ok: false, message: `Máximo de ${MAX} concorrentes no CSV` };
  }

  const rows: CompSetCsvEntry[] = [];
  const now = new Date().toISOString();

  for (let i = 0; i < dataLines.length; i++) {
    const cells = splitCsvLine(dataLines[i]!);
    const nome = (cells[idx.nome] ?? '').trim();
    const notasRaw =
      idx.notas >= 0 && cells[idx.notas] != null ? String(cells[idx.notas]).trim() : '';

    if (!nome) {
      return { ok: false, message: `Linha ${i + 2}: nome obrigatório` };
    }
    if (SCRAPE_URL_RE.test(nome) || (notasRaw && SCRAPE_URL_RE.test(notasRaw))) {
      return {
        ok: false,
        message: `Linha ${i + 2}: URLs / links OTA não são permitidos (cadastro manual apenas)`,
      };
    }

    const precoNoite = parseOptionalNumber(cells[idx.precoNoite] ?? '');
    const precoMin = parseOptionalNumber(cells[idx.precoMin] ?? '');
    const precoMax = parseOptionalNumber(cells[idx.precoMax] ?? '');
    if (precoNoite == null && precoMin == null && precoMax == null) {
      return {
        ok: false,
        message: `Linha ${i + 2}: informe preço por noite ou faixa (mín/máx)`,
      };
    }
    if (precoMin != null && precoMax != null && precoMin > precoMax) {
      return {
        ok: false,
        message: `Linha ${i + 2}: mínimo não pode ser maior que o máximo`,
      };
    }

    const entry: CompSetCsvEntry = { id: newId(), nome, atualizadoEm: now };
    if (precoNoite != null) entry.precoNoite = precoNoite;
    if (precoMin != null) entry.precoMin = precoMin;
    if (precoMax != null) entry.precoMax = precoMax;
    if (notasRaw) entry.notas = notasRaw.slice(0, 120);
    rows.push(entry);
  }

  return { ok: true, value: rows };
}

export function formatCompSetCsvClient(entries: CompSetCsvEntry[]): string {
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
