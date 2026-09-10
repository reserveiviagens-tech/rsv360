/**
 * Listing guest capacity — capacidadeMax (and optional capacidadeBase).
 */

export const CAPACIDADE_MIN = 1;
export const CAPACIDADE_MAX = 50;

export type CapacidadeValidationOk = {
  ok: true;
  capacidadeMax?: number;
  capacidadeBase?: number | null;
};

export type CapacidadeValidationErr = {
  ok: false;
  error: 'capacidade_invalida';
  message: string;
};

function parseCapacidadeInt(
  raw: unknown,
  label: string,
): { ok: true; value: number } | CapacidadeValidationErr {
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n)) {
    return { ok: false, error: 'capacidade_invalida', message: `${label} inválida` };
  }
  const v = Math.floor(n);
  if (v < CAPACIDADE_MIN || v > CAPACIDADE_MAX) {
    return {
      ok: false,
      error: 'capacidade_invalida',
      message: `${label} deve estar entre ${CAPACIDADE_MIN} e ${CAPACIDADE_MAX}`,
    };
  }
  return { ok: true, value: v };
}

/**
 * Validate guest capacity fields present in a PATCH unidade body.
 * Only keys present in `input` are validated/returned.
 */
export function validateListingCapacidade(input: {
  capacidadeMax?: unknown;
  capacidadeBase?: unknown;
}): CapacidadeValidationOk | CapacidadeValidationErr {
  const out: CapacidadeValidationOk = { ok: true };

  if (Object.prototype.hasOwnProperty.call(input, 'capacidadeMax')) {
    const r = parseCapacidadeInt(input.capacidadeMax, 'Capacidade máxima');
    if (!r.ok) return r;
    out.capacidadeMax = r.value;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'capacidadeBase')) {
    if (input.capacidadeBase === null || input.capacidadeBase === '') {
      out.capacidadeBase = null;
    } else {
      const r = parseCapacidadeInt(input.capacidadeBase, 'Capacidade base');
      if (!r.ok) return r;
      out.capacidadeBase = r.value;
    }
  }

  if (
    out.capacidadeMax != null &&
    out.capacidadeBase != null &&
    out.capacidadeBase > out.capacidadeMax
  ) {
    return {
      ok: false,
      error: 'capacidade_invalida',
      message: 'Capacidade base não pode ser maior que a capacidade máxima',
    };
  }

  return out;
}

/** Card summary: “Máximo de 4 hóspedes” */
export function summarizeCapacidade(capacidadeMax: number | null | undefined): string | null {
  const n = Math.floor(Number(capacidadeMax));
  if (!Number.isFinite(n) || n < CAPACIDADE_MIN) return null;
  const v = Math.min(CAPACIDADE_MAX, n);
  return v === 1 ? 'Máximo de 1 hóspede' : `Máximo de ${v} hóspedes`;
}
