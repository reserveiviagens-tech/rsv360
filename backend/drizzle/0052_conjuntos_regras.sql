-- Phase 7.3 Anfitrião — dedicated conjuntos_regras table
-- Rollback: DROP TABLE IF EXISTS conjuntos_regras;

CREATE TABLE IF NOT EXISTS conjuntos_regras (
  id VARCHAR(64) PRIMARY KEY,
  acomodacao_id INTEGER NOT NULL REFERENCES acomodacoes(id) ON DELETE CASCADE,
  nome VARCHAR(60) NOT NULL,
  cor VARCHAR(20) NOT NULL DEFAULT 'slate',
  preco_por_noite NUMERIC(12,2),
  ajuste_pct NUMERIC(5,2),
  min_noites INTEGER,
  max_noites INTEGER,
  checkin_dias_bloqueados JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS conjuntos_regras_acomodacao_idx ON conjuntos_regras(acomodacao_id);
