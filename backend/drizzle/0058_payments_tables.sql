-- P0 payments: core tables + webhook idempotency
--
-- Rollback (manual, owner-reviewed):
--   DROP TABLE IF EXISTS disputes, refunds, subscriptions, payment_methods, payments, payment_customers, subscription_plans, webhook_events CASCADE;
--   DROP TYPE IF EXISTS dispute_status, refund_status, subscription_interval, subscription_status, payment_provider, payment_method, payment_status CASCADE;

DO $$ BEGIN
  CREATE TYPE "payment_status" AS ENUM (
    'pending', 'processing', 'approved', 'rejected', 'cancelled',
    'refunded', 'partially_refunded', 'expired', 'in_mediation', 'charged_back'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "payment_method" AS ENUM (
    'credit_card', 'debit_card', 'pix', 'boleto', 'wallet', 'bank_transfer'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "payment_provider" AS ENUM ('mercadopago', 'stripe', 'openfinance');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "subscription_status" AS ENUM (
    'active', 'paused', 'cancelled', 'past_due', 'trialing', 'unpaid'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "subscription_interval" AS ENUM (
    'daily', 'weekly', 'monthly', 'quarterly', 'semi_annual', 'annual'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "refund_status" AS ENUM ('pending', 'approved', 'rejected', 'processing');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "dispute_status" AS ENUM ('opened', 'in_review', 'won', 'lost', 'accepted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Legacy `payments` (site-publico/bookings: integer id + gateway_*) blocks P0 schema.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payments'
      AND column_name = 'gateway_transaction_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payments'
      AND column_name = 'external_id'
  ) THEN
    ALTER TABLE public.payments RENAME TO payments_legacy_gateway;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "payment_customers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "enterprise_id" uuid NOT NULL,
  "email" varchar(255) NOT NULL,
  "name" varchar(255) NOT NULL,
  "document" varchar(20),
  "document_type" varchar(10),
  "phone" varchar(20),
  "stripe_customer_id" varchar(255),
  "mp_customer_id" varchar(255),
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "enterprise_id" uuid NOT NULL,
  "customer_id" uuid REFERENCES "payment_customers"("id"),
  "external_id" varchar(255),
  "provider" "payment_provider" NOT NULL,
  "method" "payment_method" NOT NULL,
  "status" "payment_status" DEFAULT 'pending' NOT NULL,
  "amount" numeric(12, 2) NOT NULL,
  "currency" varchar(3) DEFAULT 'BRL' NOT NULL,
  "description" text,
  "installments" integer DEFAULT 1,
  "fees" numeric(10, 2),
  "net_amount" numeric(12, 2),
  "pix_qr_code" text,
  "pix_qr_code_base64" text,
  "pix_expires_at" timestamp,
  "boleto_url" text,
  "boleto_barcode" text,
  "boleto_expires_at" timestamp,
  "booking_id" integer REFERENCES "bookings"("id"),
  "ticket_id" uuid,
  "metadata" jsonb,
  "paid_at" timestamp,
  "cancelled_at" timestamp,
  "failure_reason" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_payments_booking_id" ON "payments" ("booking_id");
CREATE INDEX IF NOT EXISTS "idx_payments_external_id" ON "payments" ("external_id");

CREATE TABLE IF NOT EXISTS "payment_methods" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "customer_id" uuid NOT NULL REFERENCES "payment_customers"("id"),
  "provider" "payment_provider" NOT NULL,
  "external_id" varchar(255),
  "type" "payment_method" NOT NULL,
  "last_4" varchar(4),
  "brand" varchar(50),
  "expiry_month" integer,
  "expiry_year" integer,
  "is_default" boolean DEFAULT false,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "subscription_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "enterprise_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "amount" numeric(12, 2) NOT NULL,
  "currency" varchar(3) DEFAULT 'BRL' NOT NULL,
  "interval" "subscription_interval" NOT NULL,
  "interval_count" integer DEFAULT 1,
  "trial_days" integer DEFAULT 0,
  "features" jsonb,
  "is_active" boolean DEFAULT true,
  "stripe_product_id" varchar(255),
  "stripe_price_id" varchar(255),
  "mp_plan_id" varchar(255),
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "enterprise_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL REFERENCES "payment_customers"("id"),
  "plan_id" uuid NOT NULL REFERENCES "subscription_plans"("id"),
  "provider" "payment_provider" NOT NULL,
  "external_id" varchar(255),
  "status" "subscription_status" DEFAULT 'active' NOT NULL,
  "current_period_start" timestamp,
  "current_period_end" timestamp,
  "cancel_at_period_end" boolean DEFAULT false,
  "trial_end" timestamp,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "refunds" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "payment_id" uuid NOT NULL REFERENCES "payments"("id"),
  "provider" "payment_provider" NOT NULL,
  "external_id" varchar(255),
  "amount" numeric(12, 2) NOT NULL,
  "reason" text,
  "status" "refund_status" DEFAULT 'pending' NOT NULL,
  "metadata" jsonb,
  "processed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "disputes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "payment_id" uuid NOT NULL REFERENCES "payments"("id"),
  "provider" "payment_provider" NOT NULL,
  "external_id" varchar(255),
  "reason" text,
  "status" "dispute_status" DEFAULT 'opened' NOT NULL,
  "amount" numeric(12, 2) NOT NULL,
  "evidence" jsonb,
  "deadline" timestamp,
  "resolved_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "webhook_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" "payment_provider" NOT NULL,
  "external_event_id" varchar(255) NOT NULL UNIQUE,
  "event_type" varchar(100) NOT NULL,
  "payload" jsonb NOT NULL,
  "processed" boolean DEFAULT false,
  "processed_at" timestamp,
  "error" text,
  "retry_count" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL
);
