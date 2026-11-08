import type { DealRecord, DealStage } from '../schema';

const todayIsoDate = (): string => new Date().toISOString().slice(0, 10);

/** Demo pipeline store (Fase 2 — substituir por persistência quando CRM deals existir). */
const SEED_DEALS: DealRecord[] = [
  {
    id: 'deal_001',
    agentId: 'agent_1',
    agentName: 'Imani Brooks',
    propertyId: 'prop_101',
    propertyName: 'Vista Mare House',
    location: 'La Jolla Cove · For sale',
    propertyType: 'House',
    beds: 5,
    baths: 4,
    sqft: 3200,
    price: 1_850_000,
    commission: 27_750,
    stage: 'negotiation',
    nextStep: 'Negociando condição de fechamento',
    createdAt: '2026-08-15',
    updatedAt: '2026-11-05',
    listingSource: 'realtor',
    status: 'active',
  },
  {
    id: 'deal_002',
    agentId: 'agent_2',
    agentName: 'Jordan Ellis',
    propertyId: 'prop_102',
    propertyName: 'Casa Alva',
    location: 'Rancho Santa Fe · Sold',
    propertyType: 'Villa',
    beds: 6,
    baths: 5,
    sqft: 4100,
    price: 2_195_000,
    commission: 39_510,
    stage: 'closed',
    nextStep: 'Transferência realizada',
    createdAt: '2026-07-20',
    updatedAt: '2026-09-10',
    listingSource: 'direct',
    status: 'active',
  },
  {
    id: 'deal_003',
    agentId: 'agent_1',
    agentName: 'Imani Brooks',
    propertyId: 'prop_103',
    propertyName: 'Arbor Tower',
    location: 'Downtown · For rent',
    propertyType: 'Apartment',
    beds: 2,
    baths: 2,
    sqft: 1200,
    price: 3_700,
    commission: 555,
    stage: 'viewing',
    nextStep: 'Agendando first viewing',
    createdAt: '2026-10-20',
    updatedAt: '2026-11-07',
    listingSource: 'zillow',
    status: 'active',
  },
  {
    id: 'deal_004',
    agentId: 'agent_3',
    agentName: 'Camila Duarte',
    propertyId: 'prop_104',
    propertyName: 'Cedar Ridge House',
    location: 'Julian · For sale',
    propertyType: 'House',
    beds: 4,
    baths: 3,
    sqft: 2800,
    price: 1_400_000,
    commission: 21_000,
    stage: 'offer',
    nextStep: 'Recebendo respostas de 3 corretores',
    createdAt: '2026-10-10',
    updatedAt: '2026-11-06',
    listingSource: 'zillow',
    status: 'active',
  },
  {
    id: 'deal_005',
    agentId: 'agent_2',
    agentName: 'Jordan Ellis',
    propertyId: 'prop_105',
    propertyName: 'Ocean Breeze',
    location: 'Del Mar · For sale',
    propertyType: 'Villa',
    beds: 5,
    baths: 4,
    sqft: 3900,
    price: 2_450_000,
    commission: 26_950,
    stage: 'offer',
    nextStep: 'Submetendo proposta a $2.4M',
    createdAt: '2026-09-05',
    updatedAt: '2026-11-04',
    listingSource: 'realtor',
    status: 'active',
  },
  {
    id: 'deal_006',
    agentId: 'agent_4',
    agentName: 'Henrik Dahl',
    propertyId: 'prop_106',
    propertyName: 'Hollis Modern House',
    location: 'La Jolla · For sale',
    propertyType: 'House',
    beds: 4,
    baths: 3,
    sqft: 3100,
    price: 1_240_000,
    commission: 18_600,
    stage: 'viewing',
    nextStep: 'Primeira audiência marcada',
    createdAt: '2026-11-01',
    updatedAt: '2026-11-07',
    listingSource: 'direct',
    status: 'active',
  },
];

const store = new Map<string, DealRecord>(
  SEED_DEALS.map((d) => [d.id, { ...d }]),
);

const STAFF_ROLES = new Set(['admin', 'manager']);

const PARCEIRO_ROLES = new Set(['anfitriao', 'corretor', 'agente', 'promotor']);

export function listDeals(): DealRecord[] {
  return Array.from(store.values()).map((d) => ({ ...d }));
}

export function getDeal(id: string): DealRecord | undefined {
  const deal = store.get(id);
  return deal ? { ...deal } : undefined;
}

/**
 * Demo store: staff e parceiros autenticados podem mover cards do seed compartilhado.
 * Persistência real deve validar agentId / ownerUserId contra o usuário.
 */
export function canMutateDeal(_userId: number, role: string, _deal: DealRecord): boolean {
  if (STAFF_ROLES.has(role)) return true;
  return PARCEIRO_ROLES.has(role);
}

export function updateDealStage(
  userId: number,
  role: string,
  dealId: string,
  stage: DealStage,
): DealRecord {
  const deal = store.get(dealId);
  if (!deal) {
    throw new DealsNotFoundError('Negócio não encontrado');
  }
  if (!canMutateDeal(userId, role, deal)) {
    throw new DealsForbiddenError('Sem permissão para alterar este negócio');
  }
  const updated: DealRecord = {
    ...deal,
    stage,
    updatedAt: todayIsoDate(),
    status: stage === 'closed' ? 'won' : deal.status === 'won' ? 'active' : deal.status,
  };
  store.set(dealId, updated);
  return { ...updated };
}

export class DealsNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DealsNotFoundError';
  }
}

export class DealsForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DealsForbiddenError';
  }
}

/** Test-only reset */
export function __resetDealsStoreForTests(): void {
  store.clear();
  SEED_DEALS.forEach((d) => store.set(d.id, { ...d }));
}
