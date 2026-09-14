import { z } from 'zod';

export const CheckoutLineItemSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  amount: z.number().positive(),
  quantity: z.number().int().positive().default(1),
});

export const PublicCheckoutSessionSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
  portalToken: z.string().min(16).optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  paymentMethod: z
    .enum(['credit_card', 'debit_card', 'pix', 'boleto', 'wallet', 'bank_transfer'])
    .optional(),
  items: z.array(CheckoutLineItemSchema).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type PublicCheckoutSessionInput = z.infer<typeof PublicCheckoutSessionSchema>;
