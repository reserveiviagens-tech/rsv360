-- Host listing settings: discounts, fees, cancellation (RSV360° / Reservei Viagens)
-- Rollback:
--   ALTER TABLE acomodacoes DROP COLUMN IF EXISTS
--     desconto_semanal_pct, desconto_mensal_pct,
--     taxa_limpeza, taxa_pet, taxa_hospede_extra,
--     politica_cancelamento_curta, politica_cancelamento_longa, opcao_nao_reembolsavel;

ALTER TABLE acomodacoes
  ADD COLUMN IF NOT EXISTS desconto_semanal_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS desconto_mensal_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxa_limpeza NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS taxa_pet NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS taxa_hospede_extra NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS politica_cancelamento_curta VARCHAR(40) NOT NULL DEFAULT 'limitada',
  ADD COLUMN IF NOT EXISTS politica_cancelamento_longa VARCHAR(40) NOT NULL DEFAULT 'restrita_longa',
  ADD COLUMN IF NOT EXISTS opcao_nao_reembolsavel BOOLEAN NOT NULL DEFAULT false;
