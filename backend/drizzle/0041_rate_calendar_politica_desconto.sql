-- Rate calendar dual: política de desconto parceiro + defaults de preço/disponibilidade
-- Rollback:
--   ALTER TABLE acomodacoes DROP COLUMN IF EXISTS preco_fim_semana, min_noites, max_noites,
--     antecedencia_dias, aviso_previo_mesmo_dia;
--   DROP TABLE IF EXISTS politica_desconto_audit, politica_desconto_parceiro;

ALTER TABLE acomodacoes
  ADD COLUMN IF NOT EXISTS preco_fim_semana NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS min_noites INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_noites INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS antecedencia_dias INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aviso_previo_mesmo_dia VARCHAR(5);

CREATE TABLE IF NOT EXISTS politica_desconto_parceiro (
  id SERIAL PRIMARY KEY,
  scope VARCHAR(32) NOT NULL DEFAULT 'global',
  scope_id VARCHAR(64),
  max_desconto_percentual NUMERIC(5, 2) NOT NULL DEFAULT 0,
  max_desconto_absoluto NUMERIC(12, 2),
  roles_permitidos JSONB NOT NULL DEFAULT '["corretor","agente","promotor"]'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  updated_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_politica_desconto_scope_global
  ON politica_desconto_parceiro (scope)
  WHERE scope_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_politica_desconto_scope_id
  ON politica_desconto_parceiro (scope, scope_id)
  WHERE scope_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS politica_desconto_audit (
  id SERIAL PRIMARY KEY,
  acomodacao_id INTEGER,
  actor_user_id INTEGER,
  actor_role VARCHAR(40),
  action VARCHAR(40) NOT NULL,
  percentual NUMERIC(5, 2),
  preco_antes NUMERIC(12, 2),
  preco_depois NUMERIC(12, 2),
  datas JSONB,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_politica_desconto_audit_created
  ON politica_desconto_audit (created_at DESC);

INSERT INTO politica_desconto_parceiro (scope, scope_id, max_desconto_percentual, roles_permitidos)
VALUES ('global', NULL, 10, '["corretor","agente","promotor"]'::jsonb)
ON CONFLICT DO NOTHING;
