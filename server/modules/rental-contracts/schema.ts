import { z } from 'zod';

const cpfDigits = z
  .string()
  .transform((s) => s.replace(/\D/g, ''))
  .refine((d) => d.length === 11, 'CPF deve ter 11 dígitos');

export const rentalContractPreviewSchema = z.object({
  unitId: z.string().min(1),
  unitName: z.string().min(1),
  address: z.string().min(1),
  tenantName: z.string().min(1),
  monthlyRent: z.number().positive(),
  termMonths: z.number().int().min(1).max(60).default(12),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  depositType: z.enum(['caucao', 'fiador', 'seguro']).optional().default('caucao'),
});

export type RentalContractPreviewInput = z.infer<typeof rentalContractPreviewSchema>;

export const rentalSignRequestSchema = z.object({
  unitId: z.string().min(1),
  signerEmail: z.string().email(),
  signerName: z.string().min(1).max(120),
  signerCpf: cpfDigits,
  termMonths: z.number().int().min(1).max(60).default(12),
  depositType: z.enum(['caucao', 'fiador', 'seguro']).default('caucao'),
  unitName: z.string().min(1),
  address: z.string().min(1),
  monthlyRent: z.number().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type RentalSignRequestInput = z.infer<typeof rentalSignRequestSchema>;

export const rentalPublicCompleteSchema = z.object({
  token: z.string().min(16),
  acceptTerms: z.literal(true),
});