/**
 * Guest requirements on listing metadata (flat key: exigirFotoPerfil).
 */

export type RequisitosValidationOk = { ok: true; value: boolean };
export type RequisitosValidationErr = {
  ok: false;
  error: 'requisitos_invalido';
  message: string;
};

function coerceBoolean(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw;
  if (raw === 'true' || raw === 1 || raw === '1') return true;
  if (raw === 'false' || raw === 0 || raw === '0') return false;
  return Boolean(raw);
}

export function validateListingExigirFotoPerfil(
  raw: unknown,
): RequisitosValidationOk | RequisitosValidationErr {
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
      error: 'requisitos_invalido',
      message: 'exigirFotoPerfil deve ser boolean',
    };
  }
  return { ok: true, value: coerceBoolean(raw) };
}

/** Card preview for guest requirements section. */
export function summarizeRequisitos(exigirFotoPerfil: boolean | null | undefined): string {
  if (exigirFotoPerfil) return 'Foto de perfil exigida';
  return 'Requisitos padrão';
}
