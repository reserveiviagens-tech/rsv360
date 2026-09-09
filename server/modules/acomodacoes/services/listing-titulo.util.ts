/**
 * Listing title helpers — public title (guest-facing) + internal host-only name.
 */

export const TITULO_PUBLICO_MAX = 50;
export const NOME_INTERNO_MAX = 80;

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

export function sanitizeTituloTexto(raw: unknown, maxLen: number): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(CONTROL_CHARS, '').replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

export function sanitizeTituloPublico(raw: unknown): string {
  return sanitizeTituloTexto(raw, TITULO_PUBLICO_MAX);
}

export function sanitizeNomeInterno(raw: unknown): string {
  return sanitizeTituloTexto(raw, NOME_INTERNO_MAX);
}

export type TituloValidationOk = {
  ok: true;
  titulo: string;
  nomeInterno: string;
};

export type TituloValidationErr = {
  ok: false;
  error: 'titulo_obrigatorio' | 'titulo_muito_longo' | 'nome_interno_muito_longo';
  message: string;
};

/**
 * Validate + sanitize titles for PATCH unidade.
 * When `titulo` is undefined, public title is not being updated (pass through null).
 * When `nomeInterno` key is absent from metadata patch, skip internal name.
 */
export function validateListingTitles(input: {
  titulo?: unknown;
  nomeInterno?: unknown;
  updatingTitulo: boolean;
  updatingNomeInterno: boolean;
}): TituloValidationOk | TituloValidationErr {
  let titulo = '';
  if (input.updatingTitulo) {
    titulo = sanitizeTituloPublico(input.titulo);
    if (!titulo) {
      return {
        ok: false,
        error: 'titulo_obrigatorio',
        message: 'Informe um título público com até 50 caracteres',
      };
    }
    if (typeof input.titulo === 'string' && input.titulo.trim().length > TITULO_PUBLICO_MAX) {
      return {
        ok: false,
        error: 'titulo_muito_longo',
        message: `Título público deve ter no máximo ${TITULO_PUBLICO_MAX} caracteres`,
      };
    }
  }

  let nomeInterno = '';
  if (input.updatingNomeInterno) {
    if (typeof input.nomeInterno === 'string' && input.nomeInterno.trim().length > NOME_INTERNO_MAX) {
      return {
        ok: false,
        error: 'nome_interno_muito_longo',
        message: `Nome interno deve ter no máximo ${NOME_INTERNO_MAX} caracteres`,
      };
    }
    nomeInterno = sanitizeNomeInterno(input.nomeInterno);
  }

  return { ok: true, titulo, nomeInterno };
}

export function readNomeInternoFromMetadata(metadata: unknown): string {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return '';
  const v = (metadata as Record<string, unknown>).nomeInterno;
  return typeof v === 'string' ? v : '';
}
