/**
 * Listing availability defaults — min/max nights, lead time, same-day cutoff,
 * and optional per-check-in-day minimum stay.
 */

import {
  normalizeMinNoitesPorCheckin,
  type MinNoitesPorCheckin,
} from './host-pricing.helpers';

export const MIN_NOITES_MIN = 1;
export const MIN_NOITES_MAX = 365;
export const MAX_NOITES_MIN = 1;
export const MAX_NOITES_MAX = 1125;
export const ANTECEDENCIA_MAX_DIAS = 365;

export type ListingDisponibilidade = {
  minNoites: number;
  maxNoites: number;
  antecedenciaDias: number;
  avisoPrevioMesmoDia: string | null;
  minNoitesPorCheckin: MinNoitesPorCheckin | null;
};

export type DisponibilidadeValidationOk = {
  ok: true;
  value: Partial<ListingDisponibilidade>;
};
export type DisponibilidadeValidationErr = {
  ok: false;
  error: 'disponibilidade_invalida';
  message: string;
};

/** Accepts "9:00" / "09:00"; returns canonical "HH:MM" or null. */
export function parseAvisoPrevioMesmoDia(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null;
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

function parsePositiveInt(
  raw: unknown,
  label: string,
  min: number,
  max: number,
): { ok: true; value: number } | DisponibilidadeValidationErr {
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n)) {
    return { ok: false, error: 'disponibilidade_invalida', message: `${label} inválido` };
  }
  const v = Math.floor(n);
  if (v < min || v > max) {
    return {
      ok: false,
      error: 'disponibilidade_invalida',
      message: `${label} deve estar entre ${min} e ${max}`,
    };
  }
  return { ok: true, value: v };
}

/**
 * Validate availability fields present in a pricing-defaults patch.
 * Only keys present in `input` are validated/returned.
 */
export function validateListingDisponibilidadePatch(
  input: {
    minNoites?: unknown;
    maxNoites?: unknown;
    antecedenciaDias?: unknown;
    avisoPrevioMesmoDia?: unknown;
    minNoitesPorCheckin?: unknown;
  },
  opts?: { fallbackMinNoites?: number },
): DisponibilidadeValidationOk | DisponibilidadeValidationErr {
  const value: Partial<ListingDisponibilidade> = {};

  if (Object.prototype.hasOwnProperty.call(input, 'minNoites')) {
    const r = parsePositiveInt(input.minNoites, 'Mínimo de noites', MIN_NOITES_MIN, MIN_NOITES_MAX);
    if (!r.ok) return r;
    value.minNoites = r.value;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'maxNoites')) {
    const r = parsePositiveInt(input.maxNoites, 'Máximo de noites', MAX_NOITES_MIN, MAX_NOITES_MAX);
    if (!r.ok) return r;
    value.maxNoites = r.value;
  }

  if (
    value.minNoites != null &&
    value.maxNoites != null &&
    value.maxNoites < value.minNoites
  ) {
    return {
      ok: false,
      error: 'disponibilidade_invalida',
      message: 'Máximo de noites deve ser maior ou igual ao mínimo',
    };
  }

  if (Object.prototype.hasOwnProperty.call(input, 'antecedenciaDias')) {
    const r = parsePositiveInt(
      input.antecedenciaDias,
      'Antecedência',
      0,
      ANTECEDENCIA_MAX_DIAS,
    );
    if (!r.ok) return r;
    value.antecedenciaDias = r.value;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'avisoPrevioMesmoDia')) {
    if (input.avisoPrevioMesmoDia === null || input.avisoPrevioMesmoDia === '') {
      value.avisoPrevioMesmoDia = null;
    } else {
      const parsed = parseAvisoPrevioMesmoDia(input.avisoPrevioMesmoDia);
      if (!parsed) {
        return {
          ok: false,
          error: 'disponibilidade_invalida',
          message: 'Aviso prévio do mesmo dia deve estar no formato HH:MM',
        };
      }
      value.avisoPrevioMesmoDia = parsed;
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, 'minNoitesPorCheckin')) {
    if (input.minNoitesPorCheckin === null) {
      value.minNoitesPorCheckin = null;
    } else {
      const fallback =
        value.minNoites ??
        (opts?.fallbackMinNoites != null && Number.isFinite(opts.fallbackMinNoites)
          ? Math.max(1, Math.floor(opts.fallbackMinNoites))
          : MIN_NOITES_MIN);
      value.minNoitesPorCheckin = normalizeMinNoitesPorCheckin(
        input.minNoitesPorCheckin,
        fallback,
      );
    }
  }

  return { ok: true, value };
}

function antecedenciaLabel(dias: number): string {
  if (dias <= 0) return 'Mesmo dia';
  if (dias === 1) return '1 dia';
  return `${dias} dias`;
}

/** Card: “Estadia de 2 a 30 noites, Mesmo dia” */
export function summarizeDisponibilidade(input: {
  minNoites?: number | null;
  maxNoites?: number | null;
  antecedenciaDias?: number | null;
}): string {
  const min = Math.max(1, Math.floor(Number(input.minNoites) || 1));
  const max = Math.max(min, Math.floor(Number(input.maxNoites) || 30));
  const lead = Math.max(0, Math.floor(Number(input.antecedenciaDias) || 0));
  return `Estadia de ${min} a ${max} noites, ${antecedenciaLabel(lead)}`;
}

export const WEEKDAY_LABELS = [
  { d: 0, short: 'Dom', full: 'Domingo' },
  { d: 1, short: 'Seg', full: 'Segunda' },
  { d: 2, short: 'Ter', full: 'Terça' },
  { d: 3, short: 'Qua', full: 'Quarta' },
  { d: 4, short: 'Qui', full: 'Quinta' },
  { d: 5, short: 'Sex', full: 'Sexta' },
  { d: 6, short: 'Sáb', full: 'Sábado' },
] as const;

export const ANTECEDENCIA_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0, label: 'Mesmo dia' },
  { value: 1, label: '1 dia' },
  { value: 2, label: '2 dias' },
  { value: 3, label: '3 dias' },
  { value: 7, label: '7 dias' },
  { value: 14, label: '14 dias' },
  { value: 30, label: '30 dias' },
];
