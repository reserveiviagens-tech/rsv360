/**
 * Listing location metadata (metadata.localizacao).
 */

export const LOCALIZACAO_TEXTO_CURTO_MAX = 120;
export const LOCALIZACAO_TEXTO_LONGO_MAX = 1000;

export const LOCALIZACAO_CARACTERISTICAS_CATALOG = [
  { id: 'praia', label: 'Perto da praia' },
  { id: 'centro', label: 'Centro da cidade' },
  { id: 'rural', label: 'Área rural / campo' },
  { id: 'montanha', label: 'Montanha' },
  { id: 'lago', label: 'Perto de lago / rio' },
  { id: 'transporte', label: 'Fácil acesso a transporte público' },
  { id: 'comercio', label: 'Comércio e serviços próximos' },
  { id: 'natureza', label: 'Contato com a natureza' },
] as const;

export const LOCALIZACAO_VISTAS_CATALOG = [
  { id: 'mar', label: 'Vista para o mar' },
  { id: 'montanha', label: 'Vista para montanhas' },
  { id: 'cidade', label: 'Vista da cidade' },
  { id: 'jardim', label: 'Vista para jardim' },
  { id: 'piscina', label: 'Vista para piscina' },
  { id: 'lago', label: 'Vista para lago / rio' },
  { id: 'campo', label: 'Vista para o campo' },
] as const;

export type LocalizacaoCaracteristicaId =
  (typeof LOCALIZACAO_CARACTERISTICAS_CATALOG)[number]['id'];
export type LocalizacaoVistaId = (typeof LOCALIZACAO_VISTAS_CATALOG)[number]['id'];

export type ListingLocalizacao = {
  endereco?: string;
  apto?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  /** Reference pin for web GPS verification (metadata-only). */
  lat?: number;
  lng?: number;
  mostrarExata?: boolean;
  caracteristicas?: LocalizacaoCaracteristicaId[];
  descricaoBairro?: string;
  locomocao?: string;
  vistas?: LocalizacaoVistaId[];
};

export type LocalizacaoValidationOk = { ok: true; value: ListingLocalizacao };
export type LocalizacaoValidationErr = {
  ok: false;
  error: 'localizacao_invalida';
  message: string;
};

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const UF_OK = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);

const CARACTERISTICA_IDS = new Set(
  LOCALIZACAO_CARACTERISTICAS_CATALOG.map((c) => c.id),
);
const VISTA_IDS = new Set(LOCALIZACAO_VISTAS_CATALOG.map((v) => v.id));

function sanitizeShort(raw: unknown, max = LOCALIZACAO_TEXTO_CURTO_MAX): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(CONTROL_CHARS, '').trim().slice(0, max);
}

function sanitizeLong(raw: unknown, max = LOCALIZACAO_TEXTO_LONGO_MAX): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(CONTROL_CHARS, '').slice(0, max);
}

function normalizeUf(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const uf = raw.replace(CONTROL_CHARS, '').trim().toUpperCase().slice(0, 2);
  if (!uf) return undefined;
  if (!UF_OK.has(uf)) return undefined;
  return uf;
}

function normalizeCep(raw: unknown): string | undefined {
  if (typeof raw !== 'string' && typeof raw !== 'number') return undefined;
  const digits = String(raw).replace(/\D/g, '').slice(0, 8);
  if (!digits) return undefined;
  if (digits.length === 8) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return digits;
}

function normalizeCoord(raw: unknown, min: number, max: number): number | undefined {
  const n =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? Number.parseFloat(raw)
        : Number.NaN;
  if (!Number.isFinite(n) || n < min || n > max) return undefined;
  return Math.round(n * 1e6) / 1e6;
}

function normalizeIdList(
  raw: unknown,
  allowed: Set<string>,
): { ok: true; value: string[] } | { ok: false; message: string } {
  if (raw == null) return { ok: true, value: [] };
  if (!Array.isArray(raw)) {
    return { ok: false, message: 'Lista de localização inválida' };
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== 'string') {
      return { ok: false, message: 'Item de localização inválido' };
    }
    const id = item.trim();
    if (!id) continue;
    if (!allowed.has(id)) {
      return { ok: false, message: `Característica/vista não permitida: ${id}` };
    }
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return { ok: true, value: out };
}

export function validateListingLocalizacao(
  raw: unknown,
): LocalizacaoValidationOk | LocalizacaoValidationErr {
  if (raw == null) {
    return { ok: true, value: {} };
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      error: 'localizacao_invalida',
      message: 'Localização inválida',
    };
  }

  const src = raw as Record<string, unknown>;
  const value: ListingLocalizacao = {};

  const endereco = sanitizeShort(src.endereco);
  if (endereco) value.endereco = endereco;
  const apto = sanitizeShort(src.apto, 40);
  if (apto) value.apto = apto;
  const bairro = sanitizeShort(src.bairro);
  if (bairro) value.bairro = bairro;
  const cidade = sanitizeShort(src.cidade);
  if (cidade) value.cidade = cidade;

  if (Object.prototype.hasOwnProperty.call(src, 'uf') && src.uf != null && src.uf !== '') {
    const uf = normalizeUf(src.uf);
    if (!uf) {
      return {
        ok: false,
        error: 'localizacao_invalida',
        message: 'UF inválida',
      };
    }
    value.uf = uf;
  }

  if (Object.prototype.hasOwnProperty.call(src, 'cep') && src.cep != null && src.cep !== '') {
    const cep = normalizeCep(src.cep);
    if (!cep || cep.replace(/\D/g, '').length !== 8) {
      return {
        ok: false,
        error: 'localizacao_invalida',
        message: 'CEP inválido',
      };
    }
    value.cep = cep;
  }

  if (Object.prototype.hasOwnProperty.call(src, 'lat') && src.lat != null && src.lat !== '') {
    const lat = normalizeCoord(src.lat, -90, 90);
    if (lat == null) {
      return {
        ok: false,
        error: 'localizacao_invalida',
        message: 'Latitude inválida',
      };
    }
    value.lat = lat;
  }

  if (Object.prototype.hasOwnProperty.call(src, 'lng') && src.lng != null && src.lng !== '') {
    const lng = normalizeCoord(src.lng, -180, 180);
    if (lng == null) {
      return {
        ok: false,
        error: 'localizacao_invalida',
        message: 'Longitude inválida',
      };
    }
    value.lng = lng;
  }

  if (Object.prototype.hasOwnProperty.call(src, 'mostrarExata')) {
    if (typeof src.mostrarExata !== 'boolean') {
      return {
        ok: false,
        error: 'localizacao_invalida',
        message: 'mostrarExata deve ser boolean',
      };
    }
    value.mostrarExata = src.mostrarExata;
  }

  if (Object.prototype.hasOwnProperty.call(src, 'caracteristicas')) {
    const list = normalizeIdList(src.caracteristicas, CARACTERISTICA_IDS);
    if (!list.ok) {
      return { ok: false, error: 'localizacao_invalida', message: list.message };
    }
    if (list.value.length) {
      value.caracteristicas = list.value as LocalizacaoCaracteristicaId[];
    }
  }

  if (Object.prototype.hasOwnProperty.call(src, 'vistas')) {
    const list = normalizeIdList(src.vistas, VISTA_IDS);
    if (!list.ok) {
      return { ok: false, error: 'localizacao_invalida', message: list.message };
    }
    if (list.value.length) {
      value.vistas = list.value as LocalizacaoVistaId[];
    }
  }

  if (Object.prototype.hasOwnProperty.call(src, 'descricaoBairro')) {
    if (typeof src.descricaoBairro !== 'string' && src.descricaoBairro != null) {
      return {
        ok: false,
        error: 'localizacao_invalida',
        message: 'Descrição do bairro inválida',
      };
    }
    const text = typeof src.descricaoBairro === 'string' ? src.descricaoBairro : '';
    if (text.length > LOCALIZACAO_TEXTO_LONGO_MAX) {
      return {
        ok: false,
        error: 'localizacao_invalida',
        message: `Descrição do bairro deve ter no máximo ${LOCALIZACAO_TEXTO_LONGO_MAX} caracteres`,
      };
    }
    const cleaned = sanitizeLong(text);
    if (cleaned.trim()) value.descricaoBairro = cleaned;
  }

  if (Object.prototype.hasOwnProperty.call(src, 'locomocao')) {
    if (typeof src.locomocao !== 'string' && src.locomocao != null) {
      return {
        ok: false,
        error: 'localizacao_invalida',
        message: 'Locomoção inválida',
      };
    }
    const text = typeof src.locomocao === 'string' ? src.locomocao : '';
    if (text.length > LOCALIZACAO_TEXTO_LONGO_MAX) {
      return {
        ok: false,
        error: 'localizacao_invalida',
        message: `Locomoção deve ter no máximo ${LOCALIZACAO_TEXTO_LONGO_MAX} caracteres`,
      };
    }
    const cleaned = sanitizeLong(text);
    if (cleaned.trim()) value.locomocao = cleaned;
  }

  return { ok: true, value };
}

/** Card preview for listing location. */
export function summarizeLocalizacao(value: ListingLocalizacao | null | undefined): string | null {
  if (!value || typeof value !== 'object') return null;
  const cidade = typeof value.cidade === 'string' ? value.cidade.trim() : '';
  const uf = typeof value.uf === 'string' ? value.uf.trim() : '';
  const endereco = typeof value.endereco === 'string' ? value.endereco.trim() : '';
  const nCar = Array.isArray(value.caracteristicas) ? value.caracteristicas.length : 0;
  const nVis = Array.isArray(value.vistas) ? value.vistas.length : 0;

  if (cidade && uf) {
    const extra =
      nCar || nVis
        ? ` · ${nCar + nVis} detalhe${nCar + nVis === 1 ? '' : 's'}`
        : '';
    return `${cidade}, ${uf}${extra}`;
  }
  if (endereco) {
    return endereco.length <= 72 ? endereco : `${endereco.slice(0, 71)}…`;
  }
  if (nCar || nVis) {
    return `${nCar} característica(s) · ${nVis} vista(s)`;
  }
  return null;
}
