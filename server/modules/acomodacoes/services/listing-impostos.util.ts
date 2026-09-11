/**
 * Fiscal cadastro on listing metadata (metadata.impostos — top-level).
 * Never log inscricaoMunicipal, notas or cnpj in error paths.
 */

export const IMPOSTOS_INSCRICAO_MAX = 40;
export const IMPOSTOS_NOTAS_MAX = 500;
export const IMPOSTOS_ALIQUOTA_MIN = 0;
export const IMPOSTOS_ALIQUOTA_MAX = 100;
export const IMPOSTOS_CNPJ_LEN = 14;

export type ListingImpostos = {
  inscricaoMunicipal?: string;
  aliquotaPct?: number;
  isento?: boolean;
  notas?: string;
  cnpj?: string;
};

export type ImpostosValidationOk = { ok: true; value: ListingImpostos | undefined };
export type ImpostosValidationErr = {
  ok: false;
  error: 'impostos_invalido';
  message: string;
};

const IMPOSTOS_KEYS = new Set([
  'inscricaoMunicipal',
  'aliquotaPct',
  'isento',
  'notas',
  'cnpj',
]);
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

function stripCnpjDigits(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/\D/g, '');
}

/** LGPD-safe preview — never expose full CNPJ digits. */
export function maskCnpj(digits: string): string {
  const d = digits.replace(/\D/g, '');
  if (d.length !== IMPOSTOS_CNPJ_LEN) {
    return '**.***.***/****-**';
  }
  return `**.***.***/****-${d.slice(12)}`;
}

function isValidCnpjChecksum(digits: string): boolean {
  if (digits.length !== IMPOSTOS_CNPJ_LEN) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const calcCheck = (base: string): number => {
    let sum = 0;
    let pos = base.length - 7;
    for (let i = base.length; i >= 1; i--) {
      sum += parseInt(base.charAt(base.length - i), 10) * pos;
      pos -= 1;
      if (pos < 2) pos = 9;
    }
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const base12 = digits.slice(0, 12);
  const d1 = calcCheck(base12);
  if (d1 !== parseInt(digits.charAt(12), 10)) return false;
  const d2 = calcCheck(base12 + String(d1));
  return d2 === parseInt(digits.charAt(13), 10);
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

  if (Object.prototype.hasOwnProperty.call(src, 'cnpj')) {
    if (typeof src.cnpj !== 'string' && src.cnpj != null) {
      return {
        ok: false,
        error: 'impostos_invalido',
        message: 'CNPJ inválido',
      };
    }
    const rawText = typeof src.cnpj === 'string' ? src.cnpj : '';
    const digits = stripCnpjDigits(rawText);
    if (digits.length === 0) {
      if (/[a-zA-Z]/.test(rawText)) {
        return {
          ok: false,
          error: 'impostos_invalido',
          message: 'CNPJ inválido',
        };
      }
    } else if (digits.length !== IMPOSTOS_CNPJ_LEN) {
      return {
        ok: false,
        error: 'impostos_invalido',
        message: 'CNPJ inválido',
      };
    } else if (!isValidCnpjChecksum(digits)) {
      return {
        ok: false,
        error: 'impostos_invalido',
        message: 'CNPJ inválido',
      };
    } else {
      value.cnpj = digits;
    }
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

  const cnpj =
    typeof impostos.cnpj === 'string' ? impostos.cnpj.replace(/\D/g, '') : '';
  if (cnpj.length === IMPOSTOS_CNPJ_LEN) {
    return `CNPJ ${maskCnpj(cnpj)}`;
  }

  return 'Adicionar informações';
}
