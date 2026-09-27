import { z } from 'zod';

/** Aligns with partners_status_check (0059). */
export const PARTNER_STATUSES = ['draft', 'active', 'suspended', 'closed'] as const;
export type PartnerStatus = (typeof PARTNER_STATUSES)[number];

/** Aligns with partner_memberships_role_check (0059). */
export const PARTNER_MEMBERSHIP_ROLES = [
  'owner',
  'partner_admin',
  'ops',
  'finance',
  'member',
] as const;
export type PartnerMembershipRole = (typeof PARTNER_MEMBERSHIP_ROLES)[number];

export const partnerIdParamSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

export const createPartnerSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[a-zA-Z0-9_-]+$/, 'code must be alphanumeric, underscore or hyphen'),
    displayName: z.string().trim().min(1).max(255),
    status: z.enum(PARTNER_STATUSES).optional().default('draft'),
    primaryUserId: z.number().int().positive().nullable().optional(),
    metadata: z.record(z.unknown()).nullable().optional(),
  })
  .strict();

export type CreatePartnerInput = z.infer<typeof createPartnerSchema>;

export const updatePartnerSchema = z
  .object({
    displayName: z.string().trim().min(1).max(255).optional(),
    status: z.enum(PARTNER_STATUSES).optional(),
    primaryUserId: z.number().int().positive().nullable().optional(),
    metadata: z.record(z.unknown()).nullable().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field is required',
  });

export type UpdatePartnerInput = z.infer<typeof updatePartnerSchema>;

export const listPartnersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
    status: z.enum(PARTNER_STATUSES).optional(),
  })
  .strict();

export type ListPartnersQuery = z.infer<typeof listPartnersQuerySchema>;

export const createMembershipSchema = z
  .object({
    userId: z.number().int().positive(),
    role: z.enum(PARTNER_MEMBERSHIP_ROLES),
  })
  .strict();

export type CreateMembershipInput = z.infer<typeof createMembershipSchema>;
/** Aligns with pea_status_check / pea_association_role_check (0060). */
export const ASSOCIATION_STATUSES = ['active', 'suspended', 'ended'] as const;
export type AssociationStatus = (typeof ASSOCIATION_STATUSES)[number];

export const ASSOCIATION_ROLES = [
  'commercial_owner',
  'agency',
  'channel',
  'viewer',
] as const;
export type AssociationRole = (typeof ASSOCIATION_ROLES)[number];

/**
 * Normative L1 matrix for future Partner-member AuthZ (not enforced in BD v1).
 * mutate = create | patch | suspend | end | reactivate
 * read = list | get
 */
export const L1_ASSOCIATION_CAPABILITIES: Record<
  PartnerMembershipRole,
  { read: boolean; mutate: boolean }
> = {
  owner: { read: true, mutate: true },
  partner_admin: { read: true, mutate: true },
  ops: { read: true, mutate: false },
  finance: { read: true, mutate: false },
  member: { read: true, mutate: false },
};

export const empreendimentoIdParamSchema = z.coerce.number().int().positive();

export const partnerEmpreendimentoParamsSchema = z
  .object({
    id: z.string().uuid(),
    empreendimentoId: empreendimentoIdParamSchema,
  })
  .strict();

export const createAssociationSchema = z
  .object({
    empreendimentoId: z.number().int().positive(),
    associationRole: z.enum(ASSOCIATION_ROLES),
    effectiveFrom: z.coerce.date().nullable().optional(),
    effectiveTo: z.coerce.date().nullable().optional(),
    metadata: z.record(z.unknown()).nullable().optional(),
  })
  .strict();

export type CreateAssociationInput = z.infer<typeof createAssociationSchema>;

export const updateAssociationSchema = z
  .object({
    associationRole: z.enum(ASSOCIATION_ROLES).optional(),
    status: z.enum(ASSOCIATION_STATUSES).optional(),
    effectiveFrom: z.coerce.date().nullable().optional(),
    effectiveTo: z.coerce.date().nullable().optional(),
    metadata: z.record(z.unknown()).nullable().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field is required',
  });

export type UpdateAssociationInput = z.infer<typeof updateAssociationSchema>;

export const listAssociationsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
    status: z.enum(ASSOCIATION_STATUSES).optional(),
  })
  .strict();

export type ListAssociationsQuery = z.infer<typeof listAssociationsQuerySchema>;

export const ACOMODACAO_STATUS_PUBLICACAO = [
  'rascunho',
  'completo',
  'em_aprovacao',
  'publicado',
  'rejeitado',
] as const;
export type AcomodacaoStatusPublicacao = (typeof ACOMODACAO_STATUS_PUBLICACAO)[number];

/** C36-BT L3-INHERIT — Partner-scoped acomodacoes list (read-only). */
export const listPartnerAcomodacoesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
    ativo: z.enum(['true', 'false', 'all']).optional().default('true'),
    statusPublicacao: z.enum(ACOMODACAO_STATUS_PUBLICACAO).optional(),
  })
  .strict();

export type ListPartnerAcomodacoesQuery = z.infer<typeof listPartnerAcomodacoesQuerySchema>;

