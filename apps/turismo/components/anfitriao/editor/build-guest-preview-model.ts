import { resolveUnitThumbUrl, compactThumbUrl, unitThumbPlaceholder } from '../unit-thumb';
import { AMENITY_CATALOG } from './amenity-catalog';
import type { EditorMeta } from './editor-types';
import { normalizeListingSlugClient } from './LinkPersonalizadoEditor';
import {
  TIPO_PROPRIEDADE_ACOMODACOES,
  TIPO_PROPRIEDADE_TIPOS,
} from './TipoPropriedadeEditor';

/** Raw editor snapshot — may include internal fields; stripped by buildGuestPreviewModel. */
export type GuestPreviewEditorInput = {
  titulo: string;
  preco: string;
  capacidade: number;
  descAnuncio: string;
  amenities: Set<string>;
  tipoProp?: EditorMeta['tipoPropriedade'];
  localizacao?: EditorMeta['localizacao'];
  midiaJson: string;
  midiaFallback?: unknown;
  /** Persisted slug on unit (for safe public link only). */
  savedSlug?: string;
  /** Persisted status on unit metadata (for safe public link only). */
  savedStatusAnuncio?: EditorMeta['statusAnuncio'];
  statusPublicacao?: string;
  ativo?: boolean;
  modoReserva?: EditorMeta['modoReserva'];
  quartos?: number | null;
  mensagemPreReserva?: string;
  localVerificado?: boolean;
};

export type GuestPreviewModel = {
  titulo: string;
  heroUrl: string;
  locationLine: string | null;
  metaLine: string | null;
  precoLabel: string | null;
  descricaoExcerpt: string | null;
  enderecoPublico: string | null;
  galleryUrls: string[];
  capacidadeLabel: string | null;
  quartosLabel: string | null;
  modoReservaLabel: string | null;
  localVerificado: boolean;
  mensagemPreReserva: string | null;
  amenityChips: Array<{ id: string; label: string; icon: string }>;
  publicPageUrl: string | null;
};

const AMENITY_CHIP_MAX = 8;
const DESCRICAO_EXCERPT_MAX = 320;
const GALLERY_MAX = 6;

export function publicListingHref(slug: string): string {
  const base =
    typeof window !== 'undefined'
      ? process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}/h/${slug}`;
}

function parseMidia(midiaJson: string, fallback: unknown): unknown {
  try {
    return JSON.parse(midiaJson || '{}');
  } catch {
    return fallback;
  }
}

function extractPhotoUrls(midia: unknown): string[] {
  if (!midia || typeof midia !== 'object' || Array.isArray(midia)) return [];
  const o = midia as Record<string, unknown>;
  const itensRaw = Array.isArray(o.itens) ? o.itens : null;
  const fotosRaw = o.fotos ?? o.images ?? o.photos;
  const urls: string[] = [];
  const seen = new Set<string>();

  const pushUrl = (raw: unknown) => {
    if (typeof raw !== 'string') return;
    const url = raw.trim();
    if (!url || seen.has(url)) return;
    seen.add(url);
    urls.push(url);
  };

  if (itensRaw) {
    for (const raw of itensRaw) {
      if (typeof raw === 'string') pushUrl(raw);
      else if (raw && typeof raw === 'object') {
        const r = raw as Record<string, unknown>;
        pushUrl(r.url);
      }
    }
  }

  if (Array.isArray(fotosRaw)) {
    for (const raw of fotosRaw) {
      if (typeof raw === 'string') pushUrl(raw);
      else if (raw && typeof raw === 'object') {
        const r = raw as Record<string, unknown>;
        pushUrl(r.url);
      }
    }
  }

  if (typeof o.capa === 'string' && o.capa.trim()) {
    const capa = o.capa.trim();
    if (!seen.has(capa)) {
      seen.add(capa);
      urls.unshift(capa);
    }
  }

  return urls;
}

function resolveHeroUrl(midiaJson: string, midiaFallback: unknown, titulo: string): string {
  const parsed = parseMidia(midiaJson, midiaFallback);
  const thumb = resolveUnitThumbUrl(parsed) ?? resolveUnitThumbUrl(midiaFallback);
  if (thumb) return compactThumbUrl(thumb, 640);
  return unitThumbPlaceholder(0, titulo);
}

function resolveGalleryUrls(midiaJson: string, midiaFallback: unknown): string[] {
  const parsed = parseMidia(midiaJson, midiaFallback);
  const fromParsed = extractPhotoUrls(parsed);
  const fromFallback = fromParsed.length ? [] : extractPhotoUrls(midiaFallback);
  const merged = fromParsed.length ? fromParsed : fromFallback;
  return merged.slice(0, GALLERY_MAX).map((url) => compactThumbUrl(url, 480));
}

function parsePrecoLabel(preco: string): string | null {
  const raw = String(preco ?? '').trim().replace(',', '.');
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} / noite`;
}

function formatLocationMeta(localizacao?: EditorMeta['localizacao']): string | null {
  if (!localizacao) return null;
  const parts = [localizacao.bairro, localizacao.cidade, localizacao.uf]
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

function resolveEnderecoPublico(localizacao?: EditorMeta['localizacao']): string | null {
  if (!localizacao?.mostrarExata) return null;
  const endereco = String(localizacao.endereco ?? '').trim();
  return endereco || null;
}

function formatTypeMeta(tipoProp?: EditorMeta['tipoPropriedade']): string | null {
  if (!tipoProp) return null;
  const tipoLabel = TIPO_PROPRIEDADE_TIPOS.find((t) => t.id === tipoProp.tipo)?.label;
  const acoLabel = TIPO_PROPRIEDADE_ACOMODACOES.find(
    (t) => t.id === (tipoProp.acomodacao || tipoProp.representacao),
  )?.label;
  return tipoLabel || acoLabel || null;
}

function formatGuestsMeta(capacidade: number): string | null {
  const n = Math.max(1, Math.floor(Number(capacidade) || 1));
  return n === 1 ? '1 hóspede' : `${n} hóspedes`;
}

function formatCapacidadeLabel(capacidade: number): string | null {
  const n = Math.max(1, Math.floor(Number(capacidade) || 1));
  return n === 1 ? 'Até 1 hóspede' : `Até ${n} hóspedes`;
}

function formatQuartosLabel(quartos?: number | null): string | null {
  if (quartos == null || !Number.isFinite(Number(quartos))) return null;
  const n = Math.floor(Number(quartos));
  if (n <= 0) return null;
  return `${n} quarto(s)`;
}

function formatModoReservaLabel(modo?: EditorMeta['modoReserva']): string | null {
  if (!modo) return null;
  return modo === 'instantanea'
    ? 'Reserva instantânea'
    : 'Pedido sujeito à aprovação do anfitrião';
}

function buildMetaLine(
  capacidade: number,
  tipoProp?: EditorMeta['tipoPropriedade'],
  localizacao?: EditorMeta['localizacao'],
): string | null {
  const parts = [
    formatGuestsMeta(capacidade),
    formatTypeMeta(tipoProp),
    formatLocationMeta(localizacao),
  ].filter(Boolean) as string[];
  return parts.length ? parts.join(' · ') : null;
}

function excerptDescricao(descAnuncio: string): string | null {
  const text = String(descAnuncio ?? '').trim();
  if (!text) return null;
  if (text.length <= DESCRICAO_EXCERPT_MAX) return text;
  return `${text.slice(0, DESCRICAO_EXCERPT_MAX).trimEnd()}…`;
}

function buildAmenityChips(amenities: Set<string>): GuestPreviewModel['amenityChips'] {
  return AMENITY_CATALOG.filter((a) => amenities.has(a.id))
    .slice(0, AMENITY_CHIP_MAX)
    .map((a) => ({ id: a.id, label: a.label, icon: a.icon }));
}

function resolveSafePublicPageUrl(input: GuestPreviewEditorInput): string | null {
  const slug = normalizeListingSlugClient(input.savedSlug ?? '');
  if (!slug) return null;
  if (input.savedStatusAnuncio === 'nao_anunciado') return null;
  const pub = String(input.statusPublicacao ?? '').toLowerCase();
  if (pub !== 'publicado') return null;
  if (input.ativo === false) return null;
  return publicListingHref(slug);
}

function sanitizeMensagemPreReserva(raw?: string): string | null {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  return text.length <= 400 ? text : `${text.slice(0, 400).trimEnd()}…`;
}

/**
 * Builds a guest-safe listing preview from editor state.
 * Strips internal/host-only fields (Wi-Fi password, check-in secrets, nomeInterno, etc.).
 */
export function buildGuestPreviewModel(input: GuestPreviewEditorInput): GuestPreviewModel {
  const titulo = String(input.titulo ?? '').trim() || 'Anúncio';

  return {
    titulo,
    heroUrl: resolveHeroUrl(input.midiaJson, input.midiaFallback, titulo),
    locationLine: formatLocationMeta(input.localizacao),
    metaLine: buildMetaLine(input.capacidade, input.tipoProp, input.localizacao),
    precoLabel: parsePrecoLabel(input.preco),
    descricaoExcerpt: excerptDescricao(input.descAnuncio),
    enderecoPublico: resolveEnderecoPublico(input.localizacao),
    galleryUrls: resolveGalleryUrls(input.midiaJson, input.midiaFallback),
    capacidadeLabel: formatCapacidadeLabel(input.capacidade),
    quartosLabel: formatQuartosLabel(input.quartos),
    modoReservaLabel: formatModoReservaLabel(input.modoReserva),
    localVerificado: Boolean(input.localVerificado),
    mensagemPreReserva: sanitizeMensagemPreReserva(input.mensagemPreReserva),
    amenityChips: buildAmenityChips(input.amenities),
    publicPageUrl: resolveSafePublicPageUrl(input),
  };
}

/** Test helper — fields that must never appear in guest preview output. */
export function guestPreviewMustExcludeInternal(input: Record<string, unknown>): boolean {
  const forbiddenKeys = [
    'nomeInterno',
    'wifiSenha',
    'wifiRede',
    'metodoCheckInDetalhe',
    'instrucoesCheckIn',
    'guiaCasa',
    'impostos',
    'coanfitrioes',
    'instrucoesCheckout',
  ];
  return forbiddenKeys.every((key) => !(key in input));
}
