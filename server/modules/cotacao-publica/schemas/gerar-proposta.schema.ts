import { z } from 'zod';
import type { GerarPropostaPayload } from '../services/montar-roteiro';

const catalogItemSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    title: z.string(),
    price: z.number(),
    images: z.array(z.string()).optional(),
    metadata: z.record(z.unknown()).optional(),
    location: z.string().optional(),
  })
  .strict();

/**
 * Retrocompat: campos novos opcionais com defaults fail-safe.
 * `upgradeVarandaValor` do client é sempre descartado (preço só server-side).
 */
export const gerarPropostaBodySchema = z.preprocess(
  (body) => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
    const raw = { ...(body as Record<string, unknown>) };
    delete raw.upgradeVarandaValor;
    delete raw.taxaHospedeValor;
    delete raw.taxaHospedePct;
    delete raw.taxa_hospede_valor;
    delete raw.taxa_hospede_pct;
    delete raw.taxaHospedeAtiva;
    delete raw.taxa_hospede_ativa;
    return raw;
  },
  z
    .object({
      checkIn: z.string(),
      checkOut: z.string(),
      adults: z.coerce.number().int().min(0).default(2),
      children: z.coerce.number().int().min(0).default(0),
      hotelId: z.union([z.string(), z.number(), z.null()]).optional(),
      ticketIds: z.array(z.union([z.string(), z.number()])).optional(),
      attractionIds: z.array(z.union([z.string(), z.number()])).optional(),
      breakfastId: z.string().nullable().optional(),
      accommodationMode: z.string().optional(),
      accommodationKitId: z.string().nullable().optional(),
      accommodationItemIds: z.array(z.string()).optional(),
      name: z.string(),
      email: z.string().optional(),
      phone: z.string(),
      notes: z.string().optional(),
      paymentMethod: z.string().optional(),
      profile: z.string().optional(),
      total: z.coerce.number().optional(),
      travelInsurance: z.boolean().optional().default(false),
      hotelOnlyFlow: z.boolean().optional().default(false),
      /** Wire may send string; coerce to number at the edge (E3 / D4). */
      selectedAcomodacaoId: z
        .union([z.number(), z.string(), z.null()])
        .optional()
        .transform((raw) => {
          if (raw == null || raw === '') return null;
          const n = Number(raw);
          return Number.isFinite(n) && n > 0 ? n : null;
        }),
      descontoParceiroPercentual: z.coerce.number().min(0).max(100).optional(),
      descontoParceiroRole: z
        .enum(['corretor', 'agente', 'promotor'])
        .optional()
        .default('corretor'),
      wizardAddonIds: z.array(z.number()).optional(),
      /** Intenção do client — valor resolvido server-side. */
      upgradeVaranda: z.boolean().optional().default(false),
      /** Legado: mapeado 1:1 para upgradeVaranda (política PR+1), nunca somado. */
      suiteUpgrade: z.boolean().optional().default(false),
      arquetipoId: z.string().max(128).optional(),
      codigoExterno: z.string().max(128).optional(),
      catalog: z
        .object({
          hotels: z.array(catalogItemSchema).optional(),
          tickets: z.array(catalogItemSchema).optional(),
          attractions: z.array(catalogItemSchema).optional(),
        })
        .strict()
        .optional(),
      turnstileToken: z.string().optional(),
    })
    .strict(),
);

export type GerarPropostaBodyParsed = GerarPropostaPayload;

export function parseGerarPropostaBody(body: unknown): GerarPropostaPayload {
  return gerarPropostaBodySchema.parse(body) as GerarPropostaPayload;
}
