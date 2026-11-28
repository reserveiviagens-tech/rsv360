import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './existing';

/** Lintel CRM leads (parceiro) — distinto da tabela turismo `leads`. */
export const crmLeads = pgTable(
  'crm_leads',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    clientName: varchar('client_name', { length: 255 }),
    clientEmail: varchar('client_email', { length: 255 }),
    clientPhone: varchar('client_phone', { length: 32 }),
    source: varchar('source', { length: 50 }).notNull().default('direct'),
    status: varchar('status', { length: 32 }).notNull().default('novo'),
    notes: text('notes'),
    assignedUserId: integer('assigned_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    crmLeadsStatusIdx: index('idx_crm_leads_status').on(t.status),
    crmLeadsCreatedIdx: index('idx_crm_leads_created_at').on(t.createdAt),
  }),
);

export const crmDeals = pgTable(
  'crm_deals',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    leadId: varchar('lead_id', { length: 64 }).references(() => crmLeads.id, {
      onDelete: 'set null',
    }),
    agentId: varchar('agent_id', { length: 64 }).notNull(),
    agentName: varchar('agent_name', { length: 255 }).notNull(),
    propertyId: varchar('property_id', { length: 64 }).notNull(),
    propertyName: varchar('property_name', { length: 255 }).notNull(),
    location: varchar('location', { length: 512 }).notNull(),
    propertyType: varchar('property_type', { length: 64 }).notNull(),
    beds: integer('beds').notNull().default(0),
    baths: integer('baths').notNull().default(0),
    sqft: integer('sqft').notNull().default(0),
    price: numeric('price', { precision: 14, scale: 2 }).notNull(),
    commission: numeric('commission', { precision: 14, scale: 2 }).notNull(),
    stage: varchar('stage', { length: 32 }).notNull(),
    nextStep: text('next_step'),
    listingSource: varchar('listing_source', { length: 16 }),
    status: varchar('status', { length: 16 }).notNull().default('active'),
    notes: text('notes'),
    ownerUserId: integer('owner_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    crmDealsStageIdx: index('idx_crm_deals_stage').on(t.stage),
    crmDealsAgentIdx: index('idx_crm_deals_agent_id').on(t.agentId),
    crmDealsLeadIdx: index('idx_crm_deals_lead_id').on(t.leadId),
  }),
);

export const crmDealEvents = pgTable(
  'crm_deal_events',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    dealId: varchar('deal_id', { length: 64 })
      .notNull()
      .references(() => crmDeals.id, { onDelete: 'cascade' }),
    eventType: varchar('event_type', { length: 32 }).notNull(),
    fromStage: varchar('from_stage', { length: 32 }),
    toStage: varchar('to_stage', { length: 32 }),
    actorUserId: integer('actor_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    crmDealEventsDealIdx: index('idx_crm_deal_events_deal_id').on(t.dealId),
    crmDealEventsCreatedIdx: index('idx_crm_deal_events_created_at').on(t.createdAt),
  }),
);