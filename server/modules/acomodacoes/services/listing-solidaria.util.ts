/**
 * Solidarity lodging flag on listing metadata (flat key: hospedagemSolidaria).
 */

export type SolidariaValidationOk = { ok: true; value: boolean };
export type SolidariaValidationErr = {
  ok: false;
  error: 'solidaria_invalido';
  message: string;
};

function coerceBoolean(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw;
  if (raw === 'true' || raw === 1 || raw === '1') return true;
  if (raw === 'false' || raw === 0 || raw === '0') return false;
  return Boolean(raw);
}

export function validateListingHospedagemSolidaria(
  raw: unknown,
): SolidariaValidationOk | SolidariaValidationErr {
  if (raw == null) {
    return { ok: true, value: false };
  }
  if (
    typeof raw !== 'boolean' &&
    typeof raw !== 'string' &&
    typeof raw !== 'number'
  ) {
    return {
      ok: false,
      error: 'solidaria_invalido',
      message: 'hospedagemSolidaria deve ser boolean',
    };
  }
  return { ok: true, value: coerceBoolean(raw) };
}

/** Card preview for solidarity lodging section. */
export function summarizeSolidaria(
  hospedagemSolidaria: boolean | null | undefined,
): string {
  if (hospedagemSolidaria) return 'Ativa';
  return 'Desligada';
}
