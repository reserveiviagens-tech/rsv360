-- C36-DD — Refund Request Domain (additive)
-- Separates REQUEST from EXECUTION. Does NOT execute refunds / gateway / payout.
-- Does NOT edit 0059 / 0060 / 0061.
--
-- Rollback sketch (manual / human review):
--   DROP TABLE IF EXISTS refund_requests;

CREATE TABLE IF NOT EXISTS refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  booking_id integer REFERENCES bookings(id) ON DELETE RESTRICT,
  amount numeric(12, 2) NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'BRL',
  reason text,
  requested_by integer REFERENCES users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  request_version integer NOT NULL DEFAULT 1,
  idempotency_key varchar(128),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT refund_requests_amount_check CHECK (amount > 0),
  CONSTRAINT refund_requests_currency_check CHECK (char_length(currency) = 3),
  CONSTRAINT refund_requests_version_check CHECK (request_version >= 1),
  CONSTRAINT refund_requests_status_check CHECK (
    status IN (
      'draft',
      'pending',
      'under_review',
      'approved',
      'rejected',
      'cancelled',
      'executing',
      'executed',
      'failed',
      'expired'
    )
  )
);

-- At most one open request per payment (foundation for request idempotency).
CREATE UNIQUE INDEX IF NOT EXISTS refund_requests_one_open_per_payment
  ON refund_requests (payment_id)
  WHERE status IN ('draft', 'pending');

CREATE UNIQUE INDEX IF NOT EXISTS refund_requests_idempotency_unique
  ON refund_requests (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_refund_requests_payment
  ON refund_requests (payment_id);

CREATE INDEX IF NOT EXISTS idx_refund_requests_status
  ON refund_requests (status);

CREATE INDEX IF NOT EXISTS idx_refund_requests_requested_by
  ON refund_requests (requested_by);
