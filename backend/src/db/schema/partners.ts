import {
  bigint,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './existing';

/** FASE 5 Inc1 - Partner domain (additive). No enterprise_id UUID column. */
export const partners = pgTable('partners', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 64 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  status: text('status').notNull().default('draft'),
  primaryUserId: integer('primary_user_id').references(() => users.id, { onDelete: 'set null' }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const partnerMemberships = pgTable(
  'partner_memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    partnerId: uuid('partner_id')
      .notNull()
      .references(() => partners.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    partnerUserUnique: unique('partner_memberships_partner_user_unique').on(t.partnerId, t.userId),
  }),
);

export const partnerLinks = pgTable(
  'partner_links',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    partnerId: uuid('partner_id')
      .notNull()
      .references(() => partners.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    externalId: text('external_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    kindExternalUnique: unique('partner_links_kind_external_unique').on(t.kind, t.externalId),
  }),
);

export const partnerEarnings = pgTable(
  'partner_earnings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    partnerId: uuid('partner_id')
      .notNull()
      .references(() => partners.id, { onDelete: 'restrict' }),
    sourceType: text('source_type').notNull(),
    sourceId: text('source_id').notNull(),
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
    status: text('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    sourceUnique: unique('partner_earnings_source_unique').on(t.sourceType, t.sourceId),
  }),
);

export const partnerPayouts = pgTable('partner_payouts', {
  id: uuid('id').defaultRandom().primaryKey(),
  partnerId: uuid('partner_id')
    .notNull()
    .references(() => partners.id, { onDelete: 'restrict' }),
  amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
  status: text('status').notNull().default('pending'),
  idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const partnerPayoutItems = pgTable(
  'partner_payout_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    payoutId: uuid('payout_id')
      .notNull()
      .references(() => partnerPayouts.id, { onDelete: 'cascade' }),
    earningId: uuid('earning_id')
      .notNull()
      .references(() => partnerEarnings.id, { onDelete: 'restrict' }),
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
  },
  (t) => ({
    payoutEarningUnique: unique('partner_payout_items_payout_earning_unique').on(
      t.payoutId,
      t.earningId,
    ),
  }),
);

export const partnerLedgerEntries = pgTable('partner_ledger_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  partnerId: uuid('partner_id')
    .notNull()
    .references(() => partners.id, { onDelete: 'restrict' }),
  entryType: text('entry_type').notNull(),
  amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
  earningId: uuid('earning_id').references(() => partnerEarnings.id, { onDelete: 'set null' }),
  payoutId: uuid('payout_id').references(() => partnerPayouts.id, { onDelete: 'set null' }),
  idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull().unique(),
  actorUserId: integer('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Partner = typeof partners.$inferSelect;
export type NovoPartner = typeof partners.$inferInsert;
