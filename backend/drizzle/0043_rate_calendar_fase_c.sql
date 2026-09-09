-- Phase C: smart pricing, advanced host discounts, availability rules, iCal
-- Rollback:
--   ALTER TABLE acomodacoes DROP COLUMN IF EXISTS
--     preco_inteligente_ativo, preco_inteligente_min, preco_inteligente_max,
--     desconto_ultima_hora_pct, desconto_ultima_hora_dias,
--     desconto_antecipada_pct, desconto_antecipada_dias,
--     desconto_novo_anuncio_pct, desconto_novo_anuncio_limite,
--     desconto_avaliacao_pct, desconto_avaliacao_min_nota, desconto_avaliacao_min_reviews,
--     tempo_preparacao_noites, periodo_disponibilidade_meses,
--     checkin_dias_permitidos, checkout_dias_permitidos, ical_token;

ALTER TABLE acomodacoes
  ADD COLUMN IF NOT EXISTS preco_inteligente_ativo BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preco_inteligente_min NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS preco_inteligente_max NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS desconto_ultima_hora_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS desconto_ultima_hora_dias INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS desconto_antecipada_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS desconto_antecipada_dias INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS desconto_novo_anuncio_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS desconto_novo_anuncio_limite INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS desconto_avaliacao_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS desconto_avaliacao_min_nota NUMERIC(3, 1) NOT NULL DEFAULT 4.8,
  ADD COLUMN IF NOT EXISTS desconto_avaliacao_min_reviews INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS tempo_preparacao_noites INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS periodo_disponibilidade_meses INTEGER NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS checkin_dias_permitidos JSONB,
  ADD COLUMN IF NOT EXISTS checkout_dias_permitidos JSONB,
  ADD COLUMN IF NOT EXISTS ical_token VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_acomodacoes_ical_token
  ON acomodacoes (ical_token)
  WHERE ical_token IS NOT NULL;
