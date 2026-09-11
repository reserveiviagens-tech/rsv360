/**
 * Arrival guide on listing metadata (metadata.guiaChegada).
 */

export const GUIA_CHEGADA_TEXT_MAX = 4000;
export const INSTRUCOES_CHECKOUT_MAX = 20;
export const INSTRUCAO_CHECKOUT_ID_MAX = 64;
export const INSTRUCAO_CHECKOUT_TITULO_MAX = 200;
export const INSTRUCAO_CHECKOUT_TEXTO_MAX = 4000;

export const GUIA_CHEGADA_STRING_KEYS = [
  'comoChegar',
  'metodoCheckIn',
  'metodoCheckInDetalhe',
  'instrucoesCheckIn',
  'wifiRede',
  'wifiSenha',
  'guiaCasa',
  'preferenciaInteracao',
] as const;

export type GuiaChegadaStringKey = (typeof GUIA_CHEGADA_STRING_KEYS)[number];

export type ListingInstrucaoCheckout = {
  id: string;
  titulo: string;
  texto: string;
};

export type ListingGuiaChegada = {
  comoChegar?: string;
  metodoCheckIn?: string;
  metodoCheckInDetalhe?: string;
  instrucoesCheckIn?: string;
  wifiRede?: string;
  wifiSenha?: string;
  guiaCasa?: string;
  instrucoesCheckout?: ListingInstrucaoCheckout[];
  preferenciaInteracao?: string;
};

export type GuiaChegadaValidationOk = { ok: true; value: ListingGuiaChegada };
export type GuiaChegadaValidationErr = {
  ok: false;
  error: 'guia_chegada_invalido';
  message: string;
};

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const ALLOWED_TOP_KEYS = new Set<string>([
  ...GUIA_CHEGADA_STRING_KEYS,
  'instrucoesCheckout',
]);

const INSTRUCAO_ITEM_KEYS = new Set(['id', 'titulo', 'texto']);

function sanitizeGuiaText(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(CONTROL_CHARS, '').trim().slice(0, max);
}

function validateOptionalStringField(
  raw: unknown,
  label: string,
  max: number,
):
  | { ok: true; value: string | undefined }
  | GuiaChegadaValidationErr {
  if (raw == null || raw === '') {
    return { ok: true, value: undefined };
  }
  if (typeof raw !== 'string') {
    return {
      ok: false,
      error: 'guia_chegada_invalido',
      message: `${label} inválido`,
    };
  }
  if (raw.length > max) {
    return {
      ok: false,
      error: 'guia_chegada_invalido',
      message: `${label} deve ter no máximo ${max} caracteres`,
    };
  }
  const cleaned = sanitizeGuiaText(raw, max);
  return { ok: true, value: cleaned || undefined };
}

function validateInstrucoesCheckout(
  raw: unknown,
): { ok: true; value: ListingInstrucaoCheckout[] | undefined } | GuiaChegadaValidationErr {
  if (raw == null) {
    return { ok: true, value: undefined };
  }
  if (!Array.isArray(raw)) {
    return {
      ok: false,
      error: 'guia_chegada_invalido',
      message: 'Instruções de checkout inválidas',
    };
  }
  if (raw.length > INSTRUCOES_CHECKOUT_MAX) {
    return {
      ok: false,
      error: 'guia_chegada_invalido',
      message: `Máximo de ${INSTRUCOES_CHECKOUT_MAX} instruções de checkout`,
    };
  }

  const value: ListingInstrucaoCheckout[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return {
        ok: false,
        error: 'guia_chegada_invalido',
        message: 'Item de instrução de checkout inválido',
      };
    }

    const src = item as Record<string, unknown>;
    for (const key of Object.keys(src)) {
      if (!INSTRUCAO_ITEM_KEYS.has(key)) {
        return {
          ok: false,
          error: 'guia_chegada_invalido',
          message: `Instrução de checkout: chave desconhecida "${key}"`,
        };
      }
    }

    if (typeof src.id !== 'string') {
      return {
        ok: false,
        error: 'guia_chegada_invalido',
        message: 'ID da instrução de checkout inválido',
      };
    }
    const id = sanitizeGuiaText(src.id, INSTRUCAO_CHECKOUT_ID_MAX);
    if (!id) {
      return {
        ok: false,
        error: 'guia_chegada_invalido',
        message: 'ID da instrução de checkout inválido',
      };
    }

    if (typeof src.titulo !== 'string') {
      return {
        ok: false,
        error: 'guia_chegada_invalido',
        message: 'Título da instrução de checkout inválido',
      };
    }
    if (src.titulo.length > INSTRUCAO_CHECKOUT_TITULO_MAX) {
      return {
        ok: false,
        error: 'guia_chegada_invalido',
        message: `Título da instrução deve ter no máximo ${INSTRUCAO_CHECKOUT_TITULO_MAX} caracteres`,
      };
    }
    const titulo = sanitizeGuiaText(src.titulo, INSTRUCAO_CHECKOUT_TITULO_MAX);
    if (!titulo) {
      return {
        ok: false,
        error: 'guia_chegada_invalido',
        message: 'Título da instrução de checkout é obrigatório',
      };
    }

    if (typeof src.texto !== 'string') {
      return {
        ok: false,
        error: 'guia_chegada_invalido',
        message: 'Texto da instrução de checkout inválido',
      };
    }
    if (src.texto.length > INSTRUCAO_CHECKOUT_TEXTO_MAX) {
      return {
        ok: false,
        error: 'guia_chegada_invalido',
        message: `Texto da instrução deve ter no máximo ${INSTRUCAO_CHECKOUT_TEXTO_MAX} caracteres`,
      };
    }
    const texto = sanitizeGuiaText(src.texto, INSTRUCAO_CHECKOUT_TEXTO_MAX);
    if (!texto) {
      return {
        ok: false,
        error: 'guia_chegada_invalido',
        message: 'Texto da instrução de checkout é obrigatório',
      };
    }

    value.push({ id, titulo, texto });
  }

  return { ok: true, value: value.length ? value : undefined };
}

export function validateListingGuiaChegada(
  raw: unknown,
): GuiaChegadaValidationOk | GuiaChegadaValidationErr {
  if (raw == null) {
    return { ok: true, value: {} };
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      error: 'guia_chegada_invalido',
      message: 'Guia de chegada inválido',
    };
  }

  const src = raw as Record<string, unknown>;

  for (const key of Object.keys(src)) {
    if (!ALLOWED_TOP_KEYS.has(key)) {
      return {
        ok: false,
        error: 'guia_chegada_invalido',
        message: `Guia de chegada: chave desconhecida "${key}"`,
      };
    }
  }

  const value: ListingGuiaChegada = {};

  const stringLabels: Record<GuiaChegadaStringKey, string> = {
    comoChegar: 'Como chegar',
    metodoCheckIn: 'Método de check-in',
    metodoCheckInDetalhe: 'Detalhe do check-in',
    instrucoesCheckIn: 'Instruções de check-in',
    wifiRede: 'Rede Wi-Fi',
    wifiSenha: 'Senha Wi-Fi',
    guiaCasa: 'Guia da casa',
    preferenciaInteracao: 'Preferência de interação',
  };

  for (const key of GUIA_CHEGADA_STRING_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(src, key)) continue;
    const parsed = validateOptionalStringField(
      src[key],
      stringLabels[key],
      GUIA_CHEGADA_TEXT_MAX,
    );
    if (!parsed.ok) return parsed;
    if (parsed.value) {
      value[key] = parsed.value;
    }
  }

  if (Object.prototype.hasOwnProperty.call(src, 'instrucoesCheckout')) {
    const list = validateInstrucoesCheckout(src.instrucoesCheckout);
    if (!list.ok) return list;
    if (list.value) {
      value.instrucoesCheckout = list.value;
    }
  }

  return { ok: true, value };
}

/** Card preview for "Como chegar" section. */
export function summarizeComoChegar(
  guia: ListingGuiaChegada | null | undefined,
): string {
  const text =
    guia && typeof guia.comoChegar === 'string' ? guia.comoChegar.trim() : '';
  if (!text) return 'Adicionar informações';
  const collapsed = text.replace(/\s+/g, ' ');
  return collapsed.length <= 40 ? collapsed : `${collapsed.slice(0, 39)}…`;
}
