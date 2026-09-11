/**
 * Listing announcement status (metadata.statusAnuncio — flat key).
 */

export const STATUS_ANUNCIO_VALUES = ['anunciado', 'nao_anunciado'] as const;

export type StatusAnuncioListing = (typeof STATUS_ANUNCIO_VALUES)[number];

export const STATUS_ANUNCIO_WHITELIST = new Set<string>(STATUS_ANUNCIO_VALUES);

export type StatusAnuncioValidationOk = { ok: true; value: StatusAnuncioListing };
export type StatusAnuncioValidationErr = {
  ok: false;
  error: 'status_anuncio_invalido';
  message: string;
};

export function validateListingStatusAnuncio(
  raw: unknown,
): StatusAnuncioValidationOk | StatusAnuncioValidationErr {
  if (raw == null) {
    return { ok: true, value: 'anunciado' };
  }
  if (typeof raw !== 'string') {
    return {
      ok: false,
      error: 'status_anuncio_invalido',
      message: 'Status do anúncio inválido',
    };
  }
  const id = raw.trim();
  if (!STATUS_ANUNCIO_WHITELIST.has(id)) {
    return {
      ok: false,
      error: 'status_anuncio_invalido',
      message: 'Status do anúncio inválido',
    };
  }
  return { ok: true, value: id as StatusAnuncioListing };
}

/** Card preview for listing status section. */
export function summarizeStatusAnuncio(
  value: StatusAnuncioListing | null | undefined,
): string {
  if (value === 'nao_anunciado') return 'Não anunciado';
  return 'Anunciado';
}
