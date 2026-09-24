-- FASE 5 / Incremento 1 — Partner domain (CREATE-only)
-- Spec baseline: 6d320174 | Pre-flight: 32312409 | INC1_AUTHORIZED
--
-- Additive only: no ALTER on live tables; no DROP of legacy modules.
-- Does NOT touch: empreendimentos, acomodacoes, affiliates, marketplace,
-- split, comissoes_lancamento, payments, FASE 0 auth.
--
-- Rollback (formal — ephemeral/staging or PR revert ONLY; never ad-hoc in prod):
--   DROP TABLE IF EXISTS partner_ledger_entries;
--   DROP TABLE IF EXISTS partner_payout_items;
--   DROP TABLE IF EXISTS partner_payouts;
--   DROP TABLE IF EXISTS partner_earnings;
--   DROP TABLE IF EXISTS partner_links;
--   DROP TABLE IF EXISTS partner_memberships;
--   DROP TABLE IF EXISTS partners;
--
-- Requires: public.users(id) already present (serial/integer PK).

CREATE TABLE IF NOT EXISTS partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  code varchar(64) NOT NULL,
  display_name varchar(255) NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  primary_user_id integer REFERENCES users(id) ON DELETE SET NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partners_code_unique UNIQUE (code),
  CONSTRAINT partners_status_check
    CHECK (status IN ('draft', 'active', 'suspended', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_partners_status ON partners (status);
CREATE INDEX IF NOT EXISTS idx_partners_primary_user_id ON partners (primary_user_id);

CREATE TABLE IF NOT EXISTS partner_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_memberships_partner_user_unique UNIQUE (partner_id, user_id),
  CONSTRAINT partner_memberships_role_check
    CHECK (role IN ('owner', 'partner_admin', 'ops', 'finance', 'member'))
);

CREATE INDEX IF NOT EXISTS idx_partner_memberships_user_id ON partner_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_partner_memberships_partner_role ON partner_memberships (partner_id, role);

CREATE TABLE IF NOT EXISTS partner_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  kind text NOT NULL,
  external_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_links_kind_external_unique UNIQUE (kind, external_id),
  CONSTRAINT partner_links_kind_check
    CHECK (kind IN ('affiliate', 'owner', 'empreendimento', 'enterprise', 'receiver'))
);

CREATE INDEX IF NOT EXISTS idx_partner_links_partner_id ON partner_links (partner_id);

CREATE TABLE IF NOT EXISTS partner_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  source_type text NOT NULL,
  source_id text NOT NULL,
  amount_cents bigint NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_earnings_source_unique UNIQUE (source_type, source_id),
  CONSTRAINT partner_earnings_source_type_check
    CHECK (source_type IN (
      'comissao_lancamento', 'affiliate', 'marketplace_order', 'manual', 'adjust'
    )),
  CONSTRAINT partner_earnings_status_check
    CHECK (status IN ('pending', 'confirmed', 'paid', 'reversed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_partner_earnings_partner_created
  ON partner_earnings (partner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS partner_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  amount_cents bigint NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'pending',
  idempotency_key varchar(128) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_payouts_idempotency_unique UNIQUE (idempotency_key),
  CONSTRAINT partner_payouts_status_check
    CHECK (status IN ('pending', 'approved', 'paid', 'failed', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS partner_payout_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  payout_id uuid NOT NULL REFERENCES partner_payouts(id) ON DELETE CASCADE,
  earning_id uuid NOT NULL REFERENCES partner_earnings(id) ON DELETE RESTRICT,
  amount_cents bigint NOT NULL,
  CONSTRAINT partner_payout_items_payout_earning_unique UNIQUE (payout_id, earning_id)
);

CREATE TABLE IF NOT EXISTS partner_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  entry_type text NOT NULL,
  amount_cents bigint NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'BRL',
  earning_id uuid REFERENCES partner_earnings(id) ON DELETE SET NULL,
  payout_id uuid REFERENCES partner_payouts(id) ON DELETE SET NULL,
  idempotency_key varchar(128) NOT NULL,
  actor_user_id integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_ledger_entries_idempotency_unique UNIQUE (idempotency_key),
  CONSTRAINT partner_ledger_entries_entry_type_check
    CHECK (entry_type IN ('credit', 'debit', 'hold', 'release', 'adjust'))
);

CREATE INDEX IF NOT EXISTS idx_partner_ledger_partner_created
  ON partner_ledger_entries (partner_id, created_at DESC);
