import { z } from 'zod';

export const DEAL_STAGES = [
  'viewing',
  'offer',
  'negotiation',
  'under_contract',
  'closed',
] as const;

export type DealStage = (typeof DEAL_STAGES)[number];

export const dealStageSchema = z.enum(DEAL_STAGES);

export const patchDealStageBodySchema = z.object({
  stage: dealStageSchema,
});

export type DealRecord = {
  id: string;
  agentId: string;
  agentName: string;
  propertyId: string;
  propertyName: string;
  location: string;
  propertyType: string;
  beds: number;
  baths: number;
  sqft: number;
  price: number;
  commission: number;
  stage: DealStage;
  nextStep?: string;
  createdAt: string;
  updatedAt: string;
  listingSource?: 'zillow' | 'realtor' | 'direct';
  status: 'active' | 'won' | 'lost' | 'pending';
  notes?: string;
};
