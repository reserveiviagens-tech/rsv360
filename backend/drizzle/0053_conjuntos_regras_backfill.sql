-- Phase 7.3 Anfitrião — backfill conjuntos_regras from metadata.conjuntosRegras
-- Idempotent insert-only; metadata JSONB fallback remains until a later phase.
--
-- Rollback: no DROP. To undo rows created by this migration:
--   DELETE FROM conjuntos_regras WHERE id IN (
--     SELECT left(btrim(elem->>'id'), 64)
--     FROM acomodacoes a
--     CROSS JOIN LATERAL jsonb_array_elements(
--       CASE
--         WHEN jsonb_typeof(a.metadata->'conjuntosRegras') = 'array' THEN a.metadata->'conjuntosRegras'
--         ELSE '[]'::jsonb
--       END
--     ) AS elem
--     WHERE length(btrim(coalesce(elem->>'id', ''))) > 0
--   );
--
-- Apply via: npm run migrate --workspace=backend (human in each environment)

INSERT INTO conjuntos_regras (
  id,
  acomodacao_id,
  nome,
  cor,
  preco_por_noite,
  ajuste_pct,
  min_noites,
  max_noites,
  checkin_dias_bloqueados,
  criado_em,
  atualizado_em
)
SELECT
  left(btrim(elem->>'id'), 64),
  a.id,
  left(
    btrim(regexp_replace(coalesce(elem->>'nome', ''), '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g')),
    60
  ),
  CASE
    WHEN lower(btrim(coalesce(elem->>'cor', ''))) IN ('slate', 'amber', 'emerald', 'sky', 'rose')
      THEN lower(btrim(elem->>'cor'))
    WHEN lower(btrim(coalesce(elem->>'cor', ''))) IN ('#64748b', '#f59e0b', '#10b981', '#0ea5e9', '#f43f5e')
      THEN CASE lower(btrim(elem->>'cor'))
        WHEN '#64748b' THEN 'slate'
        WHEN '#f59e0b' THEN 'amber'
        WHEN '#10b981' THEN 'emerald'
        WHEN '#0ea5e9' THEN 'sky'
        WHEN '#f43f5e' THEN 'rose'
        ELSE 'slate'
      END
    ELSE 'slate'
  END,
  CASE
    WHEN elem->>'precoPorNoite' IS NOT NULL AND btrim(elem->>'precoPorNoite') <> ''
      THEN (elem->>'precoPorNoite')::numeric(12,2)
    ELSE NULL
  END,
  CASE
    WHEN elem->>'ajustePct' IS NOT NULL AND btrim(elem->>'ajustePct') <> ''
      THEN (elem->>'ajustePct')::numeric(5,2)
    ELSE NULL
  END,
  CASE
    WHEN elem->>'minNoites' IS NOT NULL AND btrim(elem->>'minNoites') <> ''
      THEN (elem->>'minNoites')::integer
    ELSE NULL
  END,
  CASE
    WHEN elem->>'maxNoites' IS NOT NULL AND btrim(elem->>'maxNoites') <> ''
      THEN (elem->>'maxNoites')::integer
    ELSE NULL
  END,
  CASE
    WHEN jsonb_typeof(elem->'checkinDiasBloqueados') = 'array'
      THEN elem->'checkinDiasBloqueados'
    ELSE NULL
  END,
  NOW(),
  NOW()
FROM acomodacoes a
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(a.metadata->'conjuntosRegras') = 'array' THEN a.metadata->'conjuntosRegras'
    ELSE '[]'::jsonb
  END
) AS elem
WHERE length(btrim(coalesce(elem->>'id', ''))) > 0
  AND btrim(elem->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND length(
    btrim(regexp_replace(coalesce(elem->>'nome', ''), '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g'))
  ) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM conjuntos_regras existing
    WHERE existing.id = left(btrim(elem->>'id'), 64)
  );
