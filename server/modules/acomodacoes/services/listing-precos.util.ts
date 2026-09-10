/**
 * Listing base prices — diária, fim de semana (removable) and Preço Inteligente toggle.
 */

export const PRECO_MAX = 1_000_000;

export type ListingPrecos = {
  precoDiaria: number | null;
  precoFimSemana: number | null;
  precoInteligenteAtivo: boolean;
};

export type PrecosValidationOk = { ok: true; value: Partial<ListingPrecos> };
export type PrecosValidationErr = {
  ok: false;
  error: 'preco_invalido';
  message: string;
};

/** Parse money input: null clears; empty string → null; reject NaN/negative/over max. */
export function parsePrecoMoney(
  raw: unknown,
  fieldLabel: string,
): { ok: true; value: number | null } | PrecosValidationErr {
  if (raw === null || raw === undefined || raw === '') {
    return { ok: true, value: null };
  }
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.').trim());
  if (!Number.isFinite(n)) {
    return {
      ok: false,
      error: 'preco_invalido',
      message: `${fieldLabel} inválido`,
    };
  }
  if (n < 0) {
    return {
      ok: false,
      error: 'preco_invalido',
      message: `${fieldLabel} não pode ser negativo`,
    };
  }
  if (n > PRECO_MAX) {
    return {
      ok: false,
      error: 'preco_invalido',
      message: `${fieldLabel} acima do limite permitido`,
    };
  }
  // Round to 2 decimal places (BRL cents).
  return { ok: true, value: Math.round(n * 100) / 100 };
}

/**
 * Validate price fields present in a pricing-defaults patch.
 * Only keys present in `input` are validated/returned.
 */
export function validateListingPrecosPatch(input: {
  precoDiaria?: unknown;
  precoFimSemana?: unknown;
  precoInteligenteAtivo?: unknown;
}): PrecosValidationOk | PrecosValidationErr {
  const value: Partial<ListingPrecos> = {};

  if (Object.prototype.hasOwnProperty.call(input, 'precoDiaria')) {
    const p = parsePrecoMoney(input.precoDiaria, 'Preço básico');
    if (!p.ok) return p;
    if (p.value != null && p.value <= 0) {
      return {
        ok: false,
        error: 'preco_invalido',
        message: 'Preço básico deve ser maior que zero',
      };
    }
    value.precoDiaria = p.value;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'precoFimSemana')) {
    const p = parsePrecoMoney(input.precoFimSemana, 'Preço de fim de semana');
    if (!p.ok) return p;
    if (p.value != null && p.value <= 0) {
      return {
        ok: false,
        error: 'preco_invalido',
        message: 'Preço de fim de semana deve ser maior que zero (ou remova o campo)',
      };
    }
    value.precoFimSemana = p.value;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'precoInteligenteAtivo')) {
    value.precoInteligenteAtivo = Boolean(input.precoInteligenteAtivo);
  }

  return { ok: true, value };
}

function formatBrlShort(n: number): string {
  const fixed = Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',');
  return `R$ ${fixed}`;
}

/** Card summary for the listing editor sidebar. */
export function summarizePrecos(input: {
  precoDiaria?: number | null;
  precoFimSemana?: number | null;
  precoInteligenteAtivo?: boolean | null;
}): string | null {
  const base = input.precoDiaria;
  if (base == null || !Number.isFinite(Number(base)) || Number(base) <= 0) {
    return null;
  }
  const parts = [`${formatBrlShort(Number(base))}/noite`];
  const fds = input.precoFimSemana;
  if (fds != null && Number.isFinite(Number(fds)) && Number(fds) > 0) {
    parts.push(`Fim de semana ${formatBrlShort(Number(fds))}`);
  }
  if (input.precoInteligenteAtivo) {
    parts.push('Preço Inteligente');
  }
  return parts.join(' · ');
}
