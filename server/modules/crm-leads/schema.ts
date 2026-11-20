import { z } from 'zod';

export type LeadApiStatus = 'new' | 'contacted' | 'qualified';

export type LeadApiIntent = 'buy' | 'rent' | 'sell';

export type LeadFitFactors = {
  budgetFit: number;
  timeline: number;
  financing: number;
};

/** Public list DTO — PII fields are masked before serialization. */
export type LeadApiRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  score: number;
  intent: LeadApiIntent;
  budget: string;
  source: string;
  time: string;
  status: LeadApiStatus;
  fitFactors: LeadFitFactors;
  notes?: string;
  createdAt?: string;
  dealId?: string;
};

export const patchLeadStatusBodySchema = z.object({
  status: z.enum(['new', 'contacted', 'qualified']),
});