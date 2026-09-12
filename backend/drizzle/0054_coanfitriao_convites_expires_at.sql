-- Rollback: ALTER TABLE coanfitriao_convites DROP COLUMN IF EXISTS expires_at;

ALTER TABLE coanfitriao_convites
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Backfill pending invites: 14 days from invited_at (or now if null)
UPDATE coanfitriao_convites
SET expires_at = COALESCE(invited_at, NOW()) + INTERVAL '14 days'
WHERE status = 'pendente' AND expires_at IS NULL;
