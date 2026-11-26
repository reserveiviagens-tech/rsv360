import type { PortfolioMapPin, PortfolioMapPinKind } from '../../components/lintel/portfolio-map';
import type { RentalListingStatus, RentalPortfolioItem } from '../../components/rentals/rentals-data';
import type { SalesListing, SalesListingStatus } from '../../components/sales/sales-data';

const FALLBACK_THUMB =
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=120&q=80';

/** Corrige títulos UTF-8 lidos como Latin-1 (ex.: SuÃte → Suíte). */
export function repairUtf8Mojibake(input: string): string {
  if (!input || !/[ÃÂâ€]/.test(input)) return input;
  try {
    const bytes = new Uint8Array([...input].map((c) => c.charCodeAt(0) & 0xff));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return input;
  }
}

export type AnfitriaoUnidadeListItem = {
  id: number;
  titulo: string;
  statusPublicacao?: string;
  precoDiaria?: string | number | null;
  midia?: unknown;
  hotelId?: string;
  quartos?: number | null;
};

export type OverviewHeroListing = {
  title: string;
  location: string;
  price: string;
  beds: string;
  baths: string;
  sqft: string;
  stats: string;
  tag: string;
  img: string;
};

function hashUnitPosition(id: number): { top: string; left: string } {
  const t = 18 + ((id * 17) % 58);
  const l = 12 + ((id * 31) % 72);
  return { top: `${t}%`, left: `${l}%` };
}

function statusToPinKind(status?: string): PortfolioMapPinKind {
  switch (status) {
    case 'publicado':
      return 'rent';
    case 'em_aprovacao':
      return 'offer';
    case 'rascunho':
      return 'sale';
    default:
      return 'rent';
  }
}

function statusLabel(status?: string): string {
  switch (status) {
    case 'publicado':
      return 'Publicado';
    case 'em_aprovacao':
      return 'Em aprovação';
    case 'rascunho':
      return 'Rascunho';
    default:
      return status ?? 'Unidade';
  }
}

function extractThumb(midia: unknown): string {
  if (!midia || typeof midia !== 'object') return FALLBACK_THUMB;
  const m = midia as Record<string, unknown>;
  const capa = m.capa ?? m.cover ?? m.thumbnail;
  if (typeof capa === 'string' && capa.startsWith('http')) return capa;
  const galeria = m.galeria ?? m.fotos;
  if (Array.isArray(galeria) && galeria.length > 0) {
    const first = galeria[0];
    if (typeof first === 'string' && first.startsWith('http')) return first;
    if (first && typeof first === 'object' && typeof (first as { url?: string }).url === 'string') {
      return (first as { url: string }).url;
    }
  }
  return FALLBACK_THUMB;
}

function formatDiariaBrl(value: string | number | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(
    n,
  );
}

export function unidadesToPortfolioPins(units: AnfitriaoUnidadeListItem[]): PortfolioMapPin[] {
  return units.slice(0, 12).map((u) => {
    const pos = hashUnitPosition(u.id);
    return {
      id: String(u.id),
      top: pos.top,
      left: pos.left,
      kind: statusToPinKind(u.statusPublicacao),
      title: repairUtf8Mojibake(u.titulo),
      location: u.hotelId ?? 'RSV360',
      statusLabel: statusLabel(u.statusPublicacao),
      price: `${formatDiariaBrl(u.precoDiaria)}/noite`,
      thumb: extractThumb(u.midia),
    };
  });
}

export function unidadesToHeroListings(units: AnfitriaoUnidadeListItem[]): OverviewHeroListing[] {
  const published = units.filter((u) => u.statusPublicacao === 'publicado');
  const source = published.length > 0 ? published : units;
  if (source.length === 0) return [];

  return source.slice(0, 6).map((u) => ({
    title: repairUtf8Mojibake(u.titulo),
    location: u.hotelId ?? 'Brasil',
    price: formatDiariaBrl(u.precoDiaria),
    beds: u.quartos ? `${u.quartos} qt` : '—',
    baths: '—',
    sqft: '—',
    stats: statusLabel(u.statusPublicacao),
    tag: u.statusPublicacao === 'publicado' ? 'Publicado' : 'Anúncio',
    img: extractThumb(u.midia).replace('w=120', 'w=1000'),
  }));
}

export function portfolioPinSummary(units: AnfitriaoUnidadeListItem[]): string {
  const pub = units.filter((u) => u.statusPublicacao === 'publicado').length;
  const other = units.length - pub;
  if (units.length === 0) return 'Sem unidades no escopo';
  return `${pub} publicada${pub === 1 ? '' : 's'} · ${other} outras`;
}

/**
 * Mapeia unidades do anfitrião (API) para RentalPortfolioItem (demo-like).
 * Usado para preencher a aba Rentals com dados reais quando o parceiro é anfitrião.
 *
 * Regras:
 * - id → string (único dentro do escopo do parceiro)
 * - statusPublicacao → listingStatus: 'publicado' → 'for_rent', 'em_aprovacao' → 'application', 'rascunho' → 'for_rent'
 * - precoDiaria → rent + rentAmount (BRL formatado)
 * - midia → photo (via extractThumb)
 * - quartos → occupied (estimativa: quartos quando disponível, senão 0)
 * - criadoEm não existe na API → '' (data não disponível)
 * - Sem PII extra: não inclui contato, e-mail, telefone do proprietário.
 */
export function unidadesToRentalPortfolio(
  units: AnfitriaoUnidadeListItem[],
): RentalPortfolioItem[] {
  return units.map((u) => {
    const status = statusToListingStatus(u.statusPublicacao);
    const price = formatDiariaBrl(u.precoDiaria);
    const rentAmount = Number(u.precoDiaria) || 0;
    const roll = price.includes('—') ? '—' : `${price}/noite`;
    const vacantUnits = status === 'for_rent' ? 1 : 0;

    return {
      id: `unit-${u.id}`,
      name: repairUtf8Mojibake(u.titulo),
      address: u.hotelId ?? '—',
      area: statusLabel(u.statusPublicacao),
      units: 1,
      occupied: status === 'for_rent' || status === 'application' ? 0 : 1,
      rent: price.includes('—') ? 'Consultar' : `${price}/noite`,
      rentAmount,
      roll,
      type: 'Unidade',
      photo: extractThumb(u.midia),
      listingStatus: status,
      vacantUnits,
      nextLeaseEndDays: undefined,
      agentAvatarUrl: undefined,
      tags: [],
      createdAt: '',
    };
  });
}

function statusToListingStatus(status?: string): RentalListingStatus {
  switch (status) {
    case 'publicado':
      return 'for_rent';
    case 'em_aprovacao':
      return 'application';
    case 'rascunho':
      return 'for_rent';
    default:
      return 'for_rent';
  }
}

const SALES_AGENT_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';

function statusToSalesStatus(status?: string): SalesListingStatus {
  switch (status) {
    case 'publicado':
      return 'active';
    case 'em_aprovacao':
      return 'offer';
    case 'rascunho':
      return 'draft';
    default:
      return 'draft';
  }
}

/**
 * Mapeia unidades do anfitrião (API) para SalesListing (aba Sales).
 * Deep link: `/overview?tab=sales&property=unit-{id}`.
 */
export function unidadesToSalesListings(units: AnfitriaoUnidadeListItem[]): SalesListing[] {
  return units.map((u) => {
    const status = statusToSalesStatus(u.statusPublicacao);
    const name = repairUtf8Mojibake(u.titulo);
    const pos = hashUnitPosition(u.id);
    const price = formatDiariaBrl(u.precoDiaria);
    const priceLabel = price.includes('—') ? 'Consultar' : price;
    const beds = Math.max(1, Number(u.quartos) || 1);

    return {
      id: `unit-${u.id}`,
      slug: `unit-${u.id}`,
      name,
      address: u.hotelId ?? '—',
      area: statusLabel(u.statusPublicacao),
      propertyType: 'house',
      listedOrder: u.id,
      mapTop: pos.top,
      mapLeft: pos.left,
      price: priceLabel,
      priceShort: priceLabel,
      beds,
      baths: 1,
      sqft: '—',
      dom: 0,
      views: 0,
      status,
      agent: 'RSV360',
      agentAvatarUrl: SALES_AGENT_AVATAR,
      photo: extractThumb(u.midia),
    };
  });
}
