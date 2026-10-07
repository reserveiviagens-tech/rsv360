# RSV360 — MASTER PLAN GERAL

## Governança Técnica, Autoridade de Membership, Multi-Tenancy, Segurança e Execução Controlada

- **Sistema:** RSV360°
- **Empresa:** Reservei Viagens
- **Owner / Desenvolvedor:** Douglas P. Figueiredo
- **Repositório:** reserveiviagens-tech/rsv360
- **Branch operacional atual:** feat/c36dd-refund-request-domain
- **Data de referência:** 05/10/2026
- **Status geral:** EXECUÇÃO CONTROLADA — WAVE DE AUTORIDADE EM ANDAMENTO

---

## 1. PROPÓSITO

Este documento é o Master Plan Geral do RSV360 para consolidar, em uma única fonte de governança, o estado técnico, arquitetural, de segurança, multi-tenancy, autorização, financeiro, banco de dados, testes, infraestrutura e próximos gates do sistema.

O documento deve servir simultaneamente como:

- mapa executivo do programa técnico;
- mapa de dependências;
- fonte de verdade dos gates;
- contrato de execução para Antigravity/Cline/Cursor;
- mecanismo de preservação de proveniência;
- mecanismo de controle de escopo;
- registro de decisões arquiteturais;
- proteção contra execução prematura;
- base para futuras waves;
- referência para auditoria técnica.

## 2. PRINCÍPIO FUNDAMENTAL

**PASS ≠ GO**

Um gate PASS significa que a fatia avaliada foi considerada válida.

Não significa autorização automática para:

- próximo gate;
- código adicional;
- migration;
- DB write;
- seed;
- staging;
- produção;
- commit;
- push;
- integração financeira;
- gateway;
- payout;
- refund real.

**PLAN_PASS ≠ CODE_AUTHORIZED**

Um plano aprovado não autoriza implementação.

**TEST_PASS ≠ MIGRATION_AUTHORIZED**

Testes aprovados não autorizam aplicação de migration.

**MIGRATION_APPLIED ≠ STAGING_AUTHORIZED**

Uma migration aplicada no banco local isolado não autoriza staging.

**STAGING_PASS ≠ PRODUCTION_AUTHORIZED**

Staging aprovado não autoriza produção.

## 3. MODELO DE GOVERNANÇA

### 3.1 Antigravity

Responsabilidades:

- Tech Lead;
- Orchestrator;
- Gatekeeper;
- reconciliação;
- planejamento;
- validação;
- controle de dependências;
- classificação de escopo;
- preservação de proveniência;
- decisão sobre READY / BLOCKED / PASS / NEEDS_REWORK.

Não deve presumir autorização do Owner.

### 3.2 Cline / Cursor

Responsabilidades:

- execução da fatia explicitamente autorizada;
- alteração somente dos arquivos dentro do escopo;
- execução dos testes definidos;
- produção de evidências;
- parada obrigatória ao atingir o limite do gate.

Não devem:

- avançar para o próximo gate automaticamente;
- fazer commit sem autorização;
- fazer push sem autorização;
- executar migration não autorizada;
- escrever em staging/prod;
- tocar áreas explicitamente excluídas.

### 3.3 Owner

Douglas P. Figueiredo é a autoridade final para:

- mudança de escopo;
- decisões arquiteturais;
- migrations;
- DB writes;
- staging;
- produção;
- commit;
- push;
- operações financeiras reais;
- gateways;
- payout;
- refund real;
- avanço entre gates.

## 4. GUARDRAILS PERMANENTES

### 4.1 Single Writer Lock

Durante uma fatia:

- um executor altera código;
- demais agentes não alteram simultaneamente;
- análise pode ocorrer paralelamente somente se não houver escrita conflitante.

### 4.2 CI Slice Gate

Cada fatia deve possuir:

- escopo;
- arquivos permitidos;
- arquivos proibidos;
- testes;
- invariantes;
- resultado;
- classificação;
- parada.

### 4.3 No destructive Git operations

Sem autorização explícita:

- não reset;
- não clean;
- não stash;
- não checkout destrutivo;
- não rebase;
- não merge;
- não cherry-pick;
- não apagar trabalho existente.

### 4.4 Commit e push

Continuam sendo gates independentes.

Nenhuma implementação deste Master Plan implica autorização para:

```
git commit
git push
```

## 5. ESTADO BASE CONSOLIDADO

### 5.1 Gates anteriores — C36

Os gates financeiros de refund previamente concluídos permanecem preservados.

A execução financeira real continua separada da camada de autorização.

### 5.2 WS-15 (S1–S9)

- S1 PASS/CLOSED
- S2 PASS/CLOSED
- S3 PASS/CLOSED
- S4 PASS/CLOSED
- S5 PASS/CLOSED
- S6 PASS/CLOSED
- S7 PASS/CLOSED
- S8 PASS/CLOSED
- S9 PASS/CLOSED

**S8** — Integração TEST-ONLY validada.

A cadeia:

```
JWT
 ↓
Membership / Canonical Context
 ↓
Role Guards
```

foi validada sem transformar o S8 em migração automática de consumidores.

**S9** — O legado de `requireRole()` foi reconciliado.

Estado descoberto:

- 28 chamadas;
- 22 arquivos;
- 7 módulos staffAuth-only;
- 5 guards locais;
- conflitos de autoridade em propostas;
- CLASS-B enterpriseId separado para E-13;
- site-publico fora do escopo.

## 6. S9 — G-A

**Status: G-A = PASS/CLOSED**

Foram tratados:

- duplicação do middleware;
- cloud auth stub;
- `requireRoleMin` morto;
- preservação da autoridade S4/S5/S6;
- fail-closed.

Nenhum consumidor funcional foi migrado em G-A.



## 7. ROLEASSIGNMENT WAVE

A RoleAssignment Wave foi criada porque G-B dependia de uma fonte persistida real de papel por usuário/enterprise.

**Estado atual**

- M0 PASS/CLOSED
- M1 PASS/CLOSED
- M2 PASS/CLOSED
- M3 PASS/CLOSED
- M4 PASS/CLOSED
- M5 PASS/CLOSED
- M6 PASS/CLOSED

## 8. M0 — RECONCILIAÇÃO

**Resultado:** ROLEASSIGNMENT_RECONCILIATION.md

Principais conclusões:

**Entidades existentes:** `users`, `enterprises`, `properties`, `property_users`, `partner_memberships`.

**Ausência confirmada.** Não havia:

- `enterprise_users`;
- `memberships`;
- `role_assignments`;
- `user_roles`;
- `tenant_memberships`;

como fonte persistida de autorização enterprise.

**Decisão:** criar uma entidade própria: `enterprise_users`.

## 9. M1 — DECISÃO ARQUITETURAL

**Resultado:** ROLEASSIGNMENT_ARCHITECTURAL_DECISION.md

- **D1** — `enterprise_users` é a entidade authoritative de user × enterprise.
- **D2** — Role permanece como coluna da assignment. Não será criada uma estrutura 1 de roles nesta versão.
- **D3** — Regra: 1 usuário + 1 enterprise = no máximo 1 assignment ativa.
- **D4** — Catálogo canônico: `owner`, `admin`, `manager`, `viewer`.
- **D5** — Lifecycle: `active`, `inactive`, `suspended`, `revoked`. Somente `active` autoriza.
- **D6** — Constraints: PK; UNIQUE (user_id, enterprise_id); FKs; CHECK de role; CHECK de status; índices.
- **D7** — Auditoria: timestamps; `decided_by`; sem DELETE físico.
- **D8** — JWT não é autoridade de role.
- **D9** — Autoridades concorrentes serão eliminadas por migração dos consumidores.
- **D10** — Isolamento multi-tenant obrigatório. RLS não faz parte da V1 desta wave.

## 10. M2 — MIGRATION PLAN

**Resultado:** ROLEASSIGNMENT_MIGRATION_PLAN.md

- Migration alvo: `0064_enterprise_users`.
- Base real: 64 SQL migrations, 64 journal entries, latest = 0063.
- A migration contém: tabela; constraints; índices; rollback; testes; estratégia de seed.
- Nenhum seed automático foi autorizado como parte da execução.

## 11. M3 — MIGRATION GATE

**Status: M3 = PASS/CLOSED (7/7)**

Validações: schema; authority; data model; rollback; test strategy; security; isolation.

Seed recomendado: **Option A — manual / controlado**.

## 12. M4 — MIGRATION

Migration `0064_enterprise_users` aplicada somente no banco PostgreSQL local isolado autorizado.

- Ambiente: `rsv360-postgres`; DB: `rsv_360_ecosystem`; Host: 127.0.0.1; Port: 5433.
- Resultado: migration = SUCCESS; journal = 65/65.
- Tabela criada com: PK; unique user/enterprise; role CHECK; status CHECK; FKs; índices.

**Importante:** não houve seed; staging; produção; gateway; payout; refund real.

## 13. M5 — REPOSITORY

**Status: M5 = PASS/CLOSED**

Repository implementado com isolamento por injeção.

Validações: 6/6 repository tests; 14/14 legacy-isolation; 89/89 sibling suites.

Live read-only:

```
isConfigured = true
findMembership(7,42) = null
findRole(7,42) = null
```

A ausência é corretamente tratada como DENY. Não houve seed.

## 14. M6 — CANONICAL ADAPTER

**Status: M6 = PASS/CLOSED**

Adapter: `server/modules/membership/role-assignment.adapter.ts`

Fluxo:

```
enterprise_users.role
        ↓
MembershipRecord.recordRole
        ↓
CanonicalRoleContext
        ↓
requireEnterpriseRole()
```

Fonte: `membership-record`.

O adapter não aceita: JWT claim; body; query; header; Request como fonte de role.

Ausência/erro: DENY.

Testes: 8/8 adapter; 8 suites / 117 tests regression.



## 15. AUTORIDADE CANÔNICA

A autoridade final da autorização enterprise é:

**RoleAssignment / MembershipRecord** com `enterprise_users` como fonte persistida.

Modelo:

```
JWT
 │
 │ autenticação
 ▼
Authenticated User
 │
 ▼
Enterprise Context
 │
 ▼
MembershipRepository
 │
 ▼
enterprise_users
 │
 ▼
CanonicalRoleContext
 │
 ▼
Enterprise Role Guard
 │
 ├── owner
 ├── admin
 ├── manager
 └── viewer
```

## 16. REGRA DE SEGURANÇA CENTRAL

A regra do sistema passa a ser:

**Membership provada + assignment ativa + role canônica válida + enterprise correto = autorização possível.**

Qualquer ausência crítica deve resultar em: **DENY**. Nunca ALLOW por fallback.

## 17. G-B — MIGRAÇÃO DOS CONSUMIDORES

G-B remove progressivamente a dependência de autorização legada.

Ordem obrigatória:

```
G-B.1 CRM
   ↓
G-B.2 Guest Portal/Admin
   ↓
G-B.3 Multi-property
   ↓
G-B.4 Revenue
   ↓
G-B.5 Payments
```

Um alvo por vez.

## 18. G-B.1 — CRM

**Status: PASS/CLOSED**

Implementado: `server/modules/membership/crm.guard.ts`

Flag: `WS15_MEMBERSHIP_AUTHORITY`

Fluxo:

```
authenticateJwt
 ↓
legacy requireRole()
 ↓
requireCrmManager
 ↓
CanonicalRoleContext
 ↓
requireEnterpriseRole(manager)
```

A flag OFF preserva o comportamento anterior. A flag ON exige autoridade canônica.

Resultados:

- G-B.1 = PASS
- 10/10 dedicated
- 18/18 G-B.1 + M6
- 98/98 membership
- 91/91 role/rbac/crm

Nenhum outro consumidor foi tocado.

## 19. G-B.2 — GUEST PORTAL / ADMIN

**Status: AGUARDANDO GO**

**Escopo:** somente `guest-portal/admin`.

**Deve fazer:** migrar autorização prevista no S9; utilizar autoridade canônica; preservar JWT authentication; preservar isolamento enterprise; fail-closed; testes específicos; regressão.

**Não pode tocar:** CRM; multi-property; revenue; payments.

**Não pode fazer:** commit; push; migration; seed; staging; produção.

**Resultado esperado:** um de PASS / NEEDS_REWORK / BLOCKED. Após qualquer resultado: **STOP**.



## 20. G-B.3 — MULTI-PROPERTY

Só será iniciado após: **G-B.2 = PASS/CLOSED**.

Escopo exclusivo: `multi-property`.

Objetivos: substituir autorização legada prevista; usar autoridade canônica; preservar contexto enterprise; manter fail-closed; validar cross-enterprise isolation; regressão.

Nenhum outro alvo será tocado.

## 21. G-B.4 — REVENUE

Só será iniciado após: **G-B.3 = PASS/CLOSED**.

Escopo exclusivo: `revenue`.

Deve receber atenção especial por operar próximo ao domínio econômico.

Obrigatório: authority review; tenant isolation; role hierarchy; testes de autorização; regressão financeira adjacente.

Nenhuma alteração de cálculo financeiro deve ser introduzida incidentalmente.

## 22. G-B.5 — PAYMENTS

Última fatia. Payments só pode começar depois de **G-B.4 = PASS/CLOSED** e após **revisão financeira específica**.

**Regra:** a migração de autorização não pode alterar: cálculo financeiro; ledger; earnings; payout; refund; gateway; split; settlement. Apenas a autoridade de acesso deve ser alterada.

Qualquer alteração financeira incidental: **BLOCK** e volta para análise.

## 23. G-C — STAFFAUTH E LITERALS

Depois de G-B, **G-C** trata os módulos: staffAuth-only; literals; consumidores restantes classificados pelo S9.

**Estratégia:** um módulo por gate. Não realizar uma grande migração em massa.

Cada módulo: Discovery → Plan → Implementation → Tests → Regression → PASS/CLOSED.

## 24. G-D — PROPOSTAS / AGENTES

Este é um ponto arquitetural sensível.

**Propostas** — foi identificada coexistência de: autoridade canônica; guard local; outras autoridades. A decisão local de RANK não deve ser promovida automaticamente para autoridade global.

**Agentes** — o body não pode substituir a autoridade enterprise.

Regra: **Request input ≠ authorization authority**.

## 25. G-E — CLASS-B / ENTERPRISEID

CLASS-B permanece separado. Não absorver silenciosamente E-13.

Objetos como: query enterpriseId; header; path; defaults; carriers legados; devem passar por sua própria reconciliação.

**E-13** é uma wave independente. Não reabrir S9 para incorporá-la.

## 26. S10

**Estado: NOT STARTED**

S10 só deve ser iniciado quando as dependências necessárias de S9/G-B/G-C/G-D estiverem maduras.

S10 deverá começar por **DISCOVERY** e não por código.



## 27. TESTES — ESTRATÉGIA GERAL

Cada gate deve possuir três níveis.

**Nível 1 — Teste específico:** exclusivamente para a mudança (ex.: `crm-guard.test.ts`).

**Nível 2 — Regression family:** testes imediatamente relacionados (membership; role; rbac; authority).

**Nível 3 — Global regression:** executado quando aplicável.

Falhas devem ser classificadas: NEW / PRE-EXISTING / ENVIRONMENTAL / UNRELATED.

Nunca declarar regressão como causada pela mudança sem evidência.

## 28. FAIL-CLOSED MATRIX

| Situação | Resultado |
|---|---|
| Membership ausente | DENY |
| Role ausente | DENY |
| Role inválida | DENY |
| Assignment inexistente | DENY |
| Assignment inativa | DENY |
| Assignment suspensa | DENY |
| Assignment revogada | DENY |
| Repository erro | DENY |
| Contexto enterprise ausente | DENY |
| Cross-enterprise | DENY |
| JWT role spoof | DENY |
| Body role spoof | DENY |
| Query role spoof | DENY |
| Header role spoof | DENY |
| Repository unconfigured com authority ON | DENY |

## 29. MULTI-TENANT ISOLATION

Regra: `user ∈ enterprise A` **não implica** `user ∈ enterprise B`.

Mesmo usuário pode possuir assignments diferentes em enterprises diferentes.

Toda resolução deve preservar `user_id + enterprise_id`. Nunca somente `user_id`.

## 30. ROLE HIERARCHY

Hierarquia canônica:

```
viewer < manager < admin < owner
```

Uma role superior satisfaz requisito inferior somente dentro da mesma enterprise.

Exemplo: `admin@EnterpriseA` não autoriza `manager@EnterpriseB`.

## 31. DADOS LEGADOS

Não realizar migração automática de `users.role` para `enterprise_users` sem gate específico.

`users.role` permanece legado enquanto consumidores forem migrados.

A existência do campo não deve ser interpretada como autorização enterprise canônica.

## 32. SEED / OWNER

A conversão de `enterprises.owner_id` para `enterprise_users.role = owner` é uma operação de dados distinta.

Não deve ocorrer automaticamente durante implementação de consumidores. Deve possuir **Data Migration Gate** próprio.

## 33. MIGRATION POLICY

Toda migration deve possuir: discovery; architectural decision; migration plan; migration gate; environment gate; apply authorization; result evidence; rollback evidence; post-apply validation.

Nenhum código consumidor pode assumir que uma migration foi aplicada apenas porque existe um arquivo SQL.

## 34. DATABASE POLICY

Ambientes: **LOCAL ISOLATED**, **STAGING**, **PRODUCTION** são gates distintos.

- **LOCAL** — pode ser autorizado para validação controlada.
- **STAGING** — necessita autorização própria.
- **PRODUCTION** — necessita autorização própria e revisão final.

## 35. FINANCIAL SAFETY

Arquitetura financeira:

```
Partner → Affiliate → Marketplace → Split → Earnings → Ledger → Payouts

Refund: Refund Request → Decision → Refund Service → Earning Reversal → Ledger
```

Nenhuma migração de autorização pode modificar esse fluxo. Especialmente em: payments; refund; ledger; payout; gateway. Qualquer alteração inesperada é bloqueadora.



## 36. INFRAESTRUTURA

Staging permanece separado.

Contexto conhecido: `/opt/rsv360-staging` com: postgres; redis; backend; frontend.

Nenhum gate atual autoriza alteração em staging. Produção permanece totalmente protegida.

## 37. PROVENIÊNCIA

Toda alteração deve ser classificada como: CURRENT GATE / PRE-EXISTING / OTHER WORKFLOW / BASELINE / UNKNOWN.

UNKNOWN não deve ser absorvido pelo gate atual. Deve parar e exigir reconciliação.

## 38. GIT POLICY

Estado atual deve continuar sendo preservado.

Não executar automaticamente: merge; rebase; reset; clean; stash; cherry-pick; push.

A publicação dos commits é um gate separado.

## 39. DOCUMENTAÇÃO OBRIGATÓRIA

Cada gate relevante deve gerar: DISCOVERY; PLAN; VALIDATION; EVIDENCE; RESULT.

Quando aplicável: DECISION REGISTER; MIGRATION GATE; ENVIRONMENT EVIDENCE; REGRESSION RESULT.

## 40. MASTER GATE MATRIX

| Wave | Gate | Estado |
|---|---|---|
| WS-15 | S1–S7 | PASS/CLOSED |
| WS-15 | S8 | PASS/CLOSED |
| WS-15 | S9 | PASS/CLOSED |
| S9 | G-A | PASS/CLOSED |
| RoleAssignment | M0 | PASS/CLOSED |
| RoleAssignment | M1 | PASS/CLOSED |
| RoleAssignment | M2 | PASS/CLOSED |
| RoleAssignment | M3 | PASS/CLOSED |
| RoleAssignment | M4 | PASS/CLOSED |
| RoleAssignment | M5 | PASS/CLOSED |
| RoleAssignment | M6 | PASS/CLOSED |
| G-B | G-B.1 CRM | PASS/CLOSED |
| G-B | G-B.2 Guest Portal/Admin | AWAITING GO |
| G-B | G-B.3 Multi-property | BLOCKED BY G-B.2 |
| G-B | G-B.4 Revenue | BLOCKED BY G-B.3 |
| G-B | G-B.5 Payments | BLOCKED BY G-B.4 + FINANCIAL REVIEW |
| G-C | StaffAuth/Literals | NOT STARTED (trilha separada; ver discovery G-C StaffAuth) |
| G-C.9 | Partner Authority (acomodacoes/tarifas/anfitriao membership) | VALIDATION_PASS_WITH_CONDITIONS |
| G-D | Propostas/Agentes/Boundary | PRINCIPAL SEQUENCE CLOSED (D.0–D.3, D.6, D.8–D.10 PASS; D.7 N/A; D.4 DEFER→G-E; WS gate separado) |
| E-13 | CLASS-B | SEPARATE |
| G-E | Remaining legacy | NOT STARTED (bloqueado até commits isolados + nova RECONCILE; OD-WAVE-04 DEFER) |
| S10 | Next WS-15 wave | NOT STARTED |

## 41. EXECUTION ORDER GLOBAL

A ordem normativa é:

```
                    ┌──────────────────┐
                    │  RECONCILIATION  │
                    └────────┬─────────┘
                             ↓
                    ┌──────────────────┐
                    │ ARCHITECTURE     │
                    └────────┬─────────┘
                             ↓
                    ┌──────────────────┐
                    │ MIGRATION PLAN   │
                    └────────┬─────────┘
                             ↓
                    ┌──────────────────┐
                    │ MIGRATION GATE   │
                    └────────┬─────────┘
                             ↓
                    ┌──────────────────┐
                    │ LOCAL DB APPLY   │
                    └────────┬─────────┘
                             ↓
                    ┌──────────────────┐
                    │ REPOSITORY       │
                    └────────┬─────────┘
                             ↓
                    ┌──────────────────┐
                    │ CANONICAL ADAPTER│
                    └────────┬─────────┘
                             ↓
                    ┌──────────────────┐
                    │ CONSUMER MIGRATION│
                    └────────┬─────────┘
                             ↓
        ┌────────────────────┼─────────────────────┐
        ↓                    ↓                     ↓
      G-B                 G-C                   G-D
        │                    │                     │
        └────────────────────┼─────────────────────┘
                             ↓
                           E-13
                             ↓
                            G-E
                             ↓
                           S10
```



## 42. REGRA DE PARADA

Qualquer uma das seguintes condições interrompe a execução:

- NEW unexpected file;
- NEW unexpected dependency;
- NEW authority source;
- cross-enterprise ambiguity;
- financial behavior change;
- migration required but not authorized;
- DB write required but not authorized;
- staging access required;
- production access required;
- test regression with unclear provenance;
- git conflict;
- unknown provenance;
- security invariant violation;
- fail-open behavior.

Estado: **BLOCKED** até nova reconciliação.

## 43. DEFINITION OF DONE DE CADA GATE

Um gate somente pode ser **PASS/CLOSED** quando:

- escopo preservado;
- arquivos esperados;
- arquivos proibidos intactos;
- testes específicos passam;
- regressão relevante passa;
- falhas pré-existentes classificadas;
- fail-closed preservado;
- tenant isolation preservado;
- autoridade única preservada;
- nenhuma nova autoridade criada;
- nenhuma migration não autorizada;
- nenhum DB write não autorizado;
- nenhum staging/prod;
- nenhum commit/push não autorizado;
- evidência registrada.

## 44. CURRENT STOP POINT

O ponto exato de parada deste Master Plan é:

```
G-B.1 CRM
    PASS/CLOSED
```

Próximo gate: **G-B.2 Guest Portal/Admin**

Estado: **AWAITING EXPLICIT OWNER GO**

Nenhuma implementação deve começar antes de:

> **GO G-B.2 — Guest Portal/Admin somente**

## 45. PRÓXIMA EXECUÇÃO AUTORIZÁVEL

Quando o Owner emitir o GO, o executor deverá:

- confirmar branch e HEAD;
- confirmar working tree;
- confirmar G-B.1 CLOSED;
- confirmar M0–M6 CLOSED;
- confirmar escopo G-B.2;
- localizar somente o target Guest Portal/Admin;
- executar a migração prevista pelo S9;
- preservar JWT authentication;
- usar RoleAssignment/MembershipRecord como autoridade;
- manter fail-closed;
- executar testes específicos;
- executar regression family;
- classificar qualquer falha;
- verificar blast radius;
- registrar evidência;
- parar.

Resultado permitido: **G-B.2 PASS / NEEDS_REWORK / BLOCKED**.

Nunca: `G-B.2 PASS → iniciar G-B.3 automaticamente`.

## 46. ESTADO FINAL DE GOVERNANÇA

O RSV360 encontra-se atualmente em uma arquitetura onde:

```
AUTENTICAÇÃO ≠ AUTORIZAÇÃO
```

e:

```
JWT
    ↓
identidade
```

enquanto:

```
enterprise_users
    ↓
MembershipRecord
    ↓
CanonicalRoleContext
    ↓
Role Guard
```

representa a autoridade enterprise.

A RoleAssignment Wave já estabeleceu a fundação persistida e o adapter canônico.

G-B já iniciou a substituição controlada dos consumidores.

O próximo passo não é uma nova arquitetura. O próximo passo é:

**MIGRAR CONSUMIDORES — UM POR VEZ — COM EVIDÊNCIA — COM PARADA OBRIGATÓRIA.**

## 47. REGRA SUPREMA DO MASTER PLAN

Nenhuma conveniência operacional pode ultrapassar a governança.

Em caso de conflito entre **velocidade** e **segurança + proveniência + isolamento + autoridade + governança**, o RSV360 escolhe **SEGURANÇA**.

E em caso de dúvida:

```
STOP → RECONCILE → DECIDE → AUTHORIZE → EXECUTE
```

---

*Fim do Master Plan Geral — estado de referência 05/10/2026.*

***Este é o plano mestre, não uma autorização de execução.** O ponto de parada permanece: G-B.1 PASS/CLOSED → G-B.2 aguardando GO.*

