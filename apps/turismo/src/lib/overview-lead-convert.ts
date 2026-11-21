import type { LeadItem } from '../../pages/leads';
import { convertLeadToDealRecord, saveConvertedDeal } from './lead-to-deal';
import { dealsApi } from './deals-api';
import { leadsApi } from './leads-api';
import type { LeadPageCard } from './overview-leads';

export type OverviewLeadConvertResult = {
  localDealId: string;
  apiDealId?: string;
};

function leadPageCardToLeadItem(card: LeadPageCard): LeadItem {
  return {
    id: card.id,
    name: card.name,
    email: card.email,
    phone: card.phone,
    score: card.score,
    intent: card.intent,
    budget: card.budget,
    source: card.source,
    time: card.time,
    status: card.status,
    fitFactors: card.fitFactors,
    notes: card.notes,
  };
}

export async function convertOverviewLeadToDeal(card: LeadPageCard): Promise<OverviewLeadConvertResult> {
  if (card.id.startsWith('demo-')) {
    throw new Error('Conversão indisponível para lead de demonstração.');
  }
  if (card.dealId) {
    return { localDealId: card.dealId, apiDealId: card.dealId };
  }

  const leadItem = leadPageCardToLeadItem(card);
  const newDeal = convertLeadToDealRecord(leadItem);
  saveConvertedDeal(newDeal);

  try {
    const deal = await dealsApi.create({
      propertyName: newDeal.propertyName,
      price: newDeal.price,
      propertyType: newDeal.propertyType,
      location: newDeal.location,
      stage: 'viewing',
      clientName: newDeal.clientName,
      clientEmail: newDeal.clientEmail,
      clientPhone: newDeal.clientPhone,
      notes: newDeal.notes,
      leadId: card.id,
    });
    await leadsApi.patchStatus(card.id, 'qualified').catch(() => undefined);
    return { localDealId: newDeal.id, apiDealId: deal.id };
  } catch {
    return { localDealId: newDeal.id };
  }
}