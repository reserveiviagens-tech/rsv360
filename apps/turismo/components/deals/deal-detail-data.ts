import type { Deal, DealStage } from './deal-card';
import { inferListingKind, formatPrice } from './deal-card';

const STAGE_ORDER: DealStage[] = ['viewing', 'offer', 'negotiation', 'under_contract', 'closed'];

const STAGE_WEIGHT: Record<DealStage, number> = {
  viewing: 0.35,
  offer: 0.55,
  negotiation: 0.72,
  under_contract: 0.9,
  closed: 1,
};

export function parseDeltaPercent(delta?: string): number | null {
  if (!delta) return null;
  if (delta.toLowerCase().includes('ask')) return 0;
  const m = delta.match(/-?\d+(\.\d+)?/);
  return m ? Number.parseFloat(m[0]) : null;
}

export function dealAskingPrice(deal: Deal): number {
  if (deal.askingPrice && deal.askingPrice > 0) return deal.askingPrice;
  const pct = parseDeltaPercent(deal.priceDelta);
  if (pct === null || pct === 0) return deal.price;
  return Math.round(deal.price / (1 + pct / 100));
}

export function weightedCommission(deal: Deal): number {
  return Math.round(deal.commission * (STAGE_WEIGHT[deal.stage] ?? 0.5));
}

export function propertyAddressLine(deal: Deal): string {
  if (deal.streetAddress) return deal.streetAddress;
  const loc = deal.location.split('·')[0]?.trim() ?? deal.location;
  return `${loc}`;
}

export function dealsOnSameProperty(deal: Deal, all: Deal[]): Deal[] {
  return all
    .filter((row) => row.propertyId === deal.propertyId)
    .sort((a, b) => b.price - a.price);
}

export function offerBarPercent(offer: number, asking: number): number {
  if (asking <= 0) return 0;
  return Math.min(130, Math.round((offer / asking) * 100));
}

export function buyerEmailFromName(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.+|\.+$/g, '');
  return `${slug || 'buyer'}@mail.com`;
}

export function buyerPhoneDemo(): string {
  return '+1 (858) 555-0125';
}

export function stageIndex(stage: DealStage): number {
  return STAGE_ORDER.indexOf(stage);
}

export { STAGE_ORDER, formatPrice, inferListingKind };
