-- FASE 5 / Incremento 2 - Partner <-> Empreendimento L3 association (CREATE-only)
-- Spec: C36-AW ACCEPTED | C36-AX B | C36-AY MIGRATION_READY | C36-AZ IMPLEMENT
--
-- Additive only: no ALTER on live tables; no DROP of legacy modules.
-- Does NOT touch: partners*, empreendimentos (except FK target), acomodacoes,
-- bookings, partner_earnings/ledger/payouts, partner_links, affiliates, marketplace.
-- Does NOT authorize via partner_links.
--
-- Requires:
--   public.partners(id)            - 0059 applied
--   public.empreendimentos(id)     - 0022+ present (serial/integer PK)
--   public.users(id)               - for created_by_user_id
--
-- Rollback (formal - ephemeral/staging or PR revert ONLY; never ad-hoc in prod):
--   DROP TABLE IF EXISTS partner_empreendimento_associations;
--
-- Idempotency: CREATE TABLE/INDEX IF NOT EXISTS (same style as 0059).

CREATE TABLE IF NOT EXISTS partner_empreendimento_associations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  partner_id uuid NOT NULL
    REFERENCES partners(id) ON DELETE CASCADE,
  empreendimento_id integer NOT NULL
    REFERENCES empreendimentos(id) ON DELETE RESTRICT,
  association_role text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  effective_from timestamptz,
  effective_to timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by_user_id integer
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT pea_partner_empreendimento_unique
    UNIQUE (partner_id, empreendimento_id),
  CONSTRAINT pea_association_role_check
    CHECK (association_role IN (
      'commercial_owner', 'agency', 'channel', 'viewer'
    )),
  CONSTRAINT pea_status_check
    CHECK (status IN ('active', 'suspended', 'ended'))
);

CREATE INDEX IF NOT EXISTS idx_pea_partner_status
  ON partner_empreendimento_associations (partner_id, status);

CREATE INDEX IF NOT EXISTS idx_pea_empreendimento_status
  ON partner_empreendimento_associations (empreendimento_id, status);
