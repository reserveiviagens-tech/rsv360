import { z } from "zod"

const lineItemSchema = z.object({
  ticketId: z.string().min(1).max(64),
  qty: z.number().int().min(1).max(20),
  unitPrice: z.number().nonnegative(),
  label: z.string().min(1).max(200),
})

export const ingressosCheckoutDraftBodySchema = z.object({
  visitDateIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  lines: z.array(lineItemSchema).min(1).max(40),
  subtotal: z.number().nonnegative(),
  totalItems: z.number().int().min(1).max(400),
})

export type IngressosCheckoutDraftBody = z.infer<typeof ingressosCheckoutDraftBodySchema>