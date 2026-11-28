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

export type OverviewLeadHeaderKpis = {
  newLast24h: number;
  avgScore: number;
  conversionPct: number;
  hotCount: number;
};

const DEMO_LEADS_HEADER_KPI: OverviewLeadHeaderKpis = {
  newLast24h: 4,
  avgScore: 75,
  conversionPct: 50,
  hotCount: 4,
};

function isWithinLast24h(iso: string): boolean {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= 24 * 60 * 60 * 1000;
}

/** KPIs do cabeçalho da aba Leads — API usa dados reais; demo mantém valores Lintel fixos. */
export function resolveOverviewLeadHeaderKpis(
  cards: LeadPageCard[],
  source: 'api' | 'demo' | 'idle',
): OverviewLeadHeaderKpis {
  if (source !== 'api') return DEMO_LEADS_HEADER_KPI;
  if (cards.length === 0) {
    return { newLast24h: 0, avgScore: 0, conversionPct: 0, hotCount: 0 };
  }
  const withCreated = cards.filter((c) => c.createdAt && isWithinLast24h(c.createdAt));
  const newLast24h =
    withCreated.length > 0
      ? withCreated.length
      : cards.filter((c) => c.status === 'new').length;
  const avgScore = Math.round(cards.reduce((sum, c) => sum + c.score, 0) / cards.length);
  const converted = cards.filter((c) => c.status === 'qualified' || Boolean(c.dealId)).length;
  const conversionPct = Math.round((converted / cards.length) * 100);
  const hotCount = cards.filter((c) => c.score >= 80).length;
  return { newLast24h, avgScore, conversionPct, hotCount };
}