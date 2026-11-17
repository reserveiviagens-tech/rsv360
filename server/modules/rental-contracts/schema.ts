import { z } from 'zod';

export const rentalContractPreviewSchema = z.object({
  unitId: z.string().min(1),
  unitName: z.string().min(1),
  address: z.string().min(1),
  tenantName: z.string().min(1),
  monthlyRent: z.number().positive(),
  termMonths: z.number().int().min(1).max(60).default(12),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type RentalContractPreviewInput = z.infer<typeof rentalContractPreviewSchema>;

export const rentalSignRequestSchema = z.object({
  unitId: z.string().min(1),
  signerEmail: z.string().email(),
  signerName: z.string().min(1).max(120),
});

export type RentalSignRequestInput = z.infer<typeof rentalSignRequestSchema>;