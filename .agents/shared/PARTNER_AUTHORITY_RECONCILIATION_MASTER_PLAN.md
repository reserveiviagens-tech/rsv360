# PARTNER AUTHORITY + PROVENANCE RECONCILIATION — MASTER PLAN (registro de execução)

STATUS FINAL: `PLAN_PASS_WITH_OWNER_DECISIONS` | CODE: NOT AUTHORIZED (nenhum código escrito, alterado ou autorizado)

## Relatórios por etapa (todos separados, em .agents/shared/)
1. **W0 — PA-W0-RECONCILIATION-REPORT.md → PASS.** Git state (branch feat/c36dd, HEAD 4a4be757, ~98 arquivos EOL churn), histórico `--follow` (6 commits #100–#278), authority inventory completo, dependency map. Achado central: diff 253/253 = 100% EOL (diff -w vazio PROVEN).
2. **W1 — PA-W1-PARTNER-AUTHORITY-MAP.md → PASS.** anfitriao owner-scope; corretor/agente/promotor carteira-scope idênticos; staff bypass; cohost-extensões. Matriz preenchida só com evidência literal.
3. **W2 — PA-W2-ECONOMIC-AUTHORITY-BOUNDARY.md → PASS.** Operacional vs econômico separado; resolverTarifa/get/upsertPoliticaDesconto/aplicarDesconto classificados; boundary = Modelo D.
4. **W3 — PA-W3-ENTERPRISE-PARTNER-BOUNDARY.md → PASS.** Eligibility matrix por superfície (sync/import elegíveis PROVEN; tarifas staff Modelo A/manager; partner-aware só Modelo D). Modelo A isolado = incorreto em partner-aware.
5. **W4 — PA-W4-TARIFFS-PROVENANCE-REPORT.md → PASS.** Proveniência RESOLVIDA: EOL noise PROVEN, semântica = HEAD legítimo. Bloqueador restante do G-C.9b é arquitetural, não proveniência.
6. **W5 — PA-W5-ARCHITECTURAL-DECISION-REGISTER.md → OWNER DECISION REQUIRED.** 11 decisões PA-DEC-001..011 propostas, todas pendentes.
7. **W6 — PA-W6-GC9-REENTRY-PLAN.md → PLAN PROPOSED.** G-C.9b → RESTRUCTURE (5 sub-gates); G-C.9c → SPLIT (3 sub-gates). Nenhum sub-gate existe oficialmente; nenhuma reabertura automática.

## Conformidade
ZERO CODE / sem migration/seed/DB/staging/prod/commit/push/reset (só leitura + 7 arquivos .md de discovery em .agents/shared). G-C.9a/9b/9c preservados. PLAN_PASS ≠ CODE_AUTHORIZED. Próximo passo: OWNER REVIEW das 11 decisões → OWNER GO explícito → implementation gate específico.
