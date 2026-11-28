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

export const createDealBodySchema = z.object({
  propertyName: z.string().min(1, 'Nome do imóvel/oportunidade é obrigatório'),
  propertyType: z.string().optional().default('House'),
  location: z.string().optional().default('São Paulo / Jardins'),
  beds: z.number().optional().default(3),
  baths: z.number().optional().default(2),
  sqft: z.number().optional().default(2000),
  price: z.number().positive().optional().default(1_000_000),
  commission: z.number().optional(),
  stage: dealStageSchema.optional().default('viewing'),
  nextStep: z.string().optional(),
  notes: z.string().optional(),
  listingSource: z.enum(['zillow', 'realtor', 'direct']).optional().default('direct'),
  clientName: z.string().optional(),
  clientEmail: z.string().optional(),
  clientPhone: z.string().optional(),
  agentId: z.string().optional(),
  agentName: z.string().optional(),
  leadId: z.string().optional(),
});

export type CreateDealInput = z.infer<typeof createDealBodySchema>;

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
