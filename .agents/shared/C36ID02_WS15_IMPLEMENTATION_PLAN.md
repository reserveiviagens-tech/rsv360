# WS-15 — Membership / RBAC Authority — Implementation Plan Geral

> Status: **PLAN AUTHORIZED / CODE BLOCKED** · CODE GATE = CLOSED · MIGRATION = BLOCKED · DB APPLY = BLOCKED.
> Dependencia anterior: **WS04-CONTEXT-PASS** (S1–S6 PASS/CLOSED). Dependencia seguinte: **C5 (BLOCKED)**.
> Este documento e PLANO. Nao autoriza codigo, migration, DB write, staging, deploy ou execucao financeira.

---

## 0. Regra Suprema — Claim ≠ Authority

```text
Nenhuma implementacao de WS-15 sera considerada valida se transformar claim em prova.
JWT claim ≠ membership · role do JWT ≠ role autorizada · enterpriseId declarado ≠ enterprise autorizada
req.user.role ≠ RBAC authority · membership(A) ≠ acesso(B) · membership(enterprise) ≠ acesso(property) → C5
```

## 1. Scope

### 1.1 Inclui
- Autoridade real de Membership (substituir DenyAll por lookup provado, fail-closed).
- Contrato RBAC minimo (role → permission set) de fonte servidora, nunca de input HTTP.
- Integracao com WS-04 via EnterpriseMembershipPort sem duplicar resolver (S4) nem adaptador (S5).
- Catalogo de consumidores legados (S9) e impacto de migracao (PLAN ONLY).
### 1.2 Exclui (BLOCKED, gates proprios)
- C5 property authorization (incl. with-property.ts fail-open). WS-15 fornece fundamento, nao implementa.
- WS-16/17/18/19, WS-07 payments, DE-14, DE-06, WS-08, WS-06, API regression geral.
- Migration APPLY, DB mutation, staging, deploy, producao, gateway real, payout/settlement/ledger.
- Reabertura de C36-DE-05 (PASS/CLOSED) e de WS-04 S1–S6.

## 2. Inputs / Authoritative Artifacts
- A-1 C36ID02_SECURITY_CONTRACT.md (invariantes I-*, ADD-2 fechado por WS-04 E-08).
- A-2 W1 ADR §19 (D-ID02-NS=C Dual-Key/Bridge, ADD-3=server/modules/**).
- A-3 RSV360_MASTER_IMPLEMENTATION_WAVE.md (ordem WS-04→WS-15→C5→…→DE-06).
- A-4 WS-04 Implementation Plan + S1–S6 evidence.
- A-5 Evidencia Fase 0 (2026-10-03, §6 deste plano).

## 3. Security Contract — clausulas vinculantes
- JWT/session = identidade + intencao declarada (S6). Nunca prova de membership (I-04).
- authorizedEnterpriseContext continua UNICA autoridade de tenant; WS-15 preenche a PROVA
  (membershipVerified, roles/permissions), nunca cria segunda autoridade.
- requestedEnterpriseContext = intencao, nunca autoridade. req.body/query/header .enterpriseId|userId|role nunca autoridade.
- Fail-closed: erro de lookup, role/permissao desconhecida, enterprise desconhecida, duplicidade ambigua ⇒ DENY.
- membershipVerified=true somente com evidencia do boundary WS-15. verified=false (DenyAll) = default ate WS-15 PASS.
- ENFORCE continua TEST-ONLY ate WS-15 PASS + Owner. Financial fora (I-09). DE-06 independente/bloqueado (I-10).

## 4. D-ID02-NS=C implications
- Lookup opera DEPOIS da traducao: externalKey →(S2)→ internalId →(WS-15)→ membership.
- Proibido Number(externalKey) / ent_123⇒123 como atalho: traducao pertence ao boundary WS-04.
- Chave malformada/desconhecida ⇒ membership NAO avaliado (DENY a montante em S4).
- Ponte materializada (UNIQUE+FK) = MIGRATION GATE dedicado; WS-15 consome lookup injetado, nunca DDL.

## 5. ADD-3 = server/modules/** implications
- Modulo canonico novo (se necessario) vive em server/modules/**. Proibido criar
  backend/server/modules/authorization/** (arvore backend/server/modules/payments e divergencia, nao precedente).
- Candidato: server/modules/membership/ (confirmar em S1; alternativa server/modules/authorization/ so com aditivo).
- Superficie WS-04 (server/modules/multi-property/context/*) nao e renomeada/movida.
- backend/server/modules/payments/** = Forbidden total (W1-F5/F6 + financeiro).

## 6. Auditoria Fase 0 — estado real reconciliado (2026-10-03, read-only)

### 6.1 Fontes de autoridade existentes (nao duplicar sem justificativa aprovada)
| # | Artefato | Conteudo | Veredito p/ WS-15 |
|---|---|---|---|
| F-A1 | server/middleware/auth.middleware.ts | requireRole(...roles)=roles.includes(req.user?.role); staffAuth=[authenticateJwt,requireRole('admin','manager','user')] | Role-check de CLAIMS, nao RBAC provado. Envolver/deprecar via S9, nao promover |
| F-A2 | server/modules/propostas/rbac.ts | ROLE_RANK {user:1,operador:2,manager:2,supervisor:3,admin:4}, hasMinRole, requireRoleMin | Convencao LOCAL C36. Nao promover a global sem auditoria. Candidato a adapter, nao a contrato |
| F-A3 | multi-property/db/schema/index.ts | PropertyUser {property_id,user_id,role: owner\|admin\|manager\|staff\|housekeeper\|receptionist, permissions?: string[], is_active} | Membership de PROPERTY (C5), nao de ENTERPRISE. Leitura/referencia; escrita = C5 |
| F-A4 | context/* (6 arquivos WS-04) | Port+DenyAll, S2 bridge, S4 resolver, S5 adapter, S6 claim normalizer, tipos | Contrato a preencher, nao a reescrever |
| F-A5 | enterprise_users\|memberships\|user_roles\|permissions; tabela enterprises | AUSENTES em server, backend/src/db, backend/drizzle | S1 localiza fonte real (outro schema/store?); se inexistente, S2 especifica contrato + S3 adapter sobre fonte existente; tabela nova = MIGRATION PLAN ONLY |

### 6.2 Vocabularios de role em colisao (reconciliar em S2)
admin|manager|user (staffAuth) x user|operador|manager|supervisor|admin+rank (propostas) x
owner|admin|manager|staff|housekeeper|receptionist (PropertyUser) x req.user.role (claim livre).
Nenhum e canonico global. S2 fecha equivalencia + rank canonico; S5 so usa o canonico.

### 6.3 Legados p/ S9
requireRole/staffAuth, requireRoleMin, query/header tenant (campanhas/communication WS-04 §6.2),
req.enterpriseId legado, RoleBasedAccess.tsx (frontend, nunca autoridade I-13).
Classes: MIGRATE NOW | MIGRATE C5 | MIGRATE S8 | DEPRECATE | SAFE/NO ACTION.

### 6.4 Dividas WS-04 herdadas (inalteradas)
DenyAll→real; verified=false default; enforce TEST-ONLY; S8 consumidores; ponte materializada; with-property.ts→C5.

## 7. W1-F3/F4 — sem regressao
- S6+S4+S5 nao podem ser enfraquecidos. Adapter que leia req.body/query/header .enterpriseId como prova ⇒ FAIL.
- optionalJwt sem token continua sem autoridade (R10).

## 8. Modelo logico WS-15
```text
User (principal autenticado, req.user.id) N:N Membership(User↔Enterprise)
  {status ACTIVE|INACTIVE|PENDING, timestamps, decidedBy} 1:N RoleAssignment {role canonico S2}
  N:1 role → permission set (S2) ⇒ Permission "<dominio>.<acao>" (servidor-side)
  ⇒ EnterpriseScope ──(C5)──▶ PropertyScope ──▶ Resource
Regra: inferior nunca concede mais que superior. Sem membership ACTIVE ⇒ DENY, role irrelevante.
```

## 9. Contrato WS-15 (evolucao compativel, sem quebra)
- Assinatura hasMembership(subject, externalKey, internalId) PRESERVADA (S4 nao muda).
- S2 especifica MembershipSubject {userId}, MembershipStatus {NOT_FOUND|ACTIVE|INACTIVE|DENIED|ERROR},
  MembershipVerdict {verified, status, roles?, permissions?, decidedAt?, policy}; verified=true SOMENTE se ACTIVE + prova.
- ERROR|INACTIVE|NOT_FOUND|DENIED ⇒ verified=false. policy distingue 'deny-all' (legado) de 'lookup' (real).
- Role/permission = EXTENSAO do veredito (S5), nunca port paralelo.
- Regra mecanica: nenhum caminho produz verified:true sem passar pelo adapter auditado.

## 10. Membership/Authorization Boundary (onde pluga)
```text
S4 Resolver ──hasMembership()──▶ DenyAll (hoje) ║ adapter WS-15 (S4 desta onda)
RBAC enforcement ──requireMembership()/requireRole()/requirePermission()──▶ S6 desta onda (nomes a confirmar em S2)
```
- S6 cria boundary consumivel SEM reescrever requireRole legado (vira DEPRECATE em S9).
- req.user.role (claim) nunca alimenta guards novos; somente authorizedEnterpriseContext.roles/permissions.

## 11. Property/Resource Scope — fronteira com C5
- WS-15 entrega EnterpriseScope + Role/Permission context. C5 deriva PropertyScope.
- PropertyUser e with-property.ts fail-open = referencia; escrita/reforma = C5. I-07/I-08: membership(enterprise) nao implica properties.

## 12. Allowed Files (escrita SOMENTE apos CODE GATE por fatia; fora exige aditivo)
| # | Arquivo | Fatia |
|---|---|---|
| F-1 | server/modules/membership/** NOVO (membership.types.ts, membership.adapter.ts, membership.authority.ts, rbac.*.ts, index.ts) | S2–S6 |
| F-2 | server/modules/multi-property/context/enterprise-membership.port.ts | S2 (extensao compativel) |
| F-3 | backend/src/__tests__/unit/membership-*.test.ts | S2–S5 |
| F-4 | backend/src/__tests__/integration/membership-*.integration.test.ts | S4,S6–S8 |
| F-5 | backend/src/__tests__/unit+integration/rbac-*.test.ts | S5–S7 |
| F-6 | server/modules/multi-property/context/enterprise-context.resolver.ts | S4 (plug adapter; matriz intacta) |
| F-7 | server/middleware/auth.middleware.ts | SOMENTE se S2 provar necessidade (verify/DPoP intactos) |
| F-8 | .agents/shared/C36ID02_WS15_* (evidencias da onda) | todas |
Limites: F-6 sem alterar matriz fail-closed; F-7 sem alterar verify/DPoP/staffAuth sem S9; F-1 sem DDL.

## 13. Read-Only Files (leitura obrigatoria, escrita PROIBIDA)
R-1 enterprise-key-bridge.ts (S2 WS-04) · R-2 enterprise-claim.ts (S6) · R-3 authorized-context.middleware.ts (S5; S8 le, nao reescreve)
R-4 enterprise-context.types.ts (extensao so via F-2) · R-5 tenant.middleware.ts (C36-ID-04) · R-6 with-property.ts (→C5)
R-7 property.repository.ts + db/schema/index.ts (fonte PropertyUser p/ leitura) · R-8 propostas/rbac.ts (referencia local)
R-9 backend/src/middleware/enterprise-context.js (legado) · R-10 packages/shared/src/** (incl. RoleBasedAccess)
R-11 backend/src/api/v1/auth/* (JWT/DPoP) · R-12 campanhas|communication/** (S9) · R-13 .agents/shared/** normativos (exceto F-8)
R-14 .cursor/rules/**, AGENTS.md (protegidos enterprise).

## 14. Forbidden Files (violacao reprova o PR)
```text
MIGRATION/DB: backend/drizzle/** · backend/server/modules/payments/schema.ts · backend/src/db/schema/**
  server/modules/**/db/schema/** · *.sql · seeds com write · MIGRATION APPLY = BLOCKED
FINANCIAL: backend/server/modules/payments/** · earnings/ledger/reversal/settlement/payout · gateways · refund execucao
IDENTITY: emissao de claim, jwt-verify, dpop.service, login/MFA/2FA
INFRA/DEPLOY/SECRETS: .env* · secrets · cd-*.yml · staging/prod · Docker/VPS
BASELINE: stashes · dirty/untracked pre-existentes (preservar, nao limpar/add/commit por este agente)
OUTRAS WS: C5, WS-16..19, WS-07, DE-14, DE-06, WS-08 — zero toque
```

## 15. Single Writer Lock
Uma fatia ativa por vez (Anexo A); proxima so apos merge humano. Superficies compartilhadas
(auth.middleware, port, resolver, multi-property) = serializada + antes/depois + nao-regressao + CI verde.
Paralelismo: discovery/analysis/test-design/docs. Worktrees isolados = pre-requisito futuro, nao autorizado.

## 16. Collision Map
| # | Superficie | Risco | Mitigacao |
|---|---|---|---|
| C-1 | auth.middleware.ts | ALTO | So se S2 provar; fatia dedicada por ultimo |
| C-2 | enterprise-membership.port.ts | MEDIO | Extensao compativel; S4 intacto |
| C-3 | enterprise-context.resolver.ts | MEDIO | Plug adapter; matriz intacta |
| C-4 | RoleBasedAccess.tsx/frontend | ALTO | Read-only (nunca autoridade) |
| C-5 | propostas/rbac.ts | MEDIO | Referencia; reforma so com aditivo |
| C-6 | PropertyUser/property.* | ALTO | Leitura; escrita = C5 |
| C-7 | backend/server/modules/payments/** | CRITICO | Forbidden total |
| C-8 | backend/drizzle/**+schemas | CRITICO | Forbidden total |
Collision check por fatia: git status em F-* + grep verified:true/hasMembership fora de F-* + anti-pattern count.

## 17. Decomposicao em Fatias (1 fatia → 1 PR; ordem fixa)

```text
S1 Discovery/Authority Inventory (SOMENTE auditoria, sem codigo):
   mapear identity/enterprise/membership/roles/permissions/property/middleware/guards/services/schemas/tests.
   Saida: inventario + decisao de fonte de autoridade + proposta de modulo canonico (confirmar F-1).
S2 Membership Contract: validar subject/externalKey/internalId/verdict; extensao compativel de F-2
   (MembershipStatus NOT_FOUND/ACTIVE/INACTIVE/DENIED/ERROR como dados, nunca throw-para-ALLOW).
S3 Membership Repository/Adapter: adapter LEITURA sobre fonte S1 (PropertyUser primeiro candidato);
   sem plugar no resolver; sem mudar comportamento global.
S4 Membership Authority: plugar adapter no resolver S4 via injecao (F-6); DenyAll→Authority atras de
   flag TEST-ONLY; fail-closed preservado; matriz WS-04 intacta.
S5 RBAC Context: role→permission set de fonte servidora no contexto autorizado; sem property.
S6 RBAC Enforcement Boundary: requireMembership/requireRole/requirePermission (nomes a confirmar em S1);
   boundary consumivel, sem reescrever consumidores.
S7 Negative Security Suite: no/wrong/inactive/spoofed/insufficient/error/duplicate/cross-enterprise ⇒ DENY.
S8 WS-04 Integration: cadeia JWT→S6→S5→S4→S2→WS-15→authorizedEnterpriseContext verde + regressao WS-04.
S9 Legacy Consumer Audit: classificar MIGRATE NOW / MIGRATE C5 / MIGRATE S8 / DEPRECATE / SAFE.
S10 WS15 Gate: fechar WS15-MEMBERSHIP-RBAC-PASS com todas as evidencias (E-01..E-15).
```

## 18. Test Strategy (por fatia; fakes em memoria, sem DB/migration)

```text
UNIT (S2–S5): contrato (5 status), normalizacao de subject, adapter com fonte falsa
  (found-active/inactive/not-found/throw/duplicate), RBAC (role→permissions, unknown⇒DENY).
INTEGRACAO (S4,S6–S8): resolver+authority (verified true/false), enforcement boundary (ALLOW/DENY),
  cadeia completa JWT→contexto autorizado; supertest + app real como em WS-04 S5/S6.
STATIC SCAN (toda fatia): anti-pattern WS-04 + `verified:true` literal fora de teste falso-positivo
  + `hasMembership|requireRole|requirePermission` fora de F-* ⇒ FAIL.
COBERTURA: authority+adapter+RBAC = 100% branches; thresholds backend mantidos; nenhuma reducao.
```

## 19. Negative / Security Tests (nomeados; sem eles a fatia nao fecha)

```text
G-01 no membership ⇒ DENY (verified=false) · G-02 wrong enterprise ⇒ DENY · G-03 wrong user ⇒ DENY
G-04 claim invalido/adulterado ⇒ DENY a montante · G-05 spoofed enterprise (query/header/body) ⇒ sem efeito
G-06 spoofed role (req.user.role/claim) ⇒ ignorado · G-07 missing role ⇒ DENY · G-08 insufficient permission ⇒ DENY
G-09 inactive membership ⇒ DENY · G-10 repository throw ⇒ DENY fail-closed · G-11 duplicate ambiguo ⇒ DENY
G-12 cross-enterprise A→B ⇒ DENY · G-13 enterprise desconhecida ⇒ DENY · G-14 internal null ⇒ membership nao avaliado
G-15 erro infra ⇒ DENY com status ERROR (nunca ALLOW) · G-16 membership(A) ⇏ property (C5 preservado)
G-17 req.body.userId/query.userId/header.userId como subject ⇒ ignorado · G-18 role local C36 ⇏ RBAC global
```

## 20. Regression Tests (WS-04 verde + C36-DE-05 intocado)

```text
SUITES WS-04 (todas verdes por fatia a partir de S4):
  enterprise-key-bridge (24) · enterprise-membership-port (8) · enterprise-context-resolver (30)
  authorized-enterprise-context (11) · auth-enterprise-claim (25) · tenant C36-ID-04 (26).
REGRA: modo legacy default preserva comportamento observavel pre-fatia; mudanca so atras de flag
  TEST-ONLY com teste dedicado. `npm run test --workspaces --if-present` verde = pre-requisito de PR.
C36-DE-05: PASS/CLOSED — nenhum arquivo de refund tocado; qualquer toque = FAIL do gate WS-15.
```

## 21. Migration Strategy — PLAN ONLY (APPLY BLOCKED)

```text
SE a auditoria S1 provar necessidade de estrutura nova, o plano dedicado contera:
  current schema → target schema · bridge · backfill auditado (sem inferencia Number(externalKey))
  UNIQUE(external_key)+FK(enterprises)+indices · journal ADD-4 formalizado · cutover por injecao
  (troca implementacao do adapter, nunca o contrato) · verificacao unicidade/integridade.
NESTA ONDA: nenhum DDL, nenhum *.sql novo aplicado, nenhum seed com write, nenhum backfill executado.
Ponte materializada (UNIQUE+FK) e reconciliacao UUID×serial (W1-F2/F5) = MIGRATION GATE dedicado futuro.
```

## 22. Rollback Strategy (codigo+flag; sem dados novos)

```text
1. FLAG TEST-ONLY (default legacy/DenyAll): voltar a flag = comportamento pre-fatia bit-a-bit.
2. Revert por PR: cada fatia 1 PR autocontido ⇒ revert limpo; sem estado persistente novo.
3. Novos arquivos (F-1) removiveis sem quebrar legado DESDE QUE nenhum consumidor migrado
   (consumidores so migram em fatia dedicada, nunca na que cria a API).
4. Gatilho: teste §20 falha em main OU legacy diverge OU CI slice vermelho sem causa externa
   ⇒ REVERT + post-mortem antes da proxima tentativa. Proibido "corrigir para frente" em main.
```

## 23. CI Implications (gate de primeira classe por fatia)

```text
Slice → tests (unit+integracao+G-01..G-18+regressao §20) → typecheck → lint → scope scan (§18)
  → security regression (gitleaks+security.yml) → PR pequeno → CI (ci/security/route-smoke/fase4-5/e2e)
  → merge humano → proxima fatia.
Validacao obrigatoria por fatia: npm run test/type-check/lint/build --workspaces --if-present.
CI vermelho critico ⇒ proxima fatia PROIBIDA sem PR de correcao (enterprise-ci-slice-gate; Owner dispensa).
```

## 24. Executor Instructions

```text
ANTES: ler A-1..A-5 + este plano; rodar collision check + scope scan baseline; confirmar HEAD e CODE GATE;
  declarar UMA fatia ativa (Anexo A). DURANTE: escrever SOMENTE §12 da fatia ativa; nao redefinir arquitetura;
  verified=true so com prova WS-15; sem `as any` em framework; sem catch silencioso; fakes em memoria.
ANTES DO PR: 4 comandos verdes + scan sem aumento + collision repetido + PR pequeno com escopo/arquivos/
  invariantes/testes/rollback + revisao humana + sem auto-merge/force.
PROIBIDO: interpretar plano como CODE; tocar R-*/Forbidden "p/ testar"; DB/migration; limpar baseline;
  commit/push sem autorizacao; RBAC/property/PLATFORM_SUPER_ADMIN/step-up "de passagem".
```

## 25. CODE GATE — CLOSED

```text
WS-15 CODE GATE = CLOSED. Este plano NAO autoriza implementacao. Abertura exige, NESTA ORDEM:
  1. PLAN VALIDATION pelo Owner; 2. decisao SEPARADA de CODE GATE; 3. designacao da fatia (S1, auditoria).
Sem 1+2+3, qualquer codigo sob este plano e NAO-AUTORIZADO e deve ser descartado.
Fronteiras intactas: C5/WS-16..19/WS-07/DE-14/DE-06 = BLOCKED; MIGRATION/DB/STAGING/PROD/FINANCIAL = BLOCKED.
```

## 26. Exit Criteria (WS15-MEMBERSHIP-RBAC-PASS) + Evidence

```text
E-01 identity authority definida (subject = principal autenticado; body/query/header ignorados).
E-02 enterprise authority definida (traducao S2 antes do lookup; sem Number(externalKey)).
E-03 membership authority definida (contrato S2 + adapter S3 + plug S4).
E-04 lookup real atras de flag, DenyAll substituivel sem mudar contrato.
E-05 fail-closed em todos os ramos (G-10/G-11/G-15). E-06 role contract de fonte servidora.
E-07 permission contract (role→set; unknown⇒DENY). E-08 enterprise isolation (G-02/G-12).
E-09 G-01..G-18 verdes. E-10 regressao §20 verde. E-11 legados catalogados (S9).
E-12 boundary property preservado (C5 intacto). E-13 sem autoridade duplicada (§23 da autorizacao).
E-14 migration impact documentado (PLAN ONLY). E-15 rollback documentado e exercitado em DRY-RUN.
EVIDENCIA: PRs mergeados + logs de testes + scan antes/depois + typecheck/lint/build + matriz publicada +
  DRY-RUN rollback + dividas (C5/MIGRATION) + baseline final + collision final + historico de gates.
```

## Anexo A — Fatias (resumo executavel) | Anexo B — Gates | Anexo C — Tree na emissao

```text
S1 audit-only → S2 contrato → S3 adapter → S4 authority(plug) → S5 RBAC ctx → S6 enforcement →
S7 negativos → S8 integracao WS-04 → S9 legados → S10 gate. (Detalhe: §17.)
GATES: W0 PASS/CLOSED · W1 PASS · WS-04 PASS/CLOSED (WS04-CONTEXT-PASS) · WS-15 PLAN AUTHORIZED 2026-10-03
  · PENDING: PLAN VALIDATION → CODE GATE (S1) → WS15-MEMBERSHIP-RBAC-PASS.
TREE: HEAD 61040b02; plano = novo untracked .agents/shared/C36ID02_WS15_IMPLEMENTATION_PLAN.md;
  nenhum reset/add/commit/push; stashes preservados.
```

*Fim do WS-15 Implementation Plan. CODE GATE = CLOSED. Aguardando PLAN VALIDATION.*







