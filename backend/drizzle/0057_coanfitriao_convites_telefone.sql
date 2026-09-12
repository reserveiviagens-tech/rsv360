-- Phase 9.4 Anfitrião — optional SMS phone on co-host invites
--
-- Rollback:
--   ALTER TABLE coanfitriao_convites DROP COLUMN IF EXISTS telefone;
--
-- Apply via: npm run migrate --workspace=backend (human in each environment; do NOT auto-run on prod)

ALTER TABLE coanfitriao_convites
  ADD COLUMN IF NOT EXISTS telefone VARCHAR(20);
