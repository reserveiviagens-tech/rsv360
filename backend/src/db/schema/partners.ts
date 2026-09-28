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
import { empreendimentos } from './empreendimentos';

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
    /** C36-CE / 0061 — policy snapshot bag (rate, terms, booking, payment, T_pay). */
    metadata: jsonb('metadata'),
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
/** FASE 5 Inc2 - L3 Partner <-> Empreendimento association (0060 CREATE-only). */
export const partnerEmpreendimentoAssociations = pgTable(
  'partner_empreendimento_associations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    partnerId: uuid('partner_id')
      .notNull()
      .references(() => partners.id, { onDelete: 'cascade' }),
    empreendimentoId: integer('empreendimento_id')
      .notNull()
      .references(() => empreendimentos.id, { onDelete: 'restrict' }),
    associationRole: text('association_role').notNull(),
    status: text('status').notNull().default('active'),
    effectiveFrom: timestamp('effective_from', { withTimezone: true }),
    effectiveTo: timestamp('effective_to', { withTimezone: true }),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdByUserId: integer('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  (t) => ({
    partnerEmpreendimentoUnique: unique('pea_partner_empreendimento_unique').on(
      t.partnerId,
      t.empreendimentoId,
    ),
  }),
);

export type PartnerEmpreendimentoAssociation =
  typeof partnerEmpreendimentoAssociations.$inferSelect;
export type NovaPartnerEmpreendimentoAssociation =
  typeof partnerEmpreendimentoAssociations.$inferInsert;

/**
 * C36-CE / 0061 — PEA-scoped commercial terms (percent_bps v1).
 * Writer remains blocked; this is schema foundation only.
 */
export const partnerCommercialTerms = pgTable('partner_commercial_terms', {
  id: uuid('id').defaultRandom().primaryKey(),
  peaId: uuid('pea_id')
    .notNull()
    .references(() => partnerEmpreendimentoAssociations.id, { onDelete: 'restrict' }),
  rateKind: text('rate_kind').notNull(),
  rateBps: integer('rate_bps').notNull(),
  fixedAmountCents: bigint('fixed_amount_cents', { mode: 'number' }),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
  basis: text('basis').notNull(),
  status: text('status').notNull().default('draft'),
  version: integer('version').notNull().default(1),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }),
  effectiveTo: timestamp('effective_to', { withTimezone: true }),
  supersededBy: uuid('superseded_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdByUserId: integer('created_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
});

export type PartnerCommercialTerm = typeof partnerCommercialTerms.$inferSelect;
export type NovoPartnerCommercialTerm = typeof partnerCommercialTerms.$inferInsert;

