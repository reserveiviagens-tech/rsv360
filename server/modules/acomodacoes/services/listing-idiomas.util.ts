/**
 * Listing languages on metadata (metadata.idiomas).
 * MVP: default Portuguese only; multi-language picker in phase 2.
 */

export const IDIOMAS_MAX = 8;
export const IDIOMA_LABEL_MAX = 40;
export const IDIOMAS_DEFAULT = ['Português'] as const;

export type IdiomasValidationOk = { ok: true; value: string[] };
export type IdiomasValidationErr = {
  ok: false;
  error: 'idiomas_invalido';
  message: string;
};

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function sanitizeLabel(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(CONTROL_CHARS, '').trim().slice(0, IDIOMA_LABEL_MAX);
}

export function validateListingIdiomas(raw: unknown): IdiomasValidationOk | IdiomasValidationErr {
  if (raw == null) {
    return { ok: true, value: [...IDIOMAS_DEFAULT] };
  }
  if (!Array.isArray(raw)) {
    return {
      ok: false,
      error: 'idiomas_invalido',
      message: 'idiomas deve ser uma lista de strings',
    };
  }
  if (raw.length > IDIOMAS_MAX) {
    return {
      ok: false,
      error: 'idiomas_invalido',
      message: `Máximo de ${IDIOMAS_MAX} idiomas`,
    };
  }

  const seen = new Set<string>();
  const value: string[] = [];
  for (const item of raw) {
    const label = sanitizeLabel(item);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    value.push(label);
  }

  if (value.length === 0) {
    return { ok: true, value: [...IDIOMAS_DEFAULT] };
  }

  return { ok: true, value };
}

/** Card preview for languages section. */
export function summarizeIdiomas(idiomas: string[] | null | undefined): string {
  const list = Array.isArray(idiomas) && idiomas.length > 0 ? idiomas : [...IDIOMAS_DEFAULT];
  if (list.length === 1 && list[0]?.toLowerCase() === 'português') {
    return 'Português';
  }
  return `${list.length} idiomas`;
}
