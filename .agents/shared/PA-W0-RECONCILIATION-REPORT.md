# PA-W0 — Reconciliation Report (W0 PASS com ressalva de proveniência)

SOURCE: git working tree + HEAD | CONFIDENCE: PROVEN (estado), PARTIALLY PROVEN (proveniência)

## W0.1 Git State
- Branch: `feat/c36dd-refund-request-domain` | HEAD: `4a4be757` (4 commits locais à frente de `origin/main`=`fecc3f75`).
- Working tree: ~98 arquivos modificados (full-repo EOL churn) + dezenas de untracked `.agents/shared/*`.
- G-C.9a CLOSED preservado (sync.guard + import.guard presentes em working tree).
- G-C.9b/G-C.9c estados inalterados por esta wave (ZERO CODE).
- Proibições respeitadas: nenhum reset/clean/stash/rebase/merge/pull/push.

## W0.2 Histórico tarifas.routes.ts (`--follow`)
- `1d8ae0b5` motor dinâmico A' + API (motor off default)
- `e2e3473b` carga tarifa_* 17 unidades
- `a461c340`, `d2dd391f` guards auth/strictNullChecks
- `40de59ea` PR-07b Zod.strict allowlists
- `42030ba4` (#278) rate-calendar, iCal sync, teto desconto parceiro
- HEAD `4a4be757` não toca o arquivo; diff é working-tree vs HEAD.

## W0.3 Diff — achado central
- `git diff --numstat`: `253 253 tarifas.routes.ts` (reescrita integral aparente).
- `git diff -w --numstat`: VAZIO. `git diff --ignore-cr-at-eol --stat`: VAZIO.
- `git diff --ignore-all-space --numstat`: VAZIO.
- CONCLUSÃO PROVEN: diff é **100% whitespace/EOL (CRLF↔LF)**, zero diferença semântica. Working tree inteiro (~25k add/24k del em 98 arquivos) confirma churn EOL global, não rewrite lógico do arquivo.
- Reclassificação: "proveniência AMBÍGUA" (G-C.9b) → **RESOLVIDA como EOL noise, conteúdo semântico = HEAD**. Semântica de autoridades é a do HEAD.

## W0.4 Authority Inventory (acomodacoes)
- `index.ts:15` staffAuth(admin,manager,user) | `:16` adminAuth(admin) | públicas `/publico/*`, `/disponiveis` sem auth (publicLimiter).
- `sync.routes.ts:10` staffAuth(admin,manager,user)+requireAcomodacoesSyncViewer (G-C.9a).
- `import.routes.ts:37` importAuth(admin,manager)+requireAcomodacoesImportManager (G-C.9a).
- `tarifas.routes.ts:13-18` parceiroAuth(6 roles), masterAuth(anfitriao,admin,manager), staffAuth(admin,manager).
- `anfitriao.routes.ts:21-26` parceiroAuth, masterAuth, staffAprovacao(admin,manager).
- Services: `STAFF_ROLES={admin,manager}` (anfitriao.service:124, rate-calendar:53); `PARCEIRO_ROLES={anfitriao,corretor,agente,promotor}`; `BROKER_ROLES={corretor,agente,promotor}`; `MASTER_ROLES={admin,manager,anfitriao}` (rate-calendar:54).
- Enterprise: `requireEnterpriseRole` só em `membership/*.guard.ts` + testes; **nenhuma rota prod consome** (S9 discovery §7 vazia fora de testes).

## W0.5 Dependency Map (resumo)
- route→middleware(requireRole claim JWT)→handler(authFromReq userId+role)→service(obterUnidade/podeGerenciarUnidade/carteira)→repository(drizzle)→economic effect.
- `/simular` → `resolverTarifa` (motor off→flat; preview→dry-run). `GET politica` → `getPoliticaDesconto` (leitura sem scoping). `PUT politica` → `upsertPoliticaDesconto` (MASTER_ROLES + audit).

## Veredito W0: PASS (proveniência EOL-noise PROVEN; autoridade inventariada)
