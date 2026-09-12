-- Rollback:
-- ALTER TABLE acomodacoes DROP COLUMN IF EXISTS preview_token_hash;
-- ALTER TABLE acomodacoes DROP COLUMN IF EXISTS preview_expires_at;

ALTER TABLE acomodacoes
  ADD COLUMN IF NOT EXISTS preview_token_hash VARCHAR(128),
  ADD COLUMN IF NOT EXISTS preview_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS acomodacoes_preview_token_hash_idx
  ON acomodacoes(preview_token_hash)
  WHERE preview_token_hash IS NOT NULL;
