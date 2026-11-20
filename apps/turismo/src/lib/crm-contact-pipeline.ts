import type { LeadApiRow } from './overview-leads';

export function normalizeCrmName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function indexLeadsByName(leads: LeadApiRow[]): Map<string, LeadApiRow> {
  const map = new Map<string, LeadApiRow>();
  for (const lead of leads) {
    const key = normalizeCrmName(lead.name);
    if (key && !map.has(key)) map.set(key, lead);
  }
  return map;
}

export type ContactPipelineLink = {
  leadId?: string;
  dealId?: string;
};

export function resolvePipelineForContact(
  contactName: string,
  byName: Map<string, LeadApiRow>,
): ContactPipelineLink {
  const hit = byName.get(normalizeCrmName(contactName));
  if (!hit) return {};
  return { leadId: hit.id, dealId: hit.dealId };
}