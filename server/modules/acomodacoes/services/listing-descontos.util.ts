/**
 * Listing length-of-stay discounts — weekly (7+) and monthly (28+).
 */

export const DESCONTO_PCT_MIN = 0;
export const DESCONTO_PCT_MAX = 99;
export const NOITES_SEMANAL = 7;
export const NOITES_MENSAL = 28;

/** Host service fee estimate (~16.5%), aligned with anfitrião payout UI. */
export const HOST_SERVICE_FEE_RATE = 0.1647;

export type ListingDescontos = {
  descontoSemanalPct: number;
  descontoMensalPct: number;
};

export type DescontosValidationOk = { ok: true; value: Partial<ListingDescontos> };
export type DescontosValidationErr = {
  ok: false;
  error: 'desconto_invalido';
  message: string;
};

export function clampDescontoPct(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.').trim());
  if (!Number.isFinite(n)) return null;
  return Math.min(DESCONTO_PCT_MAX, Math.max(DESCONTO_PCT_MIN, Math.round(n)));
}

export function validateListingDescontosPatch(input: {
  descontoSemanalPct?: unknown;
  descontoMensalPct?: unknown;
}): DescontosValidationOk | DescontosValidationErr {
  const value: Partial<ListingDescontos> = {};

  if (Object.prototype.hasOwnProperty.call(input, 'descontoSemanalPct')) {
    if (input.descontoSemanalPct === null || input.descontoSemanalPct === undefined) {
      value.descontoSemanalPct = 0;
    } else {
      const n =
        typeof input.descontoSemanalPct === 'number'
          ? input.descontoSemanalPct
          : Number(String(input.descontoSemanalPct).replace(',', '.').trim());
      if (!Number.isFinite(n)) {
        return {
          ok: false,
          error: 'desconto_invalido',
          message: 'Desconto semanal inválido',
        };
      }
      if (n < DESCONTO_PCT_MIN || n > DESCONTO_PCT_MAX) {
        return {
          ok: false,
          error: 'desconto_invalido',
          message: `Desconto semanal deve estar entre ${DESCONTO_PCT_MIN} e ${DESCONTO_PCT_MAX}%`,
        };
      }
      value.descontoSemanalPct = Math.round(n);
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, 'descontoMensalPct')) {
    if (input.descontoMensalPct === null || input.descontoMensalPct === undefined) {
      value.descontoMensalPct = 0;
    } else {
      const n =
        typeof input.descontoMensalPct === 'number'
          ? input.descontoMensalPct
          : Number(String(input.descontoMensalPct).replace(',', '.').trim());
      if (!Number.isFinite(n)) {
        return {
          ok: false,
          error: 'desconto_invalido',
          message: 'Desconto mensal inválido',
        };
      }
      if (n < DESCONTO_PCT_MIN || n > DESCONTO_PCT_MAX) {
        return {
          ok: false,
          error: 'desconto_invalido',
          message: `Desconto mensal deve estar entre ${DESCONTO_PCT_MIN} e ${DESCONTO_PCT_MAX}%`,
        };
      }
      value.descontoMensalPct = Math.round(n);
    }
  }

  return { ok: true, value };
}

/** Card summary: “Desconto semanal de 10% · Desconto mensal de 21%” */
export function summarizeDescontos(input: {
  descontoSemanalPct?: number | null;
  descontoMensalPct?: number | null;
}): string | null {
  const parts: string[] = [];
  const sem = Number(input.descontoSemanalPct ?? 0);
  const men = Number(input.descontoMensalPct ?? 0);
  if (Number.isFinite(sem) && sem > 0) {
    parts.push(`Desconto semanal de ${Math.round(sem)}%`);
  }
  if (Number.isFinite(men) && men > 0) {
    parts.push(`Desconto mensal de ${Math.round(men)}%`);
  }
  return parts.length ? parts.join(' · ') : null;
}

export type DescontoStayBreakdown = {
  noites: number;
  precoBaseTotal: number;
  descontoPct: number;
  descontoValor: number;
  precoHospede: number;
  taxa: number;
  voceRecebe: number;
  mediaNoite: number;
};

/**
 * Illustrative stay breakdown for the editor (nights after length-of-stay discount).
 * Guest pays discounted nights; host fee is deducted from host payout.
 */
export function buildDescontoStayBreakdown(input: {
  precoDiaria: number;
  noites: number;
  descontoPct: number;
  feeRate?: number;
}): DescontoStayBreakdown | null {
  const diaria = Number(input.precoDiaria);
  const noites = Math.max(1, Math.floor(Number(input.noites) || 0));
  const pct = Math.min(
    DESCONTO_PCT_MAX,
    Math.max(DESCONTO_PCT_MIN, Math.round(Number(input.descontoPct) || 0)),
  );
  if (!Number.isFinite(diaria) || diaria <= 0) return null;

  const precoBaseTotal = Math.round(diaria * noites * 100) / 100;
  const descontoValor = Math.round(precoBaseTotal * (pct / 100) * 100) / 100;
  const precoHospede = Math.round((precoBaseTotal - descontoValor) * 100) / 100;
  const rate = input.feeRate ?? HOST_SERVICE_FEE_RATE;
  const taxa = Math.round(precoHospede * rate);
  const voceRecebe = Math.max(0, Math.round(precoHospede) - taxa);
  const mediaNoite = Math.round((precoHospede / noites) * 100) / 100;

  return {
    noites,
    precoBaseTotal,
    descontoPct: pct,
    descontoValor,
    precoHospede,
    taxa,
    voceRecebe,
    mediaNoite,
  };
}
