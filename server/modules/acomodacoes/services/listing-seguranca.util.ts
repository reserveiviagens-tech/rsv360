/**
 * Guest safety section on listing metadata (metadata.seguranca).
 */

export const CONSIDERACOES_CATALOG = [
  { id: 'nao-adequado-criancas', label: 'Não é um espaço seguro ou adequado para crianças' },
  { id: 'escadas-perigosas', label: 'Escadas íngremes ou sem corrimão' },
  { id: 'altura', label: 'Possíveis riscos relacionados à altura' },
  { id: 'agua', label: "Piscina, lago ou outro corpo d'água sem cerca" },
  { id: 'animais', label: 'Animais potencialmente perigosos na propriedade' },
] as const;

export const DISPOSITIVOS_CATALOG = [
  { id: 'camera-externa', label: 'Câmera de segurança externa', needsDetail: true },
  { id: 'camera-interna', label: 'Câmera de segurança interna', needsDetail: true },
  { id: 'ruido', label: 'Monitor de ruído', needsDetail: true },
  { id: 'armas', label: 'Armas na propriedade' },
  { id: 'co', label: 'Detector de monóxido de carbono' },
  { id: 'fumaca', label: 'Detector de fumaça' },
] as const;

export const INFO_PROPRIEDADE_CATALOG = [
  { id: 'espaco-compartilhado', label: 'Espaço compartilhado' },
  { id: 'amenidades-limitadas', label: 'Amenidades limitadas' },
  { id: 'aparelhos', label: 'Aparelhos ou equipamentos' },
  { id: 'vigilancia', label: 'Dispositivos de vigilância' },
  { id: 'animais-estimacao', label: 'Animais de estimação que vivem na propriedade' },
] as const;

export type ConsideracaoId = (typeof CONSIDERACOES_CATALOG)[number]['id'];
export type DispositivoId = (typeof DISPOSITIVOS_CATALOG)[number]['id'];
export type InfoPropriedadeId = (typeof INFO_PROPRIEDADE_CATALOG)[number]['id'];

export const CONSIDERACOES_IDS: ReadonlySet<string> = new Set(
  CONSIDERACOES_CATALOG.map((c) => c.id),
);
export const DISPOSITIVOS_IDS: ReadonlySet<string> = new Set(
  DISPOSITIVOS_CATALOG.map((d) => d.id),
);
export const INFO_PROPRIEDADE_IDS: ReadonlySet<string> = new Set(
  INFO_PROPRIEDADE_CATALOG.map((i) => i.id),
);

export const DISPOSITIVO_DETALHES_MAX = 500;
export const RECOMENDACOES_ESPECIAIS_MAX = 2000;
export const DISPOSITIVOS_MAX = DISPOSITIVOS_CATALOG.length;

const TOP_LEVEL_KEYS = new Set([
  'consideracoes',
  'dispositivos',
  'infoPropriedade',
  'recomendacoesEspeciais',
]);

export type ListingDispositivo = {
  ativo: boolean;
  detalhes?: string;
};

export type ListingSeguranca = {
  consideracoes?: Record<string, boolean>;
  dispositivos?: Record<string, ListingDispositivo>;
  infoPropriedade?: Record<string, boolean>;
  recomendacoesEspeciais?: string;
};

export type SegurancaValidationOk = { ok: true; value: ListingSeguranca };
export type SegurancaValidationErr = {
  ok: false;
  error: 'seguranca_invalida';
  message: string;
};

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function coerceBoolean(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw;
  if (raw === 'true' || raw === 1 || raw === '1') return true;
  if (raw === 'false' || raw === 0 || raw === '0') return false;
  return Boolean(raw);
}

function sanitizeText(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(CONTROL_CHARS, '').trim().slice(0, max);
}

function validateBooleanRecord(
  raw: unknown,
  allowedIds: ReadonlySet<string>,
  label: string,
): { ok: true; value: Record<string, boolean> } | SegurancaValidationErr {
  if (raw == null) {
    return { ok: true, value: {} };
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      error: 'seguranca_invalida',
      message: `${label} inválidas`,
    };
  }

  const src = raw as Record<string, unknown>;
  const value: Record<string, boolean> = {};

  for (const key of Object.keys(src)) {
    if (!allowedIds.has(key)) {
      return {
        ok: false,
        error: 'seguranca_invalida',
        message: `${label}: chave desconhecida "${key}"`,
      };
    }
    const val = src[key];
    if (
      val != null &&
      typeof val !== 'boolean' &&
      typeof val !== 'string' &&
      typeof val !== 'number'
    ) {
      return {
        ok: false,
        error: 'seguranca_invalida',
        message: `${label}: "${key}" deve ser boolean`,
      };
    }
    if (coerceBoolean(val)) {
      value[key] = true;
    }
  }

  return { ok: true, value };
}

function validateDispositivos(
  raw: unknown,
): { ok: true; value: Record<string, ListingDispositivo> } | SegurancaValidationErr {
  if (raw == null) {
    return { ok: true, value: {} };
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      error: 'seguranca_invalida',
      message: 'Dispositivos de segurança inválidos',
    };
  }

  const src = raw as Record<string, unknown>;
  const keys = Object.keys(src);
  if (keys.length > DISPOSITIVOS_MAX) {
    return {
      ok: false,
      error: 'seguranca_invalida',
      message: `Máximo de ${DISPOSITIVOS_MAX} dispositivos`,
    };
  }

  const value: Record<string, ListingDispositivo> = {};

  for (const key of keys) {
    if (!DISPOSITIVOS_IDS.has(key)) {
      return {
        ok: false,
        error: 'seguranca_invalida',
        message: `Dispositivo desconhecido: "${key}"`,
      };
    }

    const entry = src[key];
    if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) {
      return {
        ok: false,
        error: 'seguranca_invalida',
        message: `Dispositivo "${key}" inválido`,
      };
    }

    const row = entry as Record<string, unknown>;
    const extraKeys = Object.keys(row).filter((k) => k !== 'ativo' && k !== 'detalhes');
    if (extraKeys.length > 0) {
      return {
        ok: false,
        error: 'seguranca_invalida',
        message: `Dispositivo "${key}": campos desconhecidos`,
      };
    }

    if (
      row.ativo != null &&
      typeof row.ativo !== 'boolean' &&
      typeof row.ativo !== 'string' &&
      typeof row.ativo !== 'number'
    ) {
      return {
        ok: false,
        error: 'seguranca_invalida',
        message: `Dispositivo "${key}": ativo deve ser boolean`,
      };
    }

    const ativo = coerceBoolean(row.ativo);
    if (!ativo) continue;

    const item: ListingDispositivo = { ativo: true };

    if (row.detalhes != null) {
      if (typeof row.detalhes !== 'string') {
        return {
          ok: false,
          error: 'seguranca_invalida',
          message: `Dispositivo "${key}": detalhes inválidos`,
        };
      }
      if (row.detalhes.length > DISPOSITIVO_DETALHES_MAX) {
        return {
          ok: false,
          error: 'seguranca_invalida',
          message: `Detalhes do dispositivo "${key}" deve ter no máximo ${DISPOSITIVO_DETALHES_MAX} caracteres`,
        };
      }
      const cleaned = sanitizeText(row.detalhes, DISPOSITIVO_DETALHES_MAX);
      if (cleaned) {
        item.detalhes = cleaned;
      }
    }

    value[key] = item;
  }

  return { ok: true, value };
}

export function validateListingSeguranca(
  raw: unknown,
): SegurancaValidationOk | SegurancaValidationErr {
  if (raw == null) {
    return { ok: true, value: {} };
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      error: 'seguranca_invalida',
      message: 'Segurança do hóspede inválida',
    };
  }

  const src = raw as Record<string, unknown>;
  for (const key of Object.keys(src)) {
    if (!TOP_LEVEL_KEYS.has(key)) {
      return {
        ok: false,
        error: 'seguranca_invalida',
        message: `Campo desconhecido em segurança: "${key}"`,
      };
    }
  }

  const value: ListingSeguranca = {};

  if (Object.prototype.hasOwnProperty.call(src, 'consideracoes')) {
    const parsed = validateBooleanRecord(
      src.consideracoes,
      CONSIDERACOES_IDS,
      'Considerações de segurança',
    );
    if (!parsed.ok) return parsed;
    if (Object.keys(parsed.value).length > 0) {
      value.consideracoes = parsed.value;
    }
  }

  if (Object.prototype.hasOwnProperty.call(src, 'dispositivos')) {
    const parsed = validateDispositivos(src.dispositivos);
    if (!parsed.ok) return parsed;
    if (Object.keys(parsed.value).length > 0) {
      value.dispositivos = parsed.value;
    }
  }

  if (Object.prototype.hasOwnProperty.call(src, 'infoPropriedade')) {
    const parsed = validateBooleanRecord(
      src.infoPropriedade,
      INFO_PROPRIEDADE_IDS,
      'Informações da propriedade',
    );
    if (!parsed.ok) return parsed;
    if (Object.keys(parsed.value).length > 0) {
      value.infoPropriedade = parsed.value;
    }
  }

  if (Object.prototype.hasOwnProperty.call(src, 'recomendacoesEspeciais')) {
    if (typeof src.recomendacoesEspeciais !== 'string' && src.recomendacoesEspeciais != null) {
      return {
        ok: false,
        error: 'seguranca_invalida',
        message: 'Recomendações especiais inválidas',
      };
    }
    const text =
      typeof src.recomendacoesEspeciais === 'string' ? src.recomendacoesEspeciais : '';
    if (text.length > RECOMENDACOES_ESPECIAIS_MAX) {
      return {
        ok: false,
        error: 'seguranca_invalida',
        message: `Recomendações especiais deve ter no máximo ${RECOMENDACOES_ESPECIAIS_MAX} caracteres`,
      };
    }
    const cleaned = sanitizeText(text, RECOMENDACOES_ESPECIAIS_MAX);
    if (cleaned) {
      value.recomendacoesEspeciais = cleaned;
    }
  }

  return { ok: true, value };
}

/** Card preview for guest safety section. */
export function summarizeSeguranca(seguranca: ListingSeguranca | null | undefined): string {
  const c = Object.values(seguranca?.consideracoes ?? {}).filter(Boolean).length;
  const d = Object.values(seguranca?.dispositivos ?? {}).filter((x) => x?.ativo).length;
  if (c + d === 0) return 'Adicionar informações';
  return `${c} consideração(ões) · ${d} dispositivo(s)`;
}
