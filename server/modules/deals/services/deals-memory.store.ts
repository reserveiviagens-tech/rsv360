import type { CreateDealInput, DealRecord, DealStage } from '../schema';

const todayIsoDate = (): string => new Date().toISOString().slice(0, 10);

export const SEED_DEALS: DealRecord[] = [
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
    propertyName: 'Ocean Breeze Flat',
    location: 'Pacific Beach · For rent',
    propertyType: 'Condo',
    beds: 2,
    baths: 2,
    sqft: 1100,
    price: 4_500,
    commission: 675,
    stage: 'viewing',
    nextStep: 'Tour agendado para o sábado',
    createdAt: '2026-10-28',
    updatedAt: '2026-11-08',
    listingSource: 'zillow',
    status: 'active',
  },
  {
    id: 'deal_004',
    agentId: 'agent_3',
    agentName: 'Aya Nakamura',
    propertyId: 'prop_104',
    propertyName: 'Sierra Ridge',
    location: 'Del Mar · For sale',
    propertyType: 'House',
    beds: 4,
    baths: 3,
    sqft: 2800,
    price: 1_620_000,
    commission: 24_300,
    stage: 'under_contract',
    nextStep: 'Aguardando inspeção final',
    createdAt: '2026-09-12',
    updatedAt: '2026-11-06',
    listingSource: 'realtor',
    status: 'active',
  },
  {
    id: 'deal_005',
    agentId: 'agent_2',
    agentName: 'Jordan Ellis',
    propertyId: 'prop_105',
    propertyName: 'Cliffwood Estate',
    location: 'Carlsbad · For sale',
    propertyType: 'Estate',
    beds: 7,
    baths: 6,
    sqft: 5200,
    price: 2_400_000,
    commission: 36_000,
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

const store = new Map<string, DealRecord>(SEED_DEALS.map((d) => [d.id, { ...d }]));

export function memoryListDeals(): DealRecord[] {
  return Array.from(store.values()).map((d) => ({ ...d }));
}

export function memoryGetDeal(id: string): DealRecord | undefined {
  const deal = store.get(id);
  return deal ? { ...deal } : undefined;
}

export function memoryUpdateDealStage(dealId: string, stage: DealStage): DealRecord {
  const deal = store.get(dealId);
  if (!deal) {
    throw new Error('NOT_FOUND');
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

export function memoryCreateDeal(input: CreateDealInput, userId: number): DealRecord {
  const id = `deal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const propertyId = input.leadId ? `prop_${input.leadId}` : `prop_${Date.now()}`;
  const price = input.price || 1_000_000;
  const commission = input.commission ?? Math.round(price * 0.015);

  const newDeal: DealRecord = {
    id,
    agentId: input.agentId || `agent_${userId || 1}`,
    agentName: input.agentName || 'Imani Brooks',
    propertyId,
    propertyName: input.propertyName,
    location: input.location || 'São Paulo / Jardins',
    propertyType: input.propertyType || 'House',
    beds: input.beds || 3,
    baths: input.baths || 2,
    sqft: input.sqft || 2000,
    price,
    commission,
    stage: input.stage || 'viewing',
    nextStep: input.nextStep || 'Agendar visita inicial',
    createdAt: todayIsoDate(),
    updatedAt: todayIsoDate(),
    listingSource: input.listingSource || 'direct',
    status: 'active',
    notes: input.notes,
  };

  store.set(id, newDeal);
  return { ...newDeal };
}

export function memoryResetForTests(): void {
  store.clear();
  SEED_DEALS.forEach((d) => store.set(d.id, { ...d }));
}