/**
 * Listing detailed description fields (metadata.descricaoDetalhada).
 */

export const DESCRICAO_ANUNCIO_MAX = 500;
export const DESCRICAO_CAMPO_MAX = 1000;

export const DESCRICAO_FIELD_KEYS = [
  'anuncio',
  'suaPropriedade',
  'acessoHospede',
  'interacaoHospedes',
  'outrasInformacoes',
] as const;

export type DescricaoFieldKey = (typeof DESCRICAO_FIELD_KEYS)[number];

export type DescricaoDetalhada = Partial<Record<DescricaoFieldKey, string>>;

export type DescricaoValidationOk = { ok: true; value: DescricaoDetalhada };
export type DescricaoValidationErr = {
  ok: false;
  error: 'descricao_invalida';
  message: string;
};

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function maxLenForDescricaoField(key: DescricaoFieldKey): number {
  return key === 'anuncio' ? DESCRICAO_ANUNCIO_MAX : DESCRICAO_CAMPO_MAX;
}

/** Preserve newlines/tabs; strip other controls; do not trim interior spaces (host copy). */
export function sanitizeDescricaoTexto(raw: unknown, maxLen: number): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(CONTROL_CHARS, '').slice(0, maxLen);
}

export function validateListingDescricaoDetalhada(
  raw: unknown,
): DescricaoValidationOk | DescricaoValidationErr {
  if (raw == null) {
    return { ok: true, value: {} };
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      error: 'descricao_invalida',
      message: 'Descrição detalhada inválida',
    };
  }

  const src = raw as Record<string, unknown>;
  const value: DescricaoDetalhada = {};

  for (const key of DESCRICAO_FIELD_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(src, key)) continue;
    const max = maxLenForDescricaoField(key);
    if (typeof src[key] !== 'string' && src[key] != null) {
      return {
        ok: false,
        error: 'descricao_invalida',
        message: `Campo de descrição inválido: ${key}`,
      };
    }
    const text = typeof src[key] === 'string' ? src[key] : '';
    if (text.length > max) {
      return {
        ok: false,
        error: 'descricao_invalida',
        message:
          key === 'anuncio'
            ? `Descrição do anúncio deve ter no máximo ${DESCRICAO_ANUNCIO_MAX} caracteres`
            : `Campo de descrição deve ter no máximo ${max} caracteres`,
      };
    }
    const cleaned = sanitizeDescricaoTexto(text, max);
    if (cleaned) value[key] = cleaned;
  }

  // Reject unknown keys that look like description payloads (typos)
  for (const key of Object.keys(src)) {
    if (!(DESCRICAO_FIELD_KEYS as readonly string[]).includes(key)) {
      // Ignore unknown keys — soft merge friendly
      continue;
    }
  }

  return { ok: true, value };
}

/** Card preview: truncated public listing description. */
export function summarizeDescricao(anuncio: string | null | undefined, max = 80): string | null {
  if (typeof anuncio !== 'string') return null;
  const t = anuncio.replace(/\s+/g, ' ').trim();
  if (!t) return null;
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}
