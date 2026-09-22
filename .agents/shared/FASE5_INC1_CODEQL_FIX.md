# FASE 5 Inc1 — CodeQL Fix Strategy

**Authorization:** INC1 CI FIX AUTHORIZATION (Orquestrador)  
**File only:** `backend/scripts/validate-partner-domain-0059.mjs`  
**PR:** #389 @ `212f3c21`

## Findings (annotations check-run 106783811525)

| # | Line | Rule / title | Source | Sink | Fix |
|---|------|--------------|--------|------|-----|
| 1 | 38 | Log injection (heuristic) | `detail` arg ← DB values (`id`, `status`, `table_name`s, counts) | `console.log` em `record()` | Não logar `detail`; só nome estático + PASS/FAIL |
| 2 | 117 | Untrusted data → external API | `partnerRow.id` ← `RETURNING` do INSERT | `pool.query(..., [partnerRow.id])` membership | Inserir com **UUID constante** do script; usar a constante (não o retorno) nos params |
| 3 | 124 | Untrusted data → external API | mesmo `partnerRow.id` | `UPDATE ... WHERE id = $1` | Idem — param = constante |

**Não usar:** `// codeql[...]`, desabilitar CodeQL, mudar config, dependências novas.

**Não tocar:** SQL 0059, `partners.ts`, schema, API, FE, legado.
