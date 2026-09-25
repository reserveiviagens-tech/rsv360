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
