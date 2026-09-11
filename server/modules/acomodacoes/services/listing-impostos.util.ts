/**
 * Fiscal cadastro on listing metadata (metadata.impostos — top-level).
 * Never log inscricaoMunicipal or notas contents in error paths.
 */

export const IMPOSTOS_INSCRICAO_MAX = 40;
export const IMPOSTOS_NOTAS_MAX = 500;
export const IMPOSTOS_ALIQUOTA_MIN = 0;
export const IMPOSTOS_ALIQUOTA_MAX = 100;

export type ListingImpostos = {
  inscricaoMunicipal?: string;
  aliquotaPct?: number;
  isento?: boolean;
  notas?: string;
};

export type ImpostosValidationOk = { ok: true; value: ListingImpostos | undefined };
export type ImpostosValidationErr = {
  ok: false;
  error: 'impostos_invalido';
  message: string;
};

const IMPOSTOS_KEYS = new Set(['inscricaoMunicipal', 'aliquotaPct', 'isento', 'notas']);
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const INSCRICAO_DISALLOWED = /[^\p{L}\p{N}\s.,\-/()]/gu;

function sanitizeInscricao(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(CONTROL_CHARS, '')
    .replace(INSCRICAO_DISALLOWED, '')
    .trim()
    .slice(0, IMPOSTOS_INSCRICAO_MAX);
}

function sanitizeNotas(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(CONTROL_CHARS, '').trim().slice(0, IMPOSTOS_NOTAS_MAX);
}

function coerceBoolean(raw: unknown): boolean | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'boolean') return raw;
  if (raw === 'true' || raw === 1 || raw === '1') return true;
  if (raw === 'false' || raw === 0 || raw === '0') return false;
  return undefined;
}

function hasAtMostTwoDecimals(n: number): boolean {
  return Math.abs(Math.round(n * 100) - n * 100) < 1e-9;
}

function normalizeAliquota(raw: unknown): number | undefined | 'invalid' {
  if (raw == null || raw === '') return undefined;
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'));
  if (!Number.isFinite(n)) return 'invalid';
  if (n < IMPOSTOS_ALIQUOTA_MIN || n > IMPOSTOS_ALIQUOTA_MAX) return 'invalid';
  if (!hasAtMostTwoDecimals(n)) return 'invalid';
  return Math.round(n * 100) / 100;
}

function formatAliquotaPct(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : String(rounded);
  return `${text}%`;
}

export function validateListingImpostos(
  raw: unknown,
): ImpostosValidationOk | ImpostosValidationErr {
  if (raw == null) {
    return { ok: true, value: undefined };
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      error: 'impostos_invalido',
      message: 'Cadastro fiscal inválido',
    };
  }

  const src = raw as Record<string, unknown>;
  for (const key of Object.keys(src)) {
    if (!IMPOSTOS_KEYS.has(key)) {
      return {
        ok: false,
        error: 'impostos_invalido',
        message: `Impostos: chave desconhecida "${key}"`,
      };
    }
  }

  const value: ListingImpostos = {};
  let isento = false;

  if (Object.prototype.hasOwnProperty.call(src, 'isento')) {
    const parsed = coerceBoolean(src.isento);
    if (parsed === undefined) {
      return {
        ok: false,
        error: 'impostos_invalido',
        message: 'isento deve ser boolean',
      };
    }
    isento = parsed;
    if (isento) value.isento = true;
  }

  if (Object.prototype.hasOwnProperty.call(src, 'inscricaoMunicipal')) {
    if (typeof src.inscricaoMunicipal !== 'string' && src.inscricaoMunicipal != null) {
      return {
        ok: false,
        error: 'impostos_invalido',
        message: 'Inscrição municipal inválida',
      };
    }
    const text = typeof src.inscricaoMunicipal === 'string' ? src.inscricaoMunicipal : '';
    if (text.length > IMPOSTOS_INSCRICAO_MAX) {
      return {
        ok: false,
        error: 'impostos_invalido',
        message: `Inscrição municipal deve ter no máximo ${IMPOSTOS_INSCRICAO_MAX} caracteres`,
      };
    }
    const cleaned = sanitizeInscricao(text);
    if (cleaned) value.inscricaoMunicipal = cleaned;
  }

  if (Object.prototype.hasOwnProperty.call(src, 'aliquotaPct') && !isento) {
    if (typeof src.aliquotaPct !== 'number' && typeof src.aliquotaPct !== 'string') {
      if (src.aliquotaPct != null && src.aliquotaPct !== '') {
        return {
          ok: false,
          error: 'impostos_invalido',
          message: 'Alíquota inválida',
        };
      }
    }
    const aliquota = normalizeAliquota(src.aliquotaPct);
    if (aliquota === 'invalid') {
      return {
        ok: false,
        error: 'impostos_invalido',
        message: 'Alíquota deve ser entre 0 e 100 com no máximo 2 casas decimais',
      };
    }
    if (aliquota !== undefined) value.aliquotaPct = aliquota;
  }

  if (Object.prototype.hasOwnProperty.call(src, 'notas')) {
    if (typeof src.notas !== 'string' && src.notas != null) {
      return {
        ok: false,
        error: 'impostos_invalido',
        message: 'Notas fiscais inválidas',
      };
    }
    const text = typeof src.notas === 'string' ? src.notas : '';
    if (text.length > IMPOSTOS_NOTAS_MAX) {
      return {
        ok: false,
        error: 'impostos_invalido',
        message: `Notas devem ter no máximo ${IMPOSTOS_NOTAS_MAX} caracteres`,
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

/** Card preview for fiscal cadastro section. */
export function summarizeImpostos(
  impostos: ListingImpostos | null | undefined,
): string {
  if (!impostos || typeof impostos !== 'object') {
    return 'Adicionar informações';
  }

  if (impostos.isento === true) {
    return 'Isento';
  }

  if (
    typeof impostos.aliquotaPct === 'number' &&
    Number.isFinite(impostos.aliquotaPct)
  ) {
    return formatAliquotaPct(impostos.aliquotaPct);
  }

  const inscricao =
    typeof impostos.inscricaoMunicipal === 'string'
      ? impostos.inscricaoMunicipal.trim()
      : '';
  const hasNotas =
    typeof impostos.notas === 'string' && impostos.notas.trim().length > 0;

  if (inscricao && !hasNotas) {
    return 'Inscrição cadastrada';
  }

  if (inscricao) {
    return 'Inscrição cadastrada';
  }

  return 'Adicionar informações';
}
