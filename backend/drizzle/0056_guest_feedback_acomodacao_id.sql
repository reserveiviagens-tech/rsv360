-- Phase 9.2 Anfitrião — link guest feedback to acomodacoes for Desempenho aggregates
--
-- Rollback:
--   DROP INDEX IF EXISTS guest_feedback_acomodacao_idx;
--   ALTER TABLE guest_feedback DROP COLUMN IF EXISTS acomodacao_id;
--
-- Apply via: npm run migrate --workspace=backend (human in each environment; do NOT auto-run on prod)

DO $$
BEGIN
  IF to_regclass('public.guest_feedback') IS NOT NULL THEN
    ALTER TABLE guest_feedback
      ADD COLUMN IF NOT EXISTS acomodacao_id INTEGER REFERENCES acomodacoes(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS guest_feedback_acomodacao_idx
      ON guest_feedback(acomodacao_id)
      WHERE acomodacao_id IS NOT NULL;
  END IF;
END $$;

-- Best-effort backfill from bookings / propostas when booking_id is present.
-- Safe to re-run; only fills rows where acomodacao_id IS NULL.
DO $$
BEGIN
  IF to_regclass('public.guest_feedback') IS NOT NULL
     AND to_regclass('public.bookings') IS NOT NULL THEN
    UPDATE guest_feedback gf
    SET acomodacao_id = resolved.acomodacao_id
    FROM (
      SELECT
        gf2.id AS feedback_id,
        COALESCE(
          NULLIF((b.metadata->>'acomodacaoId')::integer, 0),
          NULLIF((b.metadata->>'selectedAcomodacaoId')::integer, 0),
          CASE
            WHEN lower(coalesce(b.booking_type, '')) IN (
              'hotel', 'accommodation', 'acomodacao', 'acomodacao_rsv', 'stay'
            )
              AND b.item_id IS NOT NULL
              AND b.item_id > 0
            THEN b.item_id
            ELSE NULL
          END,
          NULLIF((p.metadata->>'acomodacaoId')::integer, 0),
          NULLIF((p.metadata->>'selectedAcomodacaoId')::integer, 0)
        ) AS acomodacao_id
      FROM guest_feedback gf2
      LEFT JOIN bookings b
        ON b.id::text = gf2.booking_id::text
        OR b.booking_code = gf2.booking_id::text
      LEFT JOIN propostas p
        ON p.id = NULLIF((b.metadata->>'propostaId')::integer, 0)
      WHERE gf2.acomodacao_id IS NULL
    ) resolved
    WHERE gf.id = resolved.feedback_id
      AND resolved.acomodacao_id IS NOT NULL;
  END IF;
END $$;
