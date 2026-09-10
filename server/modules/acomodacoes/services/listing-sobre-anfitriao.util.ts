/**
 * Host profile on listing metadata (metadata.sobreAnfitriao).
 */

export const SOBRE_ANFITRIAO_BIO_MAX = 500;
export const SOBRE_ANFITRIAO_INTERESSES_MAX = 12;
export const SOBRE_ANFITRIAO_ANOS_MAX = 99;

export const SOBRE_ANFITRIAO_INTERESSES_CATALOG = [
  { id: 'gastronomia', label: 'Gastronomia e culinária' },
  { id: 'natureza', label: 'Natureza e ecoturismo' },
  { id: 'arte', label: 'Arte e cultura' },
  { id: 'esportes', label: 'Esportes e atividades ao ar livre' },
  { id: 'musica', label: 'Música e eventos' },
  { id: 'viagens', label: 'Viagens e exploração' },
  { id: 'familia', label: 'Família e crianças' },
  { id: 'pets', label: 'Animais de estimação' },
  { id: 'tecnologia', label: 'Tecnologia' },
  { id: 'leitura', label: 'Leitura e literatura' },
  { id: 'fotografia', label: 'Fotografia' },
  { id: 'bem-estar', label: 'Bem-estar e relaxamento' },
] as const;

export type SobreAnfitriaoInteresseId =
  (typeof SOBRE_ANFITRIAO_INTERESSES_CATALOG)[number]['id'];

export type ListingSobreAnfitriao = {
  bioCurta?: string;
  interesses?: SobreAnfitriaoInteresseId[];
  anosAnfitriao?: number;
  mostrarNoAnuncio?: boolean;
};

export type SobreAnfitriaoValidationOk = { ok: true; value: ListingSobreAnfitriao };
export type SobreAnfitriaoValidationErr = {
  ok: false;
  error: 'sobre_anfitriao_invalido';
  message: string;
};

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const INTERESSE_IDS = new Set(SOBRE_ANFITRIAO_INTERESSES_CATALOG.map((i) => i.id));

function sanitizeBio(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(CONTROL_CHARS, '').trim().slice(0, SOBRE_ANFITRIAO_BIO_MAX);
}

function normalizeInteresses(
  raw: unknown,
): { ok: true; value: SobreAnfitriaoInteresseId[] } | { ok: false; message: string } {
  if (raw == null) return { ok: true, value: [] };
  if (!Array.isArray(raw)) {
    return { ok: false, message: 'Lista de interesses inválida' };
  }
  const out: SobreAnfitriaoInteresseId[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== 'string') {
      return { ok: false, message: 'Item de interesse inválido' };
    }
    const id = item.trim();
    if (!id) continue;
    if (!INTERESSE_IDS.has(id as SobreAnfitriaoInteresseId)) {
      return { ok: false, message: `Interesse não permitido: ${id}` };
    }
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id as SobreAnfitriaoInteresseId);
    if (out.length > SOBRE_ANFITRIAO_INTERESSES_MAX) {
      return {
        ok: false,
        message: `Máximo de ${SOBRE_ANFITRIAO_INTERESSES_MAX} interesses`,
      };
    }
  }
  return { ok: true, value: out };
}

function normalizeAnos(raw: unknown): number | undefined {
  if (raw == null || raw === '') return undefined;
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/\D/g, ''));
  if (!Number.isFinite(n) || n < 0) return undefined;
  const rounded = Math.floor(n);
  if (rounded > SOBRE_ANFITRIAO_ANOS_MAX) return undefined;
  return rounded;
}

export function validateListingSobreAnfitriao(
  raw: unknown,
): SobreAnfitriaoValidationOk | SobreAnfitriaoValidationErr {
  if (raw == null) {
    return { ok: true, value: {} };
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      error: 'sobre_anfitriao_invalido',
      message: 'Sobre o anfitrião inválido',
    };
  }

  const src = raw as Record<string, unknown>;
  const value: ListingSobreAnfitriao = {};

  if (Object.prototype.hasOwnProperty.call(src, 'bioCurta')) {
    if (typeof src.bioCurta !== 'string' && src.bioCurta != null) {
      return {
        ok: false,
        error: 'sobre_anfitriao_invalido',
        message: 'Bio curta inválida',
      };
    }
    const text = typeof src.bioCurta === 'string' ? src.bioCurta : '';
    if (text.length > SOBRE_ANFITRIAO_BIO_MAX) {
      return {
        ok: false,
        error: 'sobre_anfitriao_invalido',
        message: `Bio curta deve ter no máximo ${SOBRE_ANFITRIAO_BIO_MAX} caracteres`,
      };
    }
    const cleaned = sanitizeBio(text);
    if (cleaned.trim()) value.bioCurta = cleaned;
  }

  if (Object.prototype.hasOwnProperty.call(src, 'interesses')) {
    const list = normalizeInteresses(src.interesses);
    if (!list.ok) {
      return { ok: false, error: 'sobre_anfitriao_invalido', message: list.message };
    }
    if (list.value.length) {
      value.interesses = list.value;
    }
  }

  if (Object.prototype.hasOwnProperty.call(src, 'anosAnfitriao')) {
    if (
      src.anosAnfitriao != null &&
      src.anosAnfitriao !== '' &&
      typeof src.anosAnfitriao !== 'number' &&
      typeof src.anosAnfitriao !== 'string'
    ) {
      return {
        ok: false,
        error: 'sobre_anfitriao_invalido',
        message: 'Anos como anfitrião inválidos',
      };
    }
    const anos = normalizeAnos(src.anosAnfitriao);
    if (src.anosAnfitriao != null && src.anosAnfitriao !== '' && anos === undefined) {
      return {
        ok: false,
        error: 'sobre_anfitriao_invalido',
        message: `Anos como anfitrião deve ser entre 0 e ${SOBRE_ANFITRIAO_ANOS_MAX}`,
      };
    }
    if (anos !== undefined) value.anosAnfitriao = anos;
  }

  if (Object.prototype.hasOwnProperty.call(src, 'mostrarNoAnuncio')) {
    if (typeof src.mostrarNoAnuncio !== 'boolean') {
      return {
        ok: false,
        error: 'sobre_anfitriao_invalido',
        message: 'mostrarNoAnuncio deve ser boolean',
      };
    }
    value.mostrarNoAnuncio = src.mostrarNoAnuncio;
  }

  return { ok: true, value };
}

/** Card preview for host profile section. */
export function summarizeSobreAnfitriao(
  value: ListingSobreAnfitriao | null | undefined,
): string | null {
  if (!value || typeof value !== 'object') return null;

  const bio = typeof value.bioCurta === 'string' ? value.bioCurta.trim() : '';
  const nInt = Array.isArray(value.interesses) ? value.interesses.length : 0;
  const anos =
    typeof value.anosAnfitriao === 'number' && Number.isFinite(value.anosAnfitriao)
      ? value.anosAnfitriao
      : null;
  const visivel = value.mostrarNoAnuncio !== false;

  const parts: string[] = [];
  if (bio) {
    parts.push(bio.length <= 48 ? bio : `${bio.slice(0, 47)}…`);
  }
  if (nInt) {
    parts.push(`${nInt} interesse${nInt === 1 ? '' : 's'}`);
  }
  if (anos != null) {
    parts.push(`${anos} ano${anos === 1 ? '' : 's'} como anfitrião`);
  }
  if (!visivel) {
    parts.push('Oculto no anúncio');
  }

  return parts.length ? parts.join(' · ') : null;
}
