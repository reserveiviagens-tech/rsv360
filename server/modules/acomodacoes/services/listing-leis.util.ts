/**
 * Local laws cadastro on listing metadata (metadata.leis — top-level).
 * Never log licencaNumero or notas in error paths.
 */

export const LEIS_LICENCA_MAX = 40;
export const LEIS_ZONEAMENTO_MAX = 80;
export const LEIS_NOTAS_MAX = 500;

export type ListingLeis = {
  declaracaoAceita?: boolean;
  licencaNumero?: string;
  zoneamento?: string;
  notas?: string;
};

export type LeisValidationOk = { ok: true; value: ListingLeis | undefined };
export type LeisValidationErr = {
  ok: false;
  error: 'leis_invalido';
  message: string;
};

const LEIS_KEYS = new Set([
  'declaracaoAceita',
  'licencaNumero',
  'zoneamento',
  'notas',
]);
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const LICENCA_DISALLOWED = /[^\p{L}\p{N}\s.,\-/()]/gu;

function sanitizeLicenca(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(CONTROL_CHARS, '')
    .replace(LICENCA_DISALLOWED, '')
    .trim()
    .slice(0, LEIS_LICENCA_MAX);
}

function sanitizeZoneamento(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(CONTROL_CHARS, '').trim().slice(0, LEIS_ZONEAMENTO_MAX);
}

function sanitizeNotas(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(CONTROL_CHARS, '').trim().slice(0, LEIS_NOTAS_MAX);
}

function coerceBoolean(raw: unknown): boolean | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'boolean') return raw;
  if (raw === 'true' || raw === 1 || raw === '1') return true;
  if (raw === 'false' || raw === 0 || raw === '0') return false;
  return undefined;
}

export function validateListingLeis(
  raw: unknown,
): LeisValidationOk | LeisValidationErr {
  if (raw == null) {
    return { ok: true, value: undefined };
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      error: 'leis_invalido',
      message: 'Cadastro de leis locais inválido',
    };
  }

  const src = raw as Record<string, unknown>;
  for (const key of Object.keys(src)) {
    if (!LEIS_KEYS.has(key)) {
      return {
        ok: false,
        error: 'leis_invalido',
        message: `Leis locais: chave desconhecida "${key}"`,
      };
    }
  }

  const value: ListingLeis = {};

  if (Object.prototype.hasOwnProperty.call(src, 'declaracaoAceita')) {
    const parsed = coerceBoolean(src.declaracaoAceita);
    if (parsed === undefined) {
      return {
        ok: false,
        error: 'leis_invalido',
        message: 'declaracaoAceita deve ser boolean',
      };
    }
    if (parsed) value.declaracaoAceita = true;
  }

  if (Object.prototype.hasOwnProperty.call(src, 'licencaNumero')) {
    if (typeof src.licencaNumero !== 'string' && src.licencaNumero != null) {
      return {
        ok: false,
        error: 'leis_invalido',
        message: 'Número de licença inválido',
      };
    }
    const text = typeof src.licencaNumero === 'string' ? src.licencaNumero : '';
    if (text.length > LEIS_LICENCA_MAX) {
      return {
        ok: false,
        error: 'leis_invalido',
        message: `Número de licença deve ter no máximo ${LEIS_LICENCA_MAX} caracteres`,
      };
    }
    const cleaned = sanitizeLicenca(text);
    if (cleaned) value.licencaNumero = cleaned;
  }

  if (Object.prototype.hasOwnProperty.call(src, 'zoneamento')) {
    if (typeof src.zoneamento !== 'string' && src.zoneamento != null) {
      return {
        ok: false,
        error: 'leis_invalido',
        message: 'Zoneamento inválido',
      };
    }
    const text = typeof src.zoneamento === 'string' ? src.zoneamento : '';
    if (text.length > LEIS_ZONEAMENTO_MAX) {
      return {
        ok: false,
        error: 'leis_invalido',
        message: `Zoneamento deve ter no máximo ${LEIS_ZONEAMENTO_MAX} caracteres`,
      };
    }
    const cleaned = sanitizeZoneamento(text);
    if (cleaned) value.zoneamento = cleaned;
  }

  if (Object.prototype.hasOwnProperty.call(src, 'notas')) {
    if (typeof src.notas !== 'string' && src.notas != null) {
      return {
        ok: false,
        error: 'leis_invalido',
        message: 'Notas inválidas',
      };
    }
    const text = typeof src.notas === 'string' ? src.notas : '';
    if (text.length > LEIS_NOTAS_MAX) {
      return {
        ok: false,
        error: 'leis_invalido',
        message: `Notas devem ter no máximo ${LEIS_NOTAS_MAX} caracteres`,
      };
    }
    const cleaned = sanitizeNotas(text);
    if (cleaned) value.notas = cleaned;
  }

  return {
    ok: true,
    value: Object.keys(value).length ? value : undefined,
  };
}

/** Card preview for local laws section. Never exposes licencaNumero or notas contents. */
export function summarizeLeisLocais(
  leis: ListingLeis | null | undefined,
): string {
  if (!leis || typeof leis !== 'object') {
    return 'Adicionar informações';
  }

  if (leis.declaracaoAceita === true) {
    return 'Declaração aceita';
  }

  const licenca =
    typeof leis.licencaNumero === 'string' ? leis.licencaNumero.trim() : '';
  if (licenca) {
    return 'Licença cadastrada';
  }

  const zoneamento =
    typeof leis.zoneamento === 'string' ? leis.zoneamento.trim() : '';
  if (zoneamento) {
    return 'Zoneamento informado';
  }

  const hasNotas =
    typeof leis.notas === 'string' && leis.notas.trim().length > 0;
  if (hasNotas) {
    return 'Informações adicionais';
  }

  return 'Adicionar informações';
}
