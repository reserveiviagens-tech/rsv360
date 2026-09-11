/**
 * Local guides on listing metadata (metadata.guiasLocais — top-level, separate from guiaChegada).
 */

export const GUIAS_LOCAIS_MAX = 10;
export const GUIA_LOCAL_ID_MAX = 64;
export const GUIA_LOCAL_TITULO_MAX = 80;
export const GUIA_LOCAL_CONTEUDO_MAX = 2000;

export type ListingGuiaLocal = {
  id: string;
  titulo: string;
  conteudo: string;
};

export type GuiasLocaisValidationOk = { ok: true; value: ListingGuiaLocal[] | undefined };
export type GuiasLocaisValidationErr = {
  ok: false;
  error: 'guias_locais_invalido';
  message: string;
};

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const GUIA_LOCAL_ITEM_KEYS = new Set(['id', 'titulo', 'conteudo']);

function sanitizeGuiaLocalText(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(CONTROL_CHARS, '').trim().slice(0, max);
}

export function validateListingGuiasLocais(
  raw: unknown,
): GuiasLocaisValidationOk | GuiasLocaisValidationErr {
  if (raw == null) {
    return { ok: true, value: undefined };
  }
  if (!Array.isArray(raw)) {
    return {
      ok: false,
      error: 'guias_locais_invalido',
      message: 'guiasLocais deve ser uma lista',
    };
  }
  if (raw.length > GUIAS_LOCAIS_MAX) {
    return {
      ok: false,
      error: 'guias_locais_invalido',
      message: `Máximo de ${GUIAS_LOCAIS_MAX} guias locais`,
    };
  }

  const value: ListingGuiaLocal[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return {
        ok: false,
        error: 'guias_locais_invalido',
        message: 'Item de guia local inválido',
      };
    }

    const src = item as Record<string, unknown>;
    for (const key of Object.keys(src)) {
      if (!GUIA_LOCAL_ITEM_KEYS.has(key)) {
        return {
          ok: false,
          error: 'guias_locais_invalido',
          message: `Guia local: chave desconhecida "${key}"`,
        };
      }
    }

    if (typeof src.id !== 'string') {
      return {
        ok: false,
        error: 'guias_locais_invalido',
        message: 'ID do guia local inválido',
      };
    }
    const id = sanitizeGuiaLocalText(src.id, GUIA_LOCAL_ID_MAX);
    if (!id) {
      return {
        ok: false,
        error: 'guias_locais_invalido',
        message: 'ID do guia local inválido',
      };
    }

    if (typeof src.titulo !== 'string') {
      return {
        ok: false,
        error: 'guias_locais_invalido',
        message: 'Título do guia local inválido',
      };
    }
    if (src.titulo.length > GUIA_LOCAL_TITULO_MAX) {
      return {
        ok: false,
        error: 'guias_locais_invalido',
        message: `Título do guia deve ter no máximo ${GUIA_LOCAL_TITULO_MAX} caracteres`,
      };
    }
    const titulo = sanitizeGuiaLocalText(src.titulo, GUIA_LOCAL_TITULO_MAX);

    if (typeof src.conteudo !== 'string') {
      return {
        ok: false,
        error: 'guias_locais_invalido',
        message: 'Conteúdo do guia local inválido',
      };
    }
    if (src.conteudo.length > GUIA_LOCAL_CONTEUDO_MAX) {
      return {
        ok: false,
        error: 'guias_locais_invalido',
        message: `Conteúdo do guia deve ter no máximo ${GUIA_LOCAL_CONTEUDO_MAX} caracteres`,
      };
    }
    const conteudo = sanitizeGuiaLocalText(src.conteudo, GUIA_LOCAL_CONTEUDO_MAX);

    value.push({ id, titulo, conteudo });
  }

  return { ok: true, value: value.length ? value : undefined };
}

/** Card preview for local guides section. */
export function summarizeGuiasLocais(
  guias: ListingGuiaLocal[] | null | undefined,
): string {
  if (!Array.isArray(guias) || guias.length === 0) {
    return 'Adicionar informações';
  }
  const n = guias.length;
  return n === 1 ? '1 guia' : `${n} guias`;
}
