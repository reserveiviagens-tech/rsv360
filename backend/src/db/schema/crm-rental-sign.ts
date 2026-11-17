import { index, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

export const crmRentalSignRequests = pgTable(
  'crm_rental_sign_requests',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    unitId: varchar('unit_id', { length: 64 }).notNull(),
    status: varchar('status', { length: 16 }).notNull().default('pending'),
    tokenHash: varchar('token_hash', { length: 128 }).notNull(),
    signerEmailHash: varchar('signer_email_hash', { length: 128 }).notNull(),
    signerName: varchar('signer_name', { length: 120 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    crmRentalSignUnitIdx: index('idx_crm_rental_sign_unit_id').on(t.unitId),
    crmRentalSignStatusIdx: index('idx_crm_rental_sign_status').on(t.status),
  }),
);