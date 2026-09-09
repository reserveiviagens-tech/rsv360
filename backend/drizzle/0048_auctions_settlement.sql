-- PR auctions settlement: stay dates + canonical acomodacao + payment pipeline
ALTER TABLE auctions
  ADD COLUMN IF NOT EXISTS acomodacao_id INTEGER,
  ADD COLUMN IF NOT EXISTS stay_check_in DATE,
  ADD COLUMN IF NOT EXISTS stay_check_out DATE,
  ADD COLUMN IF NOT EXISTS booking_id INTEGER,
  ADD COLUMN IF NOT EXISTS settlement_status VARCHAR(32) NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS payment_due_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS finalize_job_id VARCHAR(128);

CREATE INDEX IF NOT EXISTS idx_auctions_settlement_status
  ON auctions (settlement_status);

CREATE INDEX IF NOT EXISTS idx_auctions_status_end_date
  ON auctions (status, end_date);

CREATE INDEX IF NOT EXISTS idx_auctions_payment_due
  ON auctions (settlement_status, payment_due_at);

CREATE INDEX IF NOT EXISTS idx_auctions_acomodacao_id
  ON auctions (acomodacao_id);

CREATE INDEX IF NOT EXISTS idx_auctions_booking_id
  ON auctions (booking_id);

COMMENT ON COLUMN auctions.acomodacao_id IS 'Canonical unit (acomodacoes) for inventory hold';
COMMENT ON COLUMN auctions.stay_check_in IS 'Stay check-in date for inventory nights';
COMMENT ON COLUMN auctions.stay_check_out IS 'Stay check-out date (exclusive of last night)';
COMMENT ON COLUMN auctions.settlement_status IS 'none|pending_payment|paid|expired|cancelled|unsold';
