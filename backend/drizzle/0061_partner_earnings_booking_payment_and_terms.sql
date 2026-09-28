-- C36-CE / C36-CD — Partner commercial terms + additive booking_payment CHECK
-- Spec: C36-CC RATIFIED | C36-CD TERMS_AND_CHECK_DESIGNED
--
-- Additive only:
--   - CREATE partner_commercial_terms
--   - ALTER partner_earnings: expand source_type CHECK + metadata jsonb
-- Does NOT edit historical 0059_partner_domain.sql
-- Does NOT create earnings/ledger writers
-- Does NOT touch bookings, affiliates, marketplace, comissoes_lancamento
--
-- Requires:
--   public.partner_empreendimento_associations (0060)
--   public.partner_earnings (0059)
--   public.users(id)
--
-- Rollback (formal — ephemeral/staging or PR revert ONLY; never ad-hoc in prod):
--   -- Only if no booking_payment rows / terms in use:
--   ALTER TABLE partner_earnings DROP CONSTRAINT IF EXISTS partner_earnings_source_type_check;
--   ALTER TABLE partner_earnings ADD CONSTRAINT partner_earnings_source_type_check
--     CHECK (source_type IN (
--       'comissao_lancamento', 'affiliate', 'marketplace_order', 'manual', 'adjust'
--     ));
--   ALTER TABLE partner_earnings DROP COLUMN IF EXISTS metadata;
--   DROP TABLE IF EXISTS partner_commercial_terms;
--
-- Idempotency: IF NOT EXISTS / DROP CONSTRAINT IF EXISTS patterns.

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS partner_commercial_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  pea_id uuid NOT NULL
    REFERENCES partner_empreendimento_associations(id) ON DELETE RESTRICT,
  rate_kind text NOT NULL,
  rate_bps integer NOT NULL,
  fixed_amount_cents bigint,
  currency varchar(3) NOT NULL DEFAULT 'BRL',
  basis text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  version integer NOT NULL DEFAULT 1,
  effective_from timestamptz,
  effective_to timestamptz,
  superseded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by_user_id integer
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT partner_commercial_terms_rate_kind_check
    CHECK (rate_kind IN ('percent_bps')),
  CONSTRAINT partner_commercial_terms_basis_check
    CHECK (basis IN ('booking_total')),
  CONSTRAINT partner_commercial_terms_status_check
    CHECK (status IN ('draft', 'active', 'superseded')),
  CONSTRAINT partner_commercial_terms_rate_bps_check
    CHECK (rate_bps >= 0 AND rate_bps <= 10000),
  CONSTRAINT partner_commercial_terms_fixed_v1_check
    CHECK (fixed_amount_cents IS NULL),
  CONSTRAINT partner_commercial_terms_window_check
    CHECK (
      effective_to IS NULL
      OR effective_from IS NULL
      OR effective_to > effective_from
    ),
  CONSTRAINT partner_commercial_terms_version_check
    CHECK (version >= 1)
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'partner_commercial_terms_superseded_by_fkey'
  ) THEN
    ALTER TABLE partner_commercial_terms
      ADD CONSTRAINT partner_commercial_terms_superseded_by_fkey
      FOREIGN KEY (superseded_by) REFERENCES partner_commercial_terms(id)
      ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_partner_commercial_terms_pea_status
  ON partner_commercial_terms (pea_id, status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_partner_commercial_terms_pea_window
  ON partner_commercial_terms (pea_id, effective_from, effective_to);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS partner_commercial_terms_one_active_per_pea
  ON partner_commercial_terms (pea_id)
  WHERE status = 'active';
--> statement-breakpoint
ALTER TABLE partner_earnings
  DROP CONSTRAINT IF EXISTS partner_earnings_source_type_check;
--> statement-breakpoint
ALTER TABLE partner_earnings
  ADD CONSTRAINT partner_earnings_source_type_check
  CHECK (source_type IN (
    'comissao_lancamento',
    'affiliate',
    'marketplace_order',
    'manual',
    'adjust',
    'booking_payment'
  ));
--> statement-breakpoint
ALTER TABLE partner_earnings
  ADD COLUMN IF NOT EXISTS metadata jsonb;
