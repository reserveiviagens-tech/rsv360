/**
 * House rules on listing metadata (metadata.regrasCasa).
 */

export const REGRAS_ADICIONAIS_MAX = 2000;
export const CHECKIN_ATE_MAX = 64;

export type ListingRegrasCasa = {
  pets?: boolean;
  eventos?: boolean;
  fumar?: boolean;
  silencio?: boolean;
  filmagem?: boolean;
  silencioInicio?: string;
  silencioFim?: string;
  checkInDe?: string;
  checkInAte?: string;
  checkOutAte?: string;
  regrasAdicionais?: string;
};

export type RegrasCasaValidationOk = { ok: true; value: ListingRegrasCasa };
export type RegrasCasaValidationErr = {
  ok: false;
  error: 'regras_casa_invalido';
  message: string;
};

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const BOOLEAN_KEYS = ['pets', 'eventos', 'fumar', 'silencio', 'filmagem'] as const;
type BooleanKey = (typeof BOOLEAN_KEYS)[number];

const TIME_KEYS = ['silencioInicio', 'silencioFim', 'checkInDe', 'checkOutAte'] as const;
type TimeKey = (typeof TIME_KEYS)[number];

function coerceBoolean(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw;
  if (raw === 'true' || raw === 1 || raw === '1') return true;
  if (raw === 'false' || raw === 0 || raw === '0') return false;
  return Boolean(raw);
}

/** Accepts "9:00" / "09:00"; returns canonical "HH:MM" or null when invalid. */
export function parseRegrasCasaTime(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return '';
  if (typeof raw !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isInteger(h) || !Number.isInteger(min) || h < 0 || h > 23 || min < 0 || min > 59) {
    return null;
  }
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function sanitizeText(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(CONTROL_CHARS, '').trim().slice(0, max);
}

function validateTimeField(
  raw: unknown,
  label: string,
): { ok: true; value: string | undefined } | RegrasCasaValidationErr {
  if (raw == null || raw === '') {
    return { ok: true, value: undefined };
  }
  if (typeof raw !== 'string') {
    return {
      ok: false,
      error: 'regras_casa_invalido',
      message: `${label} inválido`,
    };
  }
  const parsed = parseRegrasCasaTime(raw);
  if (parsed === null) {
    return {
      ok: false,
      error: 'regras_casa_invalido',
      message: `${label} deve estar no formato HH:MM`,
    };
  }
  return { ok: true, value: parsed || undefined };
}

export function validateListingRegrasCasa(
  raw: unknown,
): RegrasCasaValidationOk | RegrasCasaValidationErr {
  if (raw == null) {
    return { ok: true, value: {} };
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      error: 'regras_casa_invalido',
      message: 'Regras da casa inválidas',
    };
  }

  const src = raw as Record<string, unknown>;
  const value: ListingRegrasCasa = {};

  for (const key of BOOLEAN_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(src, key)) continue;
    if (
      src[key] != null &&
      typeof src[key] !== 'boolean' &&
      typeof src[key] !== 'string' &&
      typeof src[key] !== 'number'
    ) {
      return {
        ok: false,
        error: 'regras_casa_invalido',
        message: `${key} deve ser boolean`,
      };
    }
    value[key as BooleanKey] = coerceBoolean(src[key]);
  }

  const timeLabels: Record<TimeKey, string> = {
    silencioInicio: 'Início do silêncio',
    silencioFim: 'Término do silêncio',
    checkInDe: 'Check-in de',
    checkOutAte: 'Checkout',
  };

  for (const key of TIME_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(src, key)) continue;
    const parsed = validateTimeField(src[key], timeLabels[key]);
    if (!parsed.ok) return parsed;
    if (parsed.value) {
      value[key] = parsed.value;
    }
  }

  if (Object.prototype.hasOwnProperty.call(src, 'checkInAte')) {
    if (typeof src.checkInAte !== 'string' && src.checkInAte != null) {
      return {
        ok: false,
        error: 'regras_casa_invalido',
        message: 'Check-in até inválido',
      };
    }
    const text = typeof src.checkInAte === 'string' ? src.checkInAte : '';
    if (text.length > CHECKIN_ATE_MAX) {
      return {
        ok: false,
        error: 'regras_casa_invalido',
        message: `Check-in até deve ter no máximo ${CHECKIN_ATE_MAX} caracteres`,
      };
    }
    const cleaned = sanitizeText(text, CHECKIN_ATE_MAX);
    if (!cleaned) {
      // omit empty
    } else {
      const asTime = parseRegrasCasaTime(cleaned);
      if (asTime === null && cleaned.includes(':')) {
        return {
          ok: false,
          error: 'regras_casa_invalido',
          message: 'Check-in até deve estar no formato HH:MM',
        };
      }
      value.checkInAte = asTime && asTime !== '' ? asTime : cleaned;
    }
  }

  if (Object.prototype.hasOwnProperty.call(src, 'regrasAdicionais')) {
    if (typeof src.regrasAdicionais !== 'string' && src.regrasAdicionais != null) {
      return {
        ok: false,
        error: 'regras_casa_invalido',
        message: 'Regras adicionais inválidas',
      };
    }
    const text = typeof src.regrasAdicionais === 'string' ? src.regrasAdicionais : '';
    if (text.length > REGRAS_ADICIONAIS_MAX) {
      return {
        ok: false,
        error: 'regras_casa_invalido',
        message: `Regras adicionais deve ter no máximo ${REGRAS_ADICIONAIS_MAX} caracteres`,
      };
    }
    const cleaned = sanitizeText(text, REGRAS_ADICIONAIS_MAX);
    if (cleaned) {
      value.regrasAdicionais = cleaned;
    }
  }

  return { ok: true, value };
}

/** Card preview for check-in / checkout (Guia tab). */
export function summarizeCheckinCheckout(
  regras: ListingRegrasCasa | null | undefined,
): string {
  const checkInDe =
    regras && typeof regras.checkInDe === 'string' && regras.checkInDe.trim()
      ? regras.checkInDe.trim()
      : '14:00';
  const checkOutAte =
    regras && typeof regras.checkOutAte === 'string' && regras.checkOutAte.trim()
      ? regras.checkOutAte.trim()
      : '11:00';
  return `Check-in ${checkInDe} · Checkout ${checkOutAte}`;
}

/** Card preview for house rules section. */
export function summarizeRegrasCasa(
  regras: ListingRegrasCasa | null | undefined,
): string {
  return summarizeCheckinCheckout(regras);
}
