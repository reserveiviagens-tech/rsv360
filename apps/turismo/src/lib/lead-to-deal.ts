import type { LeadItem } from '../../pages/leads';
import type { Deal } from '../../components/deals/deal-card';

export const CRM_CONVERTED_DEALS_KEY = 'crm_converted_deals';

/**
 * Converte strings de orçamento amigáveis (ex: "$1.4M – $1.8M", "R$ 2.8M – R$ 3.5M", "$950k")
 * para valores numéricos inteiros para cálculo de comissões e KPIs.
 */
export function parseBudgetToNumber(budget: string): number {
  if (!budget) return 1_000_000;

  // Se houver faixa (ex: "$1.4M – $1.8M"), pega a primeira parte representativa
  const firstPart = budget.split(/[–—-]/)[0]!.trim();

  // Remove caracteres monetários e espaços
  const clean = firstPart.replace(/[^0-9.,kKmM]/g, '').trim();

  if (clean.toLowerCase().endsWith('m')) {
    const num = parseFloat(clean.slice(0, -1).replace(',', '.'));
    return Number.isFinite(num) ? Math.round(num * 1_000_000) : 1_000_000;
  }

  if (clean.toLowerCase().endsWith('k')) {
    const num = parseFloat(clean.slice(0, -1).replace(',', '.'));
    return Number.isFinite(num) ? Math.round(num * 1_000) : 500_000;
  }

  const normalized = clean.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 1_000_000;
}

const DEMO_IMAGES = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80',
];

/**
 * Converte um LeadItem em um Deal compatível com o Kanban de Deals.
 */
export function convertLeadToDealRecord(lead: LeadItem): Deal {
  const price = parseBudgetToNumber(lead.budget);
  const commission = Math.round(price * 0.015);
  const dateStr = new Date().toISOString().slice(0, 10);
  const imgIndex = Math.abs(lead.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % DEMO_IMAGES.length;

  const propertyType =
    lead.intent === 'rent'
      ? 'Apartment'
      : lead.intent === 'sell'
        ? 'Estate'
        : 'House';

  const location =
    lead.phone.startsWith('+55')
      ? 'Jardins, São Paulo'
      : lead.phone.startsWith('+44')
        ? 'Mayfair, London'
        : 'La Jolla Cove · For sale';

  const cleanSlug = lead.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  return {
    id: `deal_${lead.id}_${Date.now().toString(36)}`,
    agentId: 'agent_1',
    agentName: 'Imani Brooks',
    propertyId: `prop_${lead.id}`,
    propertyName: `Residência ${lead.name.split(' ')[0]}`,
    location,
    propertyType,
    beds: lead.intent === 'rent' ? 2 : 4,
    baths: lead.intent === 'rent' ? 2 : 3,
    sqft: lead.intent === 'rent' ? 1400 : 3200,
    price,
    commission,
    stage: 'viewing',
    nextStep: `Agendar primeira visita com ${lead.name}`,
    createdAt: dateStr,
    updatedAt: dateStr,
    status: 'active',
    listingSource: 'direct',
    imageUrl: DEMO_IMAGES[imgIndex],
    clientName: lead.name,
    clientEmail: lead.email,
    clientPhone: lead.phone,
    askingPrice: price,
    listingKind: lead.intent === 'rent' ? 'rent' : 'sale',
    deepLinkSlug: cleanSlug,
    notes: `Convertido de Lead recebido via ${lead.source}. ${lead.notes || ''}`.trim(),
  };
}

/**
 * Recupera todos os deals convertidos salvos localmente.
 */
export function getConvertedDeals(): Deal[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CRM_CONVERTED_DEALS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Deal[];
  } catch {
    return [];
  }
}

/**
 * Salva um novo deal convertido localmente.
 */
export function saveConvertedDeal(deal: Deal): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getConvertedDeals();
    const updated = [deal, ...existing.filter((d) => d.id !== deal.id)];
    localStorage.setItem(CRM_CONVERTED_DEALS_KEY, JSON.stringify(updated));
  } catch {
    // quota exceeded fallback
  }
}
