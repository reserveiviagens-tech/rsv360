ALTER TABLE "crm_rental_sign_requests"
  ADD COLUMN IF NOT EXISTS "signer_cpf_hash" varchar(128),
  ADD COLUMN IF NOT EXISTS "term_months" integer DEFAULT 12 NOT NULL,
  ADD COLUMN IF NOT EXISTS "deposit_type" varchar(32) DEFAULT 'caucao' NOT NULL,
  ADD COLUMN IF NOT EXISTS "contract_json" jsonb,
  ADD COLUMN IF NOT EXISTS "signed_at" timestamp with time zone;

CREATE TABLE IF NOT EXISTS "crm_rental_sign_events" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "sign_request_id" varchar(64) NOT NULL REFERENCES "crm_rental_sign_requests"("id") ON DELETE CASCADE,
  "event_type" varchar(32) NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_crm_rental_sign_events_request_id" ON "crm_rental_sign_events" ("sign_request_id");