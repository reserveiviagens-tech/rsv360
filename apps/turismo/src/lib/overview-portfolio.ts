import type { PortfolioMapPin, PortfolioMapPinKind } from '../../components/lintel/portfolio-map';

const FALLBACK_THUMB =
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=120&q=80';

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
      title: u.titulo,
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
    title: u.titulo,
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
