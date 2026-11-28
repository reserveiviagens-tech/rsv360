import { index, integer, jsonb, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

export type RentalContractJson = {
  unitId: string;
  unitName: string;
  address: string;
  tenantName: string;
  monthlyRent: number;
  termMonths: number;
  startDate: string;
  depositType?: 'caucao' | 'fiador' | 'seguro';
};

export const crmRentalSignRequests = pgTable(
  'crm_rental_sign_requests',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    unitId: varchar('unit_id', { length: 64 }).notNull(),
    status: varchar('status', { length: 16 }).notNull().default('pending'),
    tokenHash: varchar('token_hash', { length: 128 }).notNull(),
    signerEmailHash: varchar('signer_email_hash', { length: 128 }).notNull(),
    signerName: varchar('signer_name', { length: 120 }).notNull(),
    signerCpfHash: varchar('signer_cpf_hash', { length: 128 }),
    signerCpfMasked: varchar('signer_cpf_masked', { length: 20 }),
    termMonths: integer('term_months').notNull().default(12),
    depositType: varchar('deposit_type', { length: 32 }).notNull().default('caucao'),
    contractJson: jsonb('contract_json').$type<RentalContractJson>(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    signedAt: timestamp('signed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    crmRentalSignUnitIdx: index('idx_crm_rental_sign_unit_id').on(t.unitId),
    crmRentalSignStatusIdx: index('idx_crm_rental_sign_status').on(t.status),
  }),
);

export const crmRentalSignEvents = pgTable(
  'crm_rental_sign_events',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    signRequestId: varchar('sign_request_id', { length: 64 })
      .notNull()
      .references(() => crmRentalSignRequests.id, { onDelete: 'cascade' }),
    eventType: varchar('event_type', { length: 32 }).notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    crmRentalSignEventsRequestIdx: index('idx_crm_rental_sign_events_request_id').on(t.signRequestId),
  }),
);