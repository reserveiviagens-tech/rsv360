export type RentalListingStatus = 'leased' | 'for_rent' | 'application';

export type RentalPortfolioItem = {
  id: string;
  name: string;
  address: string;
  area: string;
  units: number;
  occupied: number;
  rent: string;
  rentAmount: number;
  roll: string;
  type: string;
  photo: string;
  listingStatus: RentalListingStatus;
  applications?: number;
  leaseEndsInDays?: number;
  vacantUnits?: number;
  nextLeaseEndDays?: number;
  agentAvatarUrl?: string;
  tags?: string[];
  createdAt: string;
};

export const RENT_ROLL_SERIES = [300, 308, 312, 318, 322, 328, 335, 342, 348, 352, 358, 363] as const;
export const RENT_ROLL_FLOOR_K = 300;

export const RENT_ROLL_MONTHS = [
  'Dec',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
] as const;

const AGENT_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';

export const SAMPLE_RENTAL_PORTFOLIO: RentalPortfolioItem[] = [
  {
    id: 'r1',
    name: 'Arbor Tower',
    address: '1240 5th Ave',
    area: 'Downtown',
    units: 48,
    occupied: 44,
    rent: '$3,700/mo',
    rentAmount: 3700,
    roll: '$177,600/mo',
    type: 'High-rise',
    photo: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80',
    listingStatus: 'for_rent',
    vacantUnits: 4,
    nextLeaseEndDays: 1,
    agentAvatarUrl: AGENT_AVATAR,
    tags: ['High-rise', 'Pet friendly'],
    createdAt: '2026-09-01',
  },
  {
    id: 'r2',
    name: 'Northbank Lofts',
    address: '880 Front St',
    area: 'Marina',
    units: 36,
    occupied: 31,
    rent: '$4,200/mo',
    rentAmount: 4200,
    roll: '$130,200/mo',
    type: 'Lofts',
    photo: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80',
    listingStatus: 'for_rent',
    vacantUnits: 5,
    nextLeaseEndDays: 24,
    agentAvatarUrl: AGENT_AVATAR,
    createdAt: '2026-08-12',
  },
  {
    id: 'r3',
    name: 'Quayside Apartments',
    address: '210 Harbor Dr',
    area: 'Embarcadero',
    units: 18,
    occupied: 17,
    rent: '$3,200/mo',
    rentAmount: 3200,
    roll: '$54,400/mo',
    type: 'Waterfront',
    photo: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=600&q=80',
    listingStatus: 'application',
    applications: 1,
    vacantUnits: 1,
    nextLeaseEndDays: 5,
    agentAvatarUrl: AGENT_AVATAR,
    tags: ['Waterfront', 'Parking'],
    createdAt: '2026-10-20',
  },
  {
    id: 'r4',
    name: 'Stonebrook Cabin',
    address: '44 Pine Rd',
    area: 'Julian',
    units: 1,
    occupied: 1,
    rent: '$2,950/mo',
    rentAmount: 2950,
    roll: '$2,950/mo',
    type: 'Cabin',
    photo: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
    listingStatus: 'leased',
    leaseEndsInDays: 214,
    agentAvatarUrl: AGENT_AVATAR,
    createdAt: '2026-07-05',
  },
  {
    id: 'r5',
    name: 'Harbor View Residences',
    address: '18 Seaport Blvd',
    area: 'La Jolla',
    units: 24,
    occupied: 19,
    rent: '$5,100/mo',
    rentAmount: 5100,
    roll: '$96,900/mo',
    type: 'Waterfront',
    photo: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80',
    listingStatus: 'for_rent',
    applications: 2,
    vacantUnits: 5,
    agentAvatarUrl: AGENT_AVATAR,
    createdAt: '2026-11-01',
  },
  {
    id: 'r6',
    name: 'Mission Terrace',
    address: '412 Cortez St',
    area: 'Mission Valley',
    units: 12,
    occupied: 8,
    rent: '$2,950/mo',
    rentAmount: 2950,
    roll: '$23,600/mo',
    type: 'Mid-rise',
    photo: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
    listingStatus: 'for_rent',
    vacantUnits: 4,
    nextLeaseEndDays: 7,
    agentAvatarUrl: AGENT_AVATAR,
    createdAt: '2026-06-18',
  },
];

export type LeaseCalendarEventKind = 'sign' | 'lease_end' | 'review';

export type LeaseCalendarItem = {
  id: string;
  title: string;
  sub: string;
  time: string;
  tone: 'blue' | 'apricot';
  monthLabel: string;
  dayLabel: string;
  action: 'check' | 'calendar-plus';
  eventKind: LeaseCalendarEventKind;
};

export const SAMPLE_LEASE_CALENDAR: LeaseCalendarItem[] = [
  {
    id: 'lc1',
    title: 'Sign lease — Quayside 3C',
    sub: 'Quayside Apartments · Grace Liu',
    time: 'in 1 h',
    tone: 'blue',
    monthLabel: 'Nov',
    dayLabel: '10',
    action: 'check',
    eventKind: 'sign',
  },
  {
    id: 'lc2',
    title: '3 leases end — Arbor Tower',
    sub: 'Nov 10 – Nov 24 · Downtown',
    time: 'in 1 d',
    tone: 'apricot',
    monthLabel: 'Nov',
    dayLabel: '11',
    action: 'calendar-plus',
    eventKind: 'lease_end',
  },
  {
    id: 'lc3',
    title: '2 leases end — Northbank Lofts',
    sub: 'Yuki Mori · Marina',
    time: 'in 7 d',
    tone: 'apricot',
    monthLabel: 'Nov',
    dayLabel: '17',
    action: 'calendar-plus',
    eventKind: 'lease_end',
  },
  {
    id: 'lc4',
    title: '2 leases end — Quayside Apartments',
    sub: 'Nov 17 · Embarcadero',
    time: 'in 7 d',
    tone: 'apricot',
    monthLabel: 'Nov',
    dayLabel: '17',
    action: 'calendar-plus',
    eventKind: 'lease_end',
  },
  {
    id: 'lc5',
    title: 'Lease ends — Arbor Tower 12B',
    sub: 'Ren Takeda · Downtown',
    time: 'in 45 d',
    tone: 'apricot',
    monthLabel: 'Nov',
    dayLabel: '18',
    action: 'calendar-plus',
    eventKind: 'lease_end',
  },
  {
    id: 'lc6',
    title: 'Lease ends — Stonebrook Cabin',
    sub: 'Nora Whitfield · Julian',
    time: 'in 82 d',
    tone: 'apricot',
    monthLabel: 'Dec',
    dayLabel: '2',
    action: 'calendar-plus',
    eventKind: 'lease_end',
  },
  {
    id: 'lc7',
    title: 'Lease review — Mission Terrace',
    sub: 'Mission Valley · 4 vacant units',
    time: 'in 7 d',
    tone: 'apricot',
    monthLabel: 'Nov',
    dayLabel: '16',
    action: 'calendar-plus',
    eventKind: 'review',
  },
];

export function rentalMatchesFilter(
  item: RentalPortfolioItem,
  filter: 'all' | 'vacant' | 'let' | 'application',
): boolean {
  if (filter === 'all') return true;
  if (filter === 'vacant') return (item.vacantUnits ?? item.units - item.occupied) > 0;
  if (filter === 'let') return item.listingStatus === 'leased';
  /** Paridade Lintel: pílula Application conta só imóveis em candidatura ativa. */
  if (filter === 'application') return item.listingStatus === 'application';
  return true;
}

export function rentalFilterCounts(items: RentalPortfolioItem[]) {
  return {
    all: items.length,
    vacant: items.filter((i) => rentalMatchesFilter(i, 'vacant')).length,
    let: items.filter((i) => rentalMatchesFilter(i, 'let')).length,
    application: items.filter((i) => rentalMatchesFilter(i, 'application')).length,
  };
}
