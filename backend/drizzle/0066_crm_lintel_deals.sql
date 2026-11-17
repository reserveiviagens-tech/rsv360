-- Lintel CRM — persistência de leads, deals e histórico de eventos (Fase 3)

CREATE TABLE IF NOT EXISTS "crm_leads" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "client_name" varchar(255),
  "client_email" varchar(255),
  "client_phone" varchar(32),
  "source" varchar(50) DEFAULT 'direct' NOT NULL,
  "status" varchar(32) DEFAULT 'novo' NOT NULL,
  "notes" text,
  "assigned_user_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_crm_leads_status" ON "crm_leads" ("status");
CREATE INDEX IF NOT EXISTS "idx_crm_leads_created_at" ON "crm_leads" ("created_at");

CREATE TABLE IF NOT EXISTS "crm_deals" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "lead_id" varchar(64) REFERENCES "crm_leads"("id") ON DELETE SET NULL,
  "agent_id" varchar(64) NOT NULL,
  "agent_name" varchar(255) NOT NULL,
  "property_id" varchar(64) NOT NULL,
  "property_name" varchar(255) NOT NULL,
  "location" varchar(512) NOT NULL,
  "property_type" varchar(64) NOT NULL,
  "beds" integer DEFAULT 0 NOT NULL,
  "baths" integer DEFAULT 0 NOT NULL,
  "sqft" integer DEFAULT 0 NOT NULL,
  "price" numeric(14, 2) NOT NULL,
  "commission" numeric(14, 2) NOT NULL,
  "stage" varchar(32) NOT NULL,
  "next_step" text,
  "listing_source" varchar(16),
  "status" varchar(16) DEFAULT 'active' NOT NULL,
  "notes" text,
  "owner_user_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_crm_deals_stage" ON "crm_deals" ("stage");
CREATE INDEX IF NOT EXISTS "idx_crm_deals_agent_id" ON "crm_deals" ("agent_id");
CREATE INDEX IF NOT EXISTS "idx_crm_deals_lead_id" ON "crm_deals" ("lead_id");

CREATE TABLE IF NOT EXISTS "crm_deal_events" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "deal_id" varchar(64) NOT NULL REFERENCES "crm_deals"("id") ON DELETE CASCADE,
  "event_type" varchar(32) NOT NULL,
  "from_stage" varchar(32),
  "to_stage" varchar(32),
  "actor_user_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_crm_deal_events_deal_id" ON "crm_deal_events" ("deal_id");
CREATE INDEX IF NOT EXISTS "idx_crm_deal_events_created_at" ON "crm_deal_events" ("created_at");