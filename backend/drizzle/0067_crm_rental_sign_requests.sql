CREATE TABLE IF NOT EXISTS "crm_rental_sign_requests" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "unit_id" varchar(64) NOT NULL,
  "status" varchar(16) DEFAULT 'pending' NOT NULL,
  "token_hash" varchar(128) NOT NULL,
  "signer_email_hash" varchar(128) NOT NULL,
  "signer_name" varchar(120) NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_crm_rental_sign_unit_id" ON "crm_rental_sign_requests" ("unit_id");
CREATE INDEX IF NOT EXISTS "idx_crm_rental_sign_status" ON "crm_rental_sign_requests" ("status");