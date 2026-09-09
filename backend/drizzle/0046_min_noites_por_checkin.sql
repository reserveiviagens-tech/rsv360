-- Per check-in weekday minimum stay (Airbnb-style).
-- JSON shape: { "0": 2, "1": 2, ... "6": 3 } where 0=Sunday .. 6=Saturday.
-- Rollback:
--   ALTER TABLE acomodacoes DROP COLUMN IF EXISTS min_noites_por_checkin;

ALTER TABLE acomodacoes
  ADD COLUMN IF NOT EXISTS min_noites_por_checkin JSONB;
