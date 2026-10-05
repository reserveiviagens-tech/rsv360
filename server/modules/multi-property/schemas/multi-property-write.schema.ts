import { z } from 'zod';
import { PROPERTY_ROLES, PROPERTY_TYPES } from '../db/schema';

export {
  parsePositiveIntId,
  parsePositiveIntParam,
  PositiveIntIdParamSchema,
} from '../../../lib/parse-id';

const propertyType = z.enum(PROPERTY_TYPES);
const propertyRole = z.enum(PROPERTY_ROLES);

/**
 * C36-ID-07 (D3) — the actor is NEVER part of the switch payload.
 * The caller is `req.user.id`; there is no legitimate impersonation flow.
 * Because this schema is `.strict()`, a client that still sends `userId` /
 * `user_id` now receives an explicit 400 instead of silent acceptance.
 */
export const PropertySwitchSchema = z
  .object({
    propertyId: z.coerce.number().int().positive().optional(),
    property_id: z.coerce.number().int().positive().optional(),
  })
  .strict()
  .refine((v) => v.propertyId != null || v.property_id != null, {
    message: 'propertyId is required',
    path: ['propertyId'],
  });

export const PropertyWriteSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    slug: z.string().max(255).optional(),
    type: propertyType.optional(),
    description: z.string().max(10000).optional().nullable(),
    address_street: z.string().max(255).optional().nullable(),
    address_city: z.string().max(100).optional().nullable(),
    address_state: z.string().max(100).optional().nullable(),
    address_zip: z.string().max(30).optional().nullable(),
    address_country: z.string().max(100).optional().nullable(),
    phone: z.string().max(50).optional().nullable(),
    email: z.string().email().max(255).optional().nullable(),
    website: z.string().max(500).optional().nullable(),
    logo_url: z.string().max(2000).optional().nullable(),
    timezone: z.string().max(100).optional(),
    currency: z.string().length(3).optional(),
    check_in_time: z.string().max(20).optional().nullable(),
    check_out_time: z.string().max(20).optional().nullable(),
    total_rooms: z.coerce.number().int().nonnegative().optional(),
    star_rating: z.coerce.number().int().min(0).max(5).optional().nullable(),
    amenities: z.array(z.string().max(100)).optional(),
    settings: z.record(z.unknown()).optional(),
    is_active: z.boolean().optional(),
  })
  .strict();

export const PropertyCreateSchema = PropertyWriteSchema.extend({
  name: z.string().min(1).max(255),
}).strict();

export const PropertyUpdateSchema = PropertyWriteSchema;

export const PropertyAddUserSchema = z
  .object({
    userId: z.coerce.number().int().positive().optional(),
    user_id: z.coerce.number().int().positive().optional(),
    role: propertyRole.optional(),
  })
  .strict()
  .refine((v) => v.userId != null || v.user_id != null, {
    message: 'userId is required',
    path: ['userId'],
  });

export const PropertyUpdateUserRoleSchema = z
  .object({
    role: propertyRole,
  })
  .strict();

const PRIVILEGED_SETTINGS_KEYS = new Set([
  'isAdmin',
  'role',
  'password',
  'password_hash',
  'permissions',
  'owner_id',
  'ownerId',
]);

/**
 * Accepts `{ settings: {...} }` or a flat settings object.
 * Rejects privileged keys at top-level (.strict after normalize) and inside settings.
 */
export const PropertySettingsWriteSchema = z.preprocess(
  (raw) => {
    if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'settings' in (raw as object)) {
      return raw;
    }
    return { settings: raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {} };
  },
  z
    .object({
      settings: z.record(z.unknown()),
    })
    .strict()
    .superRefine((val, ctx) => {
      for (const key of Object.keys(val.settings)) {
        if (PRIVILEGED_SETTINGS_KEYS.has(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Unexpected key: ${key}`,
            path: ['settings', key],
          });
        }
      }
    }),
);
