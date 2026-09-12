-- Phase 7.1 Anfitrião — backfill coanfitriao_convites from metadata.coanfitrioes
-- Idempotent insert-only; metadata JSONB fallback remains until a later phase.
--
-- Rollback: no DROP. To undo rows created by this migration:
--   DELETE FROM coanfitriao_convites WHERE token LIKE 'bf-%';
--
-- Apply via: npm run migrate --workspace=backend (human in each environment)

INSERT INTO coanfitriao_convites (
  id,
  acomodacao_id,
  nome,
  email,
  papel,
  status,
  invited_by_user_id,
  token,
  invited_at,
  updated_at
)
SELECT
  CASE
    WHEN length(btrim(coalesce(elem->>'id', ''))) > 0
         AND length(btrim(coalesce(elem->>'id', ''))) <= 64
         AND NOT EXISTS (
           SELECT 1
           FROM coanfitriao_convites cc
           WHERE cc.id = left(btrim(elem->>'id'), 64)
         )
      THEN left(btrim(elem->>'id'), 64)
    ELSE gen_random_uuid()::text
  END,
  a.id,
  left(
    btrim(regexp_replace(coalesce(elem->>'nome', ''), '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g')),
    120
  ),
  lower(left(btrim(coalesce(elem->>'email', '')), 254)),
  CASE
    WHEN btrim(coalesce(elem->>'papel', '')) IN ('calendario', 'mensagens', 'tudo')
      THEN btrim(elem->>'papel')
    ELSE 'tudo'
  END,
  CASE
    WHEN btrim(coalesce(elem->>'status', '')) IN ('pendente', 'ativo', 'revogado')
      THEN btrim(elem->>'status')
    ELSE 'pendente'
  END,
  NULL,
  'bf-' || gen_random_uuid()::text,
  NOW(),
  NOW()
FROM acomodacoes a
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(a.metadata->'coanfitrioes') = 'array' THEN a.metadata->'coanfitrioes'
    ELSE '[]'::jsonb
  END
) AS elem
WHERE length(btrim(coalesce(elem->>'email', ''))) > 0
  AND lower(btrim(coalesce(elem->>'email', ''))) ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'
  AND length(
    btrim(regexp_replace(coalesce(elem->>'nome', ''), '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g'))
  ) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM coanfitriao_convites existing
    WHERE existing.acomodacao_id = a.id
      AND lower(existing.email) = lower(btrim(coalesce(elem->>'email', '')))
      AND existing.status IN ('pendente', 'ativo')
  )
  AND NOT EXISTS (
    SELECT 1
    FROM coanfitriao_convites existing
    WHERE existing.acomodacao_id = a.id
      AND existing.token LIKE 'bf-%'
      AND length(btrim(coalesce(elem->>'id', ''))) > 0
      AND existing.id = left(btrim(elem->>'id'), 64)
  );
