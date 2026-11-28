/**
 * Carteira CSV — validação linha a linha (delimitadores `,` ou `;`).
 * Fatia 2 Lintel / staff carteira corretor.
 */

export type CarteiraCsvImportMode = 'carteira_vinculo' | 'contato_corretor';

export type CarteiraVinculoRow = { corretorId: number; proprietarioId: number };

export type ContatoCorretorRow = {
  nome: string;
  email: string;
  telefone: string;
  regiao?: 'MT' | 'GO';
};

export type CsvImportLineError = { line: number; reason: string };

export type CsvImportReport<T> = {
  totalLinhas: number;
  linhasValidas: number;
  linhasInvalidas: number;
  erros: CsvImportLineError[];
  preview: T[];
};

const MAX_LINES = 500;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function detectDelimiter(line: string): ',' | ';' {
  const semi = (line.match(/;/g) ?? []).length;
  const comma = (line.match(/,/g) ?? []).length;
  return semi > comma ? ';' : ',';
}

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function isVinculoHeader(parts: string[]): boolean {
  const joined = parts.join(' ').toLowerCase();
  return joined.includes('corretor') && joined.includes('propriet');
}

function isContatoHeader(parts: string[]): boolean {
  const joined = parts.join(' ').toLowerCase();
  return joined.includes('nome') && joined.includes('email');
}

function digitsOnlyPhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

function parseVinculoLine(
  parts: string[],
  lineNumber: number,
): { ok: true; row: CarteiraVinculoRow } | { ok: false; error: CsvImportLineError } {
  if (parts.length < 2) {
    return { ok: false, error: { line: lineNumber, reason: 'Esperado corretorId e proprietarioId' } };
  }
  const corretorId = Number(parts[0]);
  const proprietarioId = Number(parts[1]);
  if (
    !Number.isInteger(corretorId) ||
    !Number.isInteger(proprietarioId) ||
    corretorId <= 0 ||
    proprietarioId <= 0
  ) {
    return { ok: false, error: { line: lineNumber, reason: 'IDs devem ser inteiros positivos' } };
  }
  return { ok: true, row: { corretorId, proprietarioId } };
}

function parseContatoLine(
  parts: string[],
  lineNumber: number,
): { ok: true; row: ContatoCorretorRow } | { ok: false; error: CsvImportLineError } {
  if (parts.length < 3) {
    return { ok: false, error: { line: lineNumber, reason: 'Campos obrigatórios: Nome, Email, Telefone' } };
  }
  const nome = parts[0]?.trim() ?? '';
  const email = parts[1]?.trim() ?? '';
  const telefone = parts[2]?.trim() ?? '';
  const regiaoRaw = (parts[3]?.trim() ?? '').toUpperCase();

  if (nome.length < 2) {
    return { ok: false, error: { line: lineNumber, reason: 'Nome inválido ou ausente' } };
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: { line: lineNumber, reason: 'E-mail inválido' } };
  }
  const phoneDigits = digitsOnlyPhone(telefone);
  if (phoneDigits.length < 10) {
    return { ok: false, error: { line: lineNumber, reason: 'Telefone/WhatsApp com menos de 10 dígitos' } };
  }
  let regiao: 'MT' | 'GO' | undefined;
  if (regiaoRaw === 'MT' || regiaoRaw === 'GO') regiao = regiaoRaw;
  else if (regiaoRaw && regiaoRaw !== '') {
    return { ok: false, error: { line: lineNumber, reason: 'Região deve ser MT ou GO' } };
  }

  return {
    ok: true,
    row: { nome, email: email.toLowerCase(), telefone: phoneDigits, regiao },
  };
}

export function parseCarteiraCsvVinculo(csvText: string): CsvImportReport<CarteiraVinculoRow> {
  const lines = splitLines(csvText);
  if (lines.length === 0) {
    return {
      totalLinhas: 0,
      linhasValidas: 0,
      linhasInvalidas: 0,
      erros: [{ line: 0, reason: 'Arquivo vazio' }],
      preview: [],
    };
  }

  const delimiter = detectDelimiter(lines[0] ?? '');
  const erros: CsvImportLineError[] = [];
  const preview: CarteiraVinculoRow[] = [];
  let startIdx = 0;
  const firstParts = (lines[0] ?? '').split(delimiter).map((p) => p.trim());
  if (isVinculoHeader(firstParts)) startIdx = 1;

  const dataLines = lines.slice(startIdx);
  if (dataLines.length > MAX_LINES) {
    return {
      totalLinhas: dataLines.length,
      linhasValidas: 0,
      linhasInvalidas: dataLines.length,
      erros: [{ line: 0, reason: `Máximo ${MAX_LINES} linhas por lote` }],
      preview: [],
    };
  }

  for (let i = 0; i < dataLines.length; i++) {
    const lineNumber = startIdx + i + 1;
    const parts = dataLines[i]!.split(delimiter).map((p) => p.trim());
    const parsed = parseVinculoLine(parts, lineNumber);
    if (parsed.ok) preview.push(parsed.row);
    else erros.push(parsed.error);
  }

  return {
    totalLinhas: dataLines.length,
    linhasValidas: preview.length,
    linhasInvalidas: erros.length,
    erros,
    preview,
  };
}

export function parseCarteiraCsvContato(csvText: string): CsvImportReport<ContatoCorretorRow> {
  const lines = splitLines(csvText);
  if (lines.length === 0) {
    return {
      totalLinhas: 0,
      linhasValidas: 0,
      linhasInvalidas: 0,
      erros: [{ line: 0, reason: 'Arquivo vazio' }],
      preview: [],
    };
  }

  const delimiter = detectDelimiter(lines[0] ?? '');
  const erros: CsvImportLineError[] = [];
  const preview: ContatoCorretorRow[] = [];
  let startIdx = 0;
  const firstParts = (lines[0] ?? '').split(delimiter).map((p) => p.trim());
  if (isContatoHeader(firstParts)) startIdx = 1;

  const dataLines = lines.slice(startIdx);
  if (dataLines.length > MAX_LINES) {
    return {
      totalLinhas: dataLines.length,
      linhasValidas: 0,
      linhasInvalidas: dataLines.length,
      erros: [{ line: 0, reason: `Máximo ${MAX_LINES} linhas por lote` }],
      preview: [],
    };
  }

  for (let i = 0; i < dataLines.length; i++) {
    const lineNumber = startIdx + i + 1;
    const parts = dataLines[i]!.split(delimiter).map((p) => p.trim());
    const parsed = parseContatoLine(parts, lineNumber);
    if (parsed.ok) preview.push(parsed.row);
    else erros.push(parsed.error);
  }

  return {
    totalLinhas: dataLines.length,
    linhasValidas: preview.length,
    linhasInvalidas: erros.length,
    erros,
    preview,
  };
}

export function parseCarteiraCsv(
  csvText: string,
  mode: CarteiraCsvImportMode = 'carteira_vinculo',
): CsvImportReport<CarteiraVinculoRow | ContatoCorretorRow> {
  if (mode === 'contato_corretor') return parseCarteiraCsvContato(csvText);
  return parseCarteiraCsvVinculo(csvText);
}