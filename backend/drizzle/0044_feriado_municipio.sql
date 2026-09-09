-- Feriados municipais importados (ex.: FeriadosAPI dump offline).
-- Patterns MM-DD apply every year; absolute `data` optional for one-off decrees.
-- Rollback:
--   DROP TABLE IF EXISTS feriado_municipio;
--   DROP TABLE IF EXISTS feriado_import_checkpoint;

CREATE TABLE IF NOT EXISTS feriado_municipio (
  id SERIAL PRIMARY KEY,
  ibge_codigo VARCHAR(7) NOT NULL,
  uf CHAR(2) NOT NULL,
  municipio TEXT NOT NULL,
  municipio_norm TEXT NOT NULL,
  md CHAR(5) NOT NULL,
  nome TEXT NOT NULL,
  tipo VARCHAR(16) NOT NULL DEFAULT 'municipal',
  fonte VARCHAR(32) NOT NULL DEFAULT 'feriadosapi',
  ano_referencia INTEGER,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_feriado_municipio_ibge_md_nome
  ON feriado_municipio (ibge_codigo, md, nome);

CREATE INDEX IF NOT EXISTS idx_feriado_municipio_norm_uf
  ON feriado_municipio (municipio_norm, uf);

CREATE INDEX IF NOT EXISTS idx_feriado_municipio_uf_md
  ON feriado_municipio (uf, md);

CREATE TABLE IF NOT EXISTS feriado_import_checkpoint (
  id SERIAL PRIMARY KEY,
  fonte VARCHAR(32) NOT NULL DEFAULT 'feriadosapi',
  ibge_codigo VARCHAR(7) NOT NULL,
  ano INTEGER NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ok',
  detalhes TEXT,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (fonte, ibge_codigo, ano)
);
