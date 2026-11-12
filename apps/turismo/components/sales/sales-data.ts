export type SalesListingStatus = 'draft' | 'active' | 'offer' | 'sold';

export type SalesPropertyType = 'house' | 'villa' | 'cabin' | 'estate';

export type SalesTypeFilter = 'any' | SalesPropertyType;

export type SalesBedsFilter = 'any' | '2' | '3' | '4' | '5';

export type SalesSortKey = 'newest' | 'dom-desc' | 'price-asc' | 'price-desc';

export type SalesViewMode = 'grid' | 'list' | 'map';

export type SalesListing = {
  id: string;
  slug: string;
  name: string;
  address: string;
  area: string;
  propertyType: SalesPropertyType;
  /** ISO-ish key for “newest listing” sort (higher = more recent). */
  listedOrder: number;
  mapTop: string;
  mapLeft: string;
  price: string;
  priceShort?: string;
  bestOfferLabel?: string;
  estimate?: string;
  beds: number;
  baths: number;
  sqft: string;
  dom: number;
  views: number;
  saves?: number;
  inquiries?: number;
  status: SalesListingStatus;
  agent: string;
  agentAvatarUrl: string;
  photo: string;
  deltaPct?: number;
};

const AGENT =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';

export const SAMPLE_SALES_LISTINGS: SalesListing[] = [
  {
    id: 's1',
    slug: 'hollis-modern-house',
    name: 'Hollis Modern House',
    address: '18 Hollis Ct',
    area: 'La Jolla, San Diego, CA',
    propertyType: 'house',
    listedOrder: 8,
    mapTop: '28%',
    mapLeft: '58%',
    price: '$1.24M',
    priceShort: '$1.24M',
    bestOfferLabel: '$1.215M',
    estimate: '$1.215M',
    beds: 4,
    baths: 3,
    sqft: '2,380',
    dom: 24,
    views: 1842,
    saves: 126,
    inquiries: 31,
    status: 'offer',
    agent: 'Imani Brooks',
    agentAvatarUrl: AGENT,
    photo: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80',
    deltaPct: 4.6,
  },
  {
    id: 's2',
    slug: 'cedar-ridge-house',
    name: 'Cedar Ridge House',
    address: '710 Pinecrest Rd',
    area: 'Julian, CA',
    propertyType: 'house',
    listedOrder: 5,
    mapTop: '38%',
    mapLeft: '42%',
    price: '$1.4M',
    estimate: '$1.31M',
    beds: 3,
    baths: 3,
    sqft: '2,150',
    dom: 72,
    views: 1897,
    status: 'active',
    agent: 'Jordan Ellis',
    agentAvatarUrl: AGENT,
    photo: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
    deltaPct: 6.9,
  },
  {
    id: 's3',
    slug: 'hvar-cliff-house',
    name: 'Hvar Cliff House',
    address: '420 Cliff Dr',
    area: 'Del Mar, CA',
    propertyType: 'villa',
    listedOrder: 9,
    mapTop: '22%',
    mapLeft: '72%',
    price: '$3.45M',
    estimate: '$3.6M',
    beds: 4,
    baths: 6,
    sqft: '4,100',
    dom: 17,
    views: 1607,
    status: 'active',
    agent: 'Henrik Dahl',
    agentAvatarUrl: AGENT,
    photo: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80',
    deltaPct: -4.2,
  },
  {
    id: 's4',
    slug: 'marea-desert-villa',
    name: 'Marea Desert Villa',
    address: '55 Ocotillo Ln',
    area: 'Palm Springs, CA',
    propertyType: 'villa',
    listedOrder: 6,
    mapTop: '48%',
    mapLeft: '78%',
    price: '$1.65M',
    estimate: '$1.68M',
    beds: 3,
    baths: 4,
    sqft: '3,200',
    dom: 40,
    views: 3120,
    status: 'active',
    agent: 'Imani Brooks',
    agentAvatarUrl: AGENT,
    photo: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80',
    deltaPct: -1.8,
  },
  {
    id: 's5',
    slug: 'casa-alva',
    name: 'Casa Alva',
    address: '14 Alva Mesa',
    area: 'Rancho Santa Fe, CA',
    propertyType: 'estate',
    listedOrder: 7,
    mapTop: '35%',
    mapLeft: '48%',
    price: '$2.195M',
    estimate: '$2.15M',
    beds: 5,
    baths: 5,
    sqft: '4,600',
    dom: 35,
    views: 2890,
    status: 'active',
    agent: 'Imani Brooks',
    agentAvatarUrl: AGENT,
    photo: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80',
    deltaPct: 2.1,
  },
  {
    id: 's6',
    slug: 'linden-long-house',
    name: 'Linden Long House',
    address: '93 Linden Way',
    area: 'Coronado, CA',
    propertyType: 'house',
    listedOrder: 3,
    mapTop: '52%',
    mapLeft: '34%',
    price: '$1.56M',
    estimate: '$1.56M',
    beds: 4,
    baths: 3,
    sqft: '2,900',
    dom: 28,
    views: 1980,
    status: 'sold',
    agent: 'Henrik Dahl',
    agentAvatarUrl: AGENT,
    photo: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 's7',
    slug: 'mistfield-cabin',
    name: 'Mistfield Cabin',
    address: '102 Mistfield Way',
    area: 'Julian, CA',
    propertyType: 'cabin',
    listedOrder: 4,
    mapTop: '62%',
    mapLeft: '38%',
    price: '$780K',
    estimate: '$760K',
    beds: 2,
    baths: 2,
    sqft: '1,850',
    dom: 51,
    views: 902,
    status: 'active',
    agent: 'Jordan Ellis',
    agentAvatarUrl: AGENT,
    photo: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80',
    deltaPct: 2.6,
  },
  {
    id: 's8',
    slug: 'palm-court-residence',
    name: 'Palm Court Residence',
    address: '880 Coast Hwy',
    area: 'La Jolla, CA',
    propertyType: 'house',
    listedOrder: 10,
    mapTop: '30%',
    mapLeft: '52%',
    price: '$1.87M',
    bestOfferLabel: '$1.84M',
    estimate: '$1.84M',
    beds: 4,
    baths: 4,
    sqft: '3,050',
    dom: 19,
    views: 1420,
    status: 'offer',
    agent: 'Jordan Ellis',
    agentAvatarUrl: AGENT,
    photo: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80',
    deltaPct: 1.6,
  },
  {
    id: 's9',
    slug: 'olive-grove-masseria',
    name: 'Olive Grove Masseria',
    address: '9 Olive Grove Rd',
    area: 'Ramona, CA',
    propertyType: 'estate',
    listedOrder: 2,
    mapTop: '68%',
    mapLeft: '55%',
    price: '$2.4M',
    estimate: '$2.25M',
    beds: 6,
    baths: 5,
    sqft: '4,800',
    dom: 0,
    views: 0,
    status: 'draft',
    agent: 'Henrik Dahl',
    agentAvatarUrl: AGENT,
    photo: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 's10',
    slug: 'larchwood-house',
    name: 'Larchwood House',
    address: '220 Larchwood Ave',
    area: 'Encinitas, CA',
    propertyType: 'house',
    listedOrder: 1,
    mapTop: '44%',
    mapLeft: '62%',
    price: '$1.89M',
    estimate: '$1.87M',
    beds: 4,
    baths: 3,
    sqft: '2,940',
    dom: 33,
    views: 1102,
    status: 'active',
    agent: 'Imani Brooks',
    agentAvatarUrl: AGENT,
    photo: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80',
    deltaPct: 1.1,
  },
];

export const SALES_MARKET_PULSE = SAMPLE_SALES_LISTINGS.filter(
  (l) => l.deltaPct != null && l.status !== 'draft',
)
  .slice(0, 10)
  .map((l) => ({
    slug: l.slug,
    name: l.name,
    deltaPct: l.deltaPct ?? 0,
    above: (l.deltaPct ?? 0) > 0,
  }));

export function salesListingSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function findSalesListingBySlug(slug: string): SalesListing | undefined {
  const normalized = slug.toLowerCase();
  return SAMPLE_SALES_LISTINGS.find((l) => l.slug === normalized || salesListingSlug(l.name) === normalized);
}

export type SalesStatusFilter = 'all' | 'draft' | 'active' | 'offer' | 'sold';

export function salesMatchesFilter(item: SalesListing, filter: SalesStatusFilter): boolean {
  if (filter === 'all') return true;
  return item.status === filter;
}

export function salesPriceSortValue(price: string): number {
  const raw = price.replace(/[$,\s]/g, '');
  if (raw.endsWith('M')) return parseFloat(raw) * 1_000_000;
  if (raw.endsWith('K')) return parseFloat(raw) * 1_000;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

export function salesMatchesType(item: SalesListing, type: SalesTypeFilter): boolean {
  if (type === 'any') return true;
  return item.propertyType === type;
}

export function salesMatchesBeds(item: SalesListing, beds: SalesBedsFilter): boolean {
  if (beds === 'any') return true;
  return item.beds >= Number(beds);
}

export function sortSalesListings(items: SalesListing[], sort: SalesSortKey): SalesListing[] {
  const next = [...items];
  next.sort((a, b) => {
    switch (sort) {
      case 'newest':
        return b.listedOrder - a.listedOrder;
      case 'dom-desc':
        return b.dom - a.dom;
      case 'price-asc':
        return salesPriceSortValue(a.price) - salesPriceSortValue(b.price);
      case 'price-desc':
        return salesPriceSortValue(b.price) - salesPriceSortValue(a.price);
      default:
        return 0;
    }
  });
  return next;
}

export function salesFilterCounts(items: SalesListing[]) {
  return {
    all: items.length,
    draft: items.filter((i) => i.status === 'draft').length,
    active: items.filter((i) => i.status === 'active').length,
    offer: items.filter((i) => i.status === 'offer').length,
    sold: items.filter((i) => i.status === 'sold').length,
  };
}
