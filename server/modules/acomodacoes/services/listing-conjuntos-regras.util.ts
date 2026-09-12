/**
 * Named rule-set presets on listing metadata (metadata.conjuntosRegras[]).
 * When applying: precoPorNoite takes precedence over ajustePct (documented in summarize + apply).
 */

export const CONJUNTOS_REGRAS_MAX = 20;
export const CONJUNTO_NOME_MAX = 60;
export const CONJUNTO_AJUSTE_PCT_MIN = -50;
export const CONJUNTO_AJUSTE_PCT_MAX = 50;

export const CONJUNTO_COR_TOKENS = ['slate', 'amber', 'emerald', 'sky', 'rose'] as const;
export type ConjuntoCorToken = (typeof CONJUNTO_COR_TOKENS)[number];

export const CONJUNTO_COR_HEX: Record<ConjuntoCorToken, string> = {
  slate: '#64748b',
  amber: '#f59e0b',
  emerald: '#10b981',
  sky: '#0ea5e9',
  rose: '#f43f5e',
};

export type ConjuntoRegras = {
  id: string;
  nome: string;
  cor: string;
  precoPorNoite?: number;
  ajustePct?: number;
  minNoites?: number;
  maxNoites?: number;
  checkinDiasBloqueados?: number[];
};

export type ConjuntosRegrasValidationOk = { ok: true; value: ConjuntoRegras[] | undefined };
export type ConjuntosRegrasValidationErr = {
  ok: false;
  error: 'conjuntos_regras_invalido';
  message: string;
};

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CONJUNTO_KEYS = new Set([
  'id',
  'nome',
  'cor',
  'precoPorNoite',
  'ajustePct',
  'minNoites',
  'maxNoites',
  'checkinDiasBloqueados',
]);

function isAllowedCor(raw: string): boolean {
  const trimmed = raw.trim().toLowerCase();
  if ((CONJUNTO_COR_TOKENS as readonly string[]).includes(trimmed)) return true;
  const hex = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return Object.values(CONJUNTO_COR_HEX).includes(hex);
}

function normalizeCor(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if ((CONJUNTO_COR_TOKENS as readonly string[]).includes(trimmed)) return trimmed;
  const hex = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  const token = (CONJUNTO_COR_TOKENS as readonly string[]).find(
    (t) => CONJUNTO_COR_HEX[t as ConjuntoCorToken] === hex,
  );
  return token ?? hex;
}

function parseOptionalMoney(raw: unknown): number | undefined {
  if (raw == null || raw === '') return undefined;
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n * 100) / 100;
}

function parseOptionalPct(raw: unknown): number | undefined {
  if (raw == null || raw === '') return undefined;
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'));
  if (!Number.isFinite(n)) return undefined;
  if (n < CONJUNTO_AJUSTE_PCT_MIN || n > CONJUNTO_AJUSTE_PCT_MAX) return undefined;
  return Math.round(n * 10) / 10;
}

function parseOptionalInt(raw: unknown, min = 1): number | undefined {
  if (raw == null || raw === '') return undefined;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isInteger(n) || n < min) return undefined;
  return n;
}

function parseWeekdayList(raw: unknown): number[] | undefined {
  if (raw == null) return undefined;
  if (!Array.isArray(raw)) return undefined;
  const out: number[] = [];
  for (const item of raw) {
    const n = typeof item === 'number' ? item : Number(item);
    if (!Number.isInteger(n) || n < 0 || n > 6) return undefined;
    if (!out.includes(n)) out.push(n);
  }
  out.sort((a, b) => a - b);
  return out.length ? out : undefined;
}

function validateOne(
  raw: unknown,
  index: number,
): { ok: true; value: ConjuntoRegras } | ConjuntosRegrasValidationErr {
  if (typeof raw !== 'object' || raw == null || Array.isArray(raw)) {
    return {
      ok: false,
      error: 'conjuntos_regras_invalido',
      message: `Conjunto ${index + 1}: formato inválido`,
    };
  }
  const src = raw as Record<string, unknown>;
  for (const key of Object.keys(src)) {
    if (!CONJUNTO_KEYS.has(key)) {
      return {
        ok: false,
        error: 'conjuntos_regras_invalido',
        message: `Conjunto ${index + 1}: chave desconhecida "${key}"`,
      };
    }
  }

  const id = typeof src.id === 'string' ? src.id.trim() : '';
  if (!UUID_RE.test(id)) {
    return {
      ok: false,
      error: 'conjuntos_regras_invalido',
      message: `Conjunto ${index + 1}: id UUID inválido`,
    };
  }

  const nomeRaw = typeof src.nome === 'string' ? src.nome : '';
  const nome = nomeRaw.replace(CONTROL_CHARS, '').trim().slice(0, CONJUNTO_NOME_MAX);
  if (!nome) {
    return {
      ok: false,
      error: 'conjuntos_regras_invalido',
      message: `Conjunto ${index + 1}: nome é obrigatório`,
    };
  }
  if (nomeRaw.length > CONJUNTO_NOME_MAX) {
    return {
      ok: false,
      error: 'conjuntos_regras_invalido',
      message: `Conjunto ${index + 1}: nome deve ter no máximo ${CONJUNTO_NOME_MAX} caracteres`,
    };
  }

  const corRaw = typeof src.cor === 'string' ? src.cor.trim() : '';
  if (!corRaw || !isAllowedCor(corRaw)) {
    return {
      ok: false,
      error: 'conjuntos_regras_invalido',
      message: `Conjunto ${index + 1}: cor inválida`,
    };
  }

  const value: ConjuntoRegras = {
    id,
    nome,
    cor: normalizeCor(corRaw),
  };

  if (Object.prototype.hasOwnProperty.call(src, 'precoPorNoite')) {
    const preco = parseOptionalMoney(src.precoPorNoite);
    if (src.precoPorNoite != null && src.precoPorNoite !== '' && preco === undefined) {
      return {
        ok: false,
        error: 'conjuntos_regras_invalido',
        message: `Conjunto ${index + 1}: preço por noite inválido`,
      };
    }
    if (preco !== undefined) value.precoPorNoite = preco;
  }

  if (Object.prototype.hasOwnProperty.call(src, 'ajustePct')) {
    const pct = parseOptionalPct(src.ajustePct);
    if (src.ajustePct != null && src.ajustePct !== '' && pct === undefined) {
      return {
        ok: false,
        error: 'conjuntos_regras_invalido',
        message: `Conjunto ${index + 1}: ajuste percentual deve estar entre ${CONJUNTO_AJUSTE_PCT_MIN} e ${CONJUNTO_AJUSTE_PCT_MAX}`,
      };
    }
    if (pct !== undefined) value.ajustePct = pct;
  }

  if (Object.prototype.hasOwnProperty.call(src, 'minNoites')) {
    const min = parseOptionalInt(src.minNoites);
    if (src.minNoites != null && src.minNoites !== '' && min === undefined) {
      return {
        ok: false,
        error: 'conjuntos_regras_invalido',
        message: `Conjunto ${index + 1}: mínimo de noites inválido`,
      };
    }
    if (min !== undefined) value.minNoites = min;
  }

  if (Object.prototype.hasOwnProperty.call(src, 'maxNoites')) {
    const max = parseOptionalInt(src.maxNoites);
    if (src.maxNoites != null && src.maxNoites !== '' && max === undefined) {
      return {
        ok: false,
        error: 'conjuntos_regras_invalido',
        message: `Conjunto ${index + 1}: máximo de noites inválido`,
      };
    }
    if (max !== undefined) value.maxNoites = max;
  }

  if (
    value.minNoites != null &&
    value.maxNoites != null &&
    value.minNoites > value.maxNoites
  ) {
    return {
      ok: false,
      error: 'conjuntos_regras_invalido',
      message: `Conjunto ${index + 1}: mínimo de noites não pode exceder o máximo`,
    };
  }

  if (Object.prototype.hasOwnProperty.call(src, 'checkinDiasBloqueados')) {
    const dias = parseWeekdayList(src.checkinDiasBloqueados);
    if (src.checkinDiasBloqueados != null && dias === undefined) {
      return {
        ok: false,
        error: 'conjuntos_regras_invalido',
        message: `Conjunto ${index + 1}: dias de check-in bloqueados inválidos (0=Dom … 6=Sáb)`,
      };
    }
    if (dias) value.checkinDiasBloqueados = dias;
  }

  return { ok: true, value };
}

export function validateListingConjuntosRegras(
  raw: unknown,
): ConjuntosRegrasValidationOk | ConjuntosRegrasValidationErr {
  if (raw == null) {
    return { ok: true, value: undefined };
  }
  if (!Array.isArray(raw)) {
    return {
      ok: false,
      error: 'conjuntos_regras_invalido',
      message: 'Conjuntos de regras deve ser um array',
    };
  }
  if (raw.length > CONJUNTOS_REGRAS_MAX) {
    return {
      ok: false,
      error: 'conjuntos_regras_invalido',
      message: `Máximo ${CONJUNTOS_REGRAS_MAX} conjuntos de regras`,
    };
  }

  const value: ConjuntoRegras[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < raw.length; i += 1) {
    const parsed = validateOne(raw[i], i);
    if (!parsed.ok) return parsed;
    if (seenIds.has(parsed.value.id)) {
      return {
        ok: false,
        error: 'conjuntos_regras_invalido',
        message: 'IDs de conjuntos de regras devem ser únicos',
      };
    }
    seenIds.add(parsed.value.id);
    value.push(parsed.value);
  }

  return { ok: true, value: value.length ? value : undefined };
}

export function readConjuntosRegrasFromMetadata(metadata: unknown): ConjuntoRegras[] {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return [];
  const raw = (metadata as Record<string, unknown>).conjuntosRegras;
  const validated = validateListingConjuntosRegras(raw);
  if (!validated.ok || !validated.value) return [];
  return validated.value;
}

/** Resolve token or hex to display hex. */
export function resolveConjuntoCorHex(cor: string): string {
  const normalized = cor.trim().toLowerCase();
  if ((CONJUNTO_COR_TOKENS as readonly string[]).includes(normalized)) {
    return CONJUNTO_COR_HEX[normalized as ConjuntoCorToken];
  }
  return cor.startsWith('#') ? cor : `#${cor}`;
}

/** Card / list preview — notes absolute price priority over pct when both set. */
export function summarizeConjuntoRegras(conjunto: ConjuntoRegras): string {
  const parts: string[] = [conjunto.nome];
  if (conjunto.precoPorNoite != null) {
    parts.push(`R$${conjunto.precoPorNoite}/noite`);
  } else if (conjunto.ajustePct != null && conjunto.ajustePct !== 0) {
    const sign = conjunto.ajustePct > 0 ? '+' : '';
    parts.push(`${sign}${conjunto.ajustePct}%`);
  }
  if (conjunto.minNoites != null) parts.push(`mín ${conjunto.minNoites}n`);
  if (conjunto.maxNoites != null) parts.push(`máx ${conjunto.maxNoites}n`);
  if (conjunto.checkinDiasBloqueados?.length) {
    parts.push(`${conjunto.checkinDiasBloqueados.length} dia(s) check-in bloq.`);
  }
  return parts.join(' · ');
}
