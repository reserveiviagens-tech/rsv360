-- External iCal import (OTA / other sites) — one-way pull of busy nights.
-- Rollback:
--   ALTER TABLE acomodacoes DROP COLUMN IF EXISTS
--     ical_import_url, ical_import_last_sync_at, ical_import_last_status, ical_import_last_error;

ALTER TABLE acomodacoes
  ADD COLUMN IF NOT EXISTS ical_import_url TEXT,
  ADD COLUMN IF NOT EXISTS ical_import_last_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ical_import_last_status VARCHAR(16),
  ADD COLUMN IF NOT EXISTS ical_import_last_error TEXT;
