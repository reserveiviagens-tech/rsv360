-- Phase 5.2 Anfitrião — dedicated co-host invites table
-- Rollback: DROP TABLE IF EXISTS coanfitriao_convites;

CREATE TABLE IF NOT EXISTS coanfitriao_convites (
  id VARCHAR(64) PRIMARY KEY,
  acomodacao_id INTEGER NOT NULL REFERENCES acomodacoes(id) ON DELETE CASCADE,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  papel VARCHAR(20) NOT NULL CHECK (papel IN ('calendario','mensagens','tudo')),
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','ativo','revogado')),
  invited_by_user_id INTEGER REFERENCES users(id),
  token VARCHAR(64) NOT NULL,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS coanfitriao_convites_token_uidx ON coanfitriao_convites(token);
CREATE UNIQUE INDEX IF NOT EXISTS coanfitriao_convites_active_email_uidx
  ON coanfitriao_convites(acomodacao_id, lower(email))
  WHERE status IN ('pendente','ativo');
CREATE INDEX IF NOT EXISTS coanfitriao_convites_acomodacao_idx ON coanfitriao_convites(acomodacao_id);
CREATE INDEX IF NOT EXISTS coanfitriao_convites_email_idx ON coanfitriao_convites(lower(email));
