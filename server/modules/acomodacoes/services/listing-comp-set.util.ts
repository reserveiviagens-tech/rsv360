/**
 * Manual competitor set on listing metadata (metadata.compSet[]).
 * Host-entered reference prices only — no OTA scrape.
 */

export const COMP_SET_MAX = 8;
export const COMP_SET_NOME_MAX = 60;
export const COMP_SET_NOTAS_MAX = 120;
export const COMP_SET_PRECO_MAX = 1_000_000;

export type CompSetEntry = {
  id: string;
  nome: string;
  precoNoite?: number;
  precoMin?: number;
  precoMax?: number;
  notas?: string;
  atualizadoEm?: string;
};

export type CompSetValidationOk = { ok: true; value: CompSetEntry[] | undefined };
export type CompSetValidationErr = {
  ok: false;
  error: 'comp_set_invalido';
  message: string;
};

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ENTRY_KEYS = new Set([
  'id',
  'nome',
  'precoNoite',
  'precoMin',
  'precoMax',
  'notas',
  'atualizadoEm',
]);

function parseOptionalMoney(raw: unknown): number | undefined {
  if (raw == null || raw === '') return undefined;
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > COMP_SET_PRECO_MAX) return undefined;
  return Math.round(n * 100) / 100;
}

function sanitizeNome(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const nome = raw.replace(CONTROL_CHARS, '').trim().slice(0, COMP_SET_NOME_MAX);
  return nome.length > 0 ? nome : null;
}

function referencePrice(entry: CompSetEntry): number | null {
  if (typeof entry.precoNoite === 'number' && Number.isFinite(entry.precoNoite)) {
    return entry.precoNoite;
  }
  const min = entry.precoMin;
  const max = entry.precoMax;
  if (typeof min === 'number' && typeof max === 'number') {
    return Math.round(((min + max) / 2) * 100) / 100;
  }
  if (typeof min === 'number') return min;
  if (typeof max === 'number') return max;
  return null;
}

/** Midpoint / nightly reference for overlay vs own price. */
export function summarizeCompSet(entries: CompSetEntry[]): {
  count: number;
  mediaReferencia: number | null;
} {
  const prices = entries
    .map(referencePrice)
    .filter((n): n is number => n != null && Number.isFinite(n));
  if (prices.length === 0) return { count: entries.length, mediaReferencia: null };
  const sum = prices.reduce((a, b) => a + b, 0);
  return {
    count: entries.length,
    mediaReferencia: Math.round((sum / prices.length) * 100) / 100,
  };
}

export function readCompSetFromMetadata(metadata: unknown): CompSetEntry[] {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return [];
  const raw = (metadata as Record<string, unknown>).compSet;
  if (!Array.isArray(raw)) return [];
  const parsed = validateListingCompSet(raw);
  return parsed.ok && parsed.value ? parsed.value : [];
}

export function validateListingCompSet(
  raw: unknown,
): CompSetValidationOk | CompSetValidationErr {
  if (raw == null) {
    return { ok: true, value: undefined };
  }
  if (!Array.isArray(raw)) {
    return {
      ok: false,
      error: 'comp_set_invalido',
      message: 'Comp-set deve ser uma lista',
    };
  }
  if (raw.length > COMP_SET_MAX) {
    return {
      ok: false,
      error: 'comp_set_invalido',
      message: `Máximo de ${COMP_SET_MAX} concorrentes manuais`,
    };
  }

  const seen = new Set<string>();
  const value: CompSetEntry[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return {
        ok: false,
        error: 'comp_set_invalido',
        message: 'Entrada de concorrente inválida',
      };
    }
    const src = item as Record<string, unknown>;
    for (const key of Object.keys(src)) {
      if (!ENTRY_KEYS.has(key)) {
        return {
          ok: false,
          error: 'comp_set_invalido',
          message: `Campo não permitido: ${key}`,
        };
      }
    }

    const id = typeof src.id === 'string' ? src.id.trim() : '';
    if (!UUID_RE.test(id)) {
      return {
        ok: false,
        error: 'comp_set_invalido',
        message: 'ID do concorrente inválido',
      };
    }
    if (seen.has(id.toLowerCase())) {
      return {
        ok: false,
        error: 'comp_set_invalido',
        message: 'IDs de concorrentes duplicados',
      };
    }
    seen.add(id.toLowerCase());

    const nome = sanitizeNome(src.nome);
    if (!nome) {
      return {
        ok: false,
        error: 'comp_set_invalido',
        message: 'Nome do concorrente obrigatório',
      };
    }

    const precoNoite = parseOptionalMoney(src.precoNoite);
    const precoMin = parseOptionalMoney(src.precoMin);
    const precoMax = parseOptionalMoney(src.precoMax);
    if (precoNoite === undefined && precoMin === undefined && precoMax === undefined) {
      return {
        ok: false,
        error: 'comp_set_invalido',
        message: 'Informe preço por noite ou faixa (mín/máx)',
      };
    }
    if (
      precoMin !== undefined &&
      precoMax !== undefined &&
      precoMin > precoMax
    ) {
      return {
        ok: false,
        error: 'comp_set_invalido',
        message: 'precoMin não pode ser maior que precoMax',
      };
    }

    let notas: string | undefined;
    if (src.notas != null && src.notas !== '') {
      if (typeof src.notas !== 'string') {
        return {
          ok: false,
          error: 'comp_set_invalido',
          message: 'Notas inválidas',
        };
      }
      notas = src.notas.replace(CONTROL_CHARS, '').trim().slice(0, COMP_SET_NOTAS_MAX);
      if (!notas) notas = undefined;
    }

    let atualizadoEm: string | undefined;
    if (typeof src.atualizadoEm === 'string' && src.atualizadoEm.trim()) {
      atualizadoEm = src.atualizadoEm.trim().slice(0, 40);
    }

    const entry: CompSetEntry = { id, nome };
    if (precoNoite !== undefined) entry.precoNoite = precoNoite;
    if (precoMin !== undefined) entry.precoMin = precoMin;
    if (precoMax !== undefined) entry.precoMax = precoMax;
    if (notas) entry.notas = notas;
    if (atualizadoEm) entry.atualizadoEm = atualizadoEm;
    value.push(entry);
  }

  return { ok: true, value: value.length > 0 ? value : undefined };
}
