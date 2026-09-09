-- Preparation buffer in hours (same-day turnover) when not blocking full nights.
-- Rollback:
--   ALTER TABLE acomodacoes DROP COLUMN IF EXISTS tempo_preparacao_horas;

ALTER TABLE acomodacoes
  ADD COLUMN IF NOT EXISTS tempo_preparacao_horas INTEGER NOT NULL DEFAULT 0;
