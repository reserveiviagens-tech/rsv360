import type { LeadIntent, LeadPageCard, LeadStage } from './overview-leads';
import { initialsFromName, leadApiRowToPageCard } from './overview-leads';

export type OverviewInboxLead = {
  id: string;
  name: string;
  status: LeadStage;
  intent: LeadIntent;
  amount: string;
  area: string;
  beds: string;
  msg: string;
  src: string;
  time: string;
  score: number;
  initials: string;
  dealId?: string;
};

const DEMO_FALLBACK: LeadPageCard[] = [
  {
    id: 'demo-l1',
    name: 'Lead demonstração',
    email: '•••••@dominio',
    phone: '•••• •••• 0000',
    score: 72,
    intent: 'buy',
    budget: '—',
    source: 'Demo offline',
    time: '—',
    status: 'new',
    fitFactors: { budgetFit: 70, timeline: 70, financing: 70 },
    notes: 'API indisponível — conecte o backend e faça login parceiro.',
    avatarInitials: 'LD',
  },
];

export function mapLeadPageCardToInbox(lead: LeadPageCard): OverviewInboxLead {
  return {
    id: lead.id,
    name: lead.name,
    status: lead.status,
    intent: lead.intent,
    amount: lead.budget,
    area: '—',
    beds: '—',
    msg: lead.notes?.trim() || `Origem: ${lead.source}`,
    src: lead.source,
    time: lead.time,
    score: lead.score,
    initials: lead.avatarInitials ?? initialsFromName(lead.name),
    dealId: lead.dealId,
  };
}

export type OverviewLeadsLoadResult = {
  items: OverviewInboxLead[];
  cards: LeadPageCard[];
  source: 'api' | 'demo';
};

export async function loadOverviewLeadsInbox(signal?: AbortSignal): Promise<OverviewLeadsLoadResult> {
  try {
    const { leadsApi } = await import('./leads-api');
    const rows = await leadsApi.list(signal);
    const cards = rows.map((row) => leadApiRowToPageCard(row));
    return {
      cards,
      items: cards.map(mapLeadPageCardToInbox),
      source: 'api',
    };
  } catch {
    return {
      cards: DEMO_FALLBACK,
      items: DEMO_FALLBACK.map(mapLeadPageCardToInbox),
      source: 'demo',
    };
  }
}

export const OVERVIEW_LEAD_STATUS_CHIPS: { id: LeadStage | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'qualified', label: 'Qualified' },
];

export function countLeadsByStatus(items: OverviewInboxLead[], id: LeadStage | 'all'): number {
  if (id === 'all') return items.length;
  return items.filter((l) => l.status === id).length;
}