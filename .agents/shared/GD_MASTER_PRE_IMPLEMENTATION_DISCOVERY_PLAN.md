# RSV360 — G-D Master Pre-Implementation Discovery / Reconciliation Plan

**Gate:** G-D — Propostas / Agentes  
**Natureza:** DISCOVERY / RECONCILIATION ONLY  
**Autorização:** OWNER — G-D DISCOVERY autorizado (2026-10-06)  
**Explicitamente NÃO autorizado:** CODE · IMPLEMENTATION · Migration · DB Apply · Seed · Staging · Production · Commit · Push  

| Campo | Valor |
|---|---|
| Branch | `feat/c36dd-refund-request-domain` |
| HEAD (discovery) | `4a4be7577a1ad94903b57adcadfa1b9f42491889` |
| Predecessor | G-C.9 = `VALIDATION_PASS_WITH_CONDITIONS` / CLOSED |
| G-D CODE | **NOT AUTHORIZED** |
| G-D IMPLEMENTATION | **NOT OPENED** |
| Artefato | este documento (plano + inventário) — sem alteração de produto |

Protocolo: `STOP → RECONCILE → DECIDE → AUTHORIZE → EXECUTE → VALIDATE → CLOSE`  
Estado deste passo: **RECONCILE** (em curso → plano pronto para Owner Decision).

---

## 1. Objetivo

Reconstruir, sem código, a superfície de autoridade de:

1. **Propostas** (`server/modules/propostas`)
2. **Agentes AI** (`server/modules/agentes`) — distinto do Partner role `agente`

e produzir:

- inventário de auth / binding / enterprise / econômico;
- relação com decisões já fechadas (PA-DEC, OD-9c, G-C);
- candidatos a subgates;
- decisões Owner obrigatórias antes de qualquer CODE;
- riscos e condições.

**Regra normativa (Master Plan §24):**  
`Request input ≠ authorization authority` · RANK local **não** vira contrato global sem decisão.

---

## 2. Glossário crítico (anti-colisão)

| Termo | Significado real no código | Escopo G-D? |
|---|---|---|
| Partner role `agente` | BROKER_ROLES = corretor/agente/promotor; carteira-scope (PA-DEC-003 APPROVED) | **Boundary** — confirma-se **fora** do módulo AI e **fora** do router propostas (zero uso) |
| `agentAuth` (propostas) | Alias local = `[authenticateJwt, requireRole('admin','manager','user')]` — **idêntico** a `staffAuth` | **SIM** — colisão semântica; não é Partner |
| Módulo `agentes` | Instrutor LLM / flags fail-closed | **SIM** |
| HITL “agente” | takeover/release sob `agentAuth` | **SIM** (propostas) |

---

## 3. Montagens

| Superfície | Mount | Registro |
|---|---|---|
| Propostas HTTP | `/api/v1/propostas` | `server/modules/propostas/index.ts` ← `server/app.ts` |
| Propostas WS | namespace `/propostas` | `proposta-chat.socket.ts` · boot `backend/server.js` |
| Agentes AI | `/api/v1/agentes` | `server/modules/agentes/index.ts` ← `server/app.ts` |
| Cotação pública (adjacente) | `/api/v1/cotacao-publica/.../proposta/:token` | **fora** do router propostas — contrato de boundary |

`parceiroAuth` / `masterAuth`: **ausentes** em propostas e agentes.

`staffAuth` canônico (`auth.middleware.ts`):  
`[authenticateJwt, requireRole('admin', 'manager', 'user')]`

---

## 4. Superfície PROPOSTAS — autoridade existente

### 4.1 Três cadeias coexistentes

| Cadeia | Definição | Uso |
|---|---|---|
| A. `staffAuth` | JWT + role ∈ {admin, manager, user} | CRUD, templates, aprovação solicitar, IA, status, etc. |
| B. `agentAuth` | **cópia bit-a-bit** de staffAuth (`routes/index.ts` ~L44) | DELETE `/:id`, HITL takeover/release |
| C. RANK local | `ROLE_RANK` + `hasMinRole` em `rbac.ts` | **somente** aprovar/negar **depois** de staffAuth |

**Achado crítico (aprovar/negar):**  
`hasMinRole(..., 'supervisor')` exige rank ≥ 3. Entre roles admitidos por `staffAuth`, só `admin` (rank 4) passa. `manager` (rank 2) falha; `supervisor` **não** está no allowlist do `staffAuth`. Efeito prático: aprovador efetivo ≈ **admin only**.

`requireRoleMin` em `rbac.ts`: **MORTO** (def sem callers) — documentado S9; não promover sem decisão.

### 4.2 Resource binding / access

| Mecanismo | Arquivo | Comportamento |
|---|---|---|
| Staff set access | `proposta-access.ts` | `STAFF_ROLES = {admin, manager}` — **mais estreito** que staffAuth (exclui `user`) |
| Owner | email `user` ≡ `clienteEmail` | full read / sensitive |
| Anônimo GET `:id` | `isPublica` → payload redacted | deny-by-default PII/token |
| Capability | token `rt-*` | sensitive ops; rotas públicas token |
| Enterprise | `query.enterprise_id` / `body.enterpriseId` | **carrier** — sem membership / sem `authorizedEnterpriseContext` |

**Membership / RoleAssignment / WS15 plug:** **zero** no módulo propostas.

### 4.3 Inventário HTTP (resumo)

| Classe | Paths (exemplos) | Auth |
|---|---|---|
| Público token | `/:token/og`, recotar, QR, validade, eventos | `publicLimiter` (± Turnstile / optionalJwt) |
| Público/híbrido `:id` | GET, chat, hitl request, visualizacao, responder, indicacao | `optionalJwt` + `proposta-access` |
| Staff | list, templates CRUD, from-orcamento, create/update/status, aprovação solicitar, IA, comparativo | `staffAuth` |
| Staff + RANK | `aprovacao/aprovar`, `aprovacao/negar` | `staffAuth` + `hasMinRole(supervisor)` |
| “Agent” alias | DELETE, hitl takeover/release | `agentAuth` (= staffAuth) |

### 4.4 WebSocket

- JWT em joins sensíveis; **`join:parceiro`**: `parceiroId` do **payload** sem binding a carteira/enterprise (risco body-as-authority).
- Parity HTTP `authorizePropostaIdSensitive` **não** garantida no WS.

### 4.5 Econômico / financeiro (adjacência)

| Touchpoint | Risco |
|---|---|
| `valorTotal` create/update | escrita econômica por staff sem Economic Authority composition |
| from-orcamento / ancoragem / recotação | pricing-adjacente |
| voucher definitivo via aprovação | efeito econômico/operacional |
| Payments / PIX / refund / payout | **não** montados neste router — permanecem fora |
| MGM `indicadorId` no body | binding fraco |

PA-DEC-006 (composição econômica) **não** foi aplicado a propostas — decisão Owner necessária se G-D deve compor ou DEFER.

---

## 5. Superfície AGENTES AI

| Path | Auth | Notas |
|---|---|---|
| `GET /health` | `requireAgentesAtivo` (router.use) | flag módulo |
| `GET /config` | **sem JWT** | só flag fail-closed 404 se OFF |
| `POST /instrutor/perguntar` | `authenticateJwt` + rate limit + `requireInstrutorAtivo` | sem `staffAuth` / sem membership |

Flags (`agentes_modulo_ativo`, `agente_instrutor_ativo`): default OFF, fail-closed.

### 5.1 Body-as-authority (ALTO)

`instrutor/papel.ts` — `resolvePapel(role, bodyPapel)`:  
se body ∈ {`staff`,`anfitriao`}, **body prevalece** sobre claim.  
Teste atual documenta o comportamento (`agentes-instrutor-triagem`).  
Alvo normativo Master Plan / S9: body **nunca** prevalece sem validação — **OWNER DECISION** obrigatória.

---

## 6. Dependências com decisões já fechadas

| Decisão / Gate | Relação com G-D | Reinterpretação? |
|---|---|---|
| PA-DEC-001…004 (Partner roles) | Partner `agente` = corretor model; **não** mapear para Enterprise Role | **NÃO** — G-D AI ≠ Partner `agente` |
| PA-DEC-005 / 008 (Modelo D / proibir requireEnterpriseRole isolado em partner-aware) | Propostas hoje são staff/public — se Partner entrar, composição D | Sem Partner surface hoje |
| PA-DEC-006 (Economic composition) | Pode aplicar a `valorTotal`/aprovação/voucher se Owner decidir | Pendente OD-G-D |
| PA-DEC-007 (RoleAssignment staff-only) | Consistente com propostas staff; Partner fora | Preservar |
| OD-9c-A/B | Anfitrião — boundary; não endurecer Partner via G-D | Preservar |
| G-C.9 CLOSED | Acomodações fechadas; propostas **excluídas** de G-C (`G-C_STAFFAUTH_DISCOVERY_PLAN` L14/L43) | Preservar exclusão |
| G-E / E-13 | `enterpriseId` carrier → candidato a DEFER | Não absorver silenciosamente |
| S10 | Depende de G-D maduro | Não iniciar |

---

## 7. Testes e baseline (inventário)

| Família | Evidência aproximada |
|---|---|
| Test files `*proposta*` sob `backend/src/__tests__` | ~19 arquivos |
| Test files `*agente*` | ~14 arquivos |
| Autoridade / IDOR | `proposta-pr03b-idor`, `rbac-aprovacao`, rotas eventos/validade/recotação |
| Agentes | `agentes-routes`, `agentes-instrutor-*`, `agentes-config-fail-safe`, triagem (body papel) |
| Membership plug em propostas/agentes | **ausente** |

Baseline G-D CODE (quando autorizado):  
dedicated + family + global; classificar NEW vs PRE-EXISTING; **não** fabricar PASS corrigindo falhas fora de escopo.

Typecheck: erros pre-existing (ex. 24 fora de G-C.9) **não** são dívida de G-D até paths G-D introduzirem novos.

---

## 8. Subgates candidatos (NÃO abertos / NÃO autorizados)

Proposta de decomposição para Owner (ordem sugerida, não executável sem GO por fatia):

| ID | Escopo | Classe |
|---|---|---|
| **G-D.0** | Glossário + boundary Partner `agente` vs AI vs `agentAuth` | RECONCILE / DECIDE |
| **G-D.1** | Matriz HTTP propostas: unificar/documentar `staffAuth` vs `agentAuth`; roles reais | Modelo A staff |
| **G-D.2** | Destino RANK (`hasMinRole` / `ROLE_RANK` / `requireRoleMin` morto) | DECIDE → adapter ou aposentar |
| **G-D.3** | Alinhar `proposta-access` STAFF_ROLES vs allowlist staffAuth (`user`) | Access / IDOR |
| **G-D.4** | Enterprise carrier → ECtx **ou** DEFER G-E/E-13 | CLASS-B adjacency |
| **G-D.5** | WS `/propostas` parity + `join:parceiro` binding | Authz parity |
| **G-D.6** | Superfície econômica propostas (valorTotal / voucher / aprovação) | Economic composition |
| **G-D.7** | Agentes AI: JWT em `/config` + flags | Hardening mínimo |
| **G-D.8** | `resolvePapel`: body hint validado vs removido; deny se diverge | Body ≠ authority |
| **G-D.9** | Boundary cotacao-publica × propostas (contrato only) | Boundary |

Nenhum subgate acima está OPEN. **G-D.0** é pré-código lógico.

---

## 9. Riscos e condições

| ID | Risco | Severidade |
|---|---|---|
| R1 | Três autoridades coexistentes (staffAuth / agentAuth / RANK) sem matriz canônica | ALTA |
| R2 | RANK local pode ser promovido indevidamente a contrato global | ALTA (norma: proibido sem OD) |
| R3 | `resolvePapel` body-prevalence | ALTA |
| R4 | WS / MGM body IDs sem binding | ALTA |
| R5 | `enterpriseId` query/body sem ECtx (CLASS-B) | MÉDIA — possível DEFER |
| R6 | Escrita `valorTotal` / voucher sem Economic Authority | MÉDIA–ALTA |
| R7 | Colisão semântica Partner `agente` × `agentAuth` × módulo AI | MÉDIA (governança) |
| R8 | Working tree dirty (G-C.9 + OUT-OF-SCOPE) — risco de commit misturado | MÉDIA (processo) |
| R9 | Alterar `staffAuth` global = blast radius multi-módulo | ALTA — **proibido**; guards locais por fatia |

Condições de discovery:

```text
CONDITION-GD-WT   = working tree dirty herdado (não atribuível a este plano)
CONDITION-GD-RANK = RANK vivo só em aprovar/negar; destino indefinido
CONDITION-GD-BODY = resolvePapel + WS/MGM body-as-authority documentados
CONDITION-GD-EID  = enterprise carrier sem membership (DEFER candidato)
```

---

## 10. Owner Decisions necessárias (OPEN)

Nenhuma inferida. Cada item exige decisão explícita antes de CODE:

| ID | Pergunta | Opções (esqueleto) |
|---|---|---|
| **OD-GD-01** | Destino do RANK local | (a) adapter documentado local (b) aposentar após matriz canônica (c) outro — **nunca** promover a contrato global sem registro |
| **OD-GD-02** | Matriz canônica de roles em propostas | Quem cria/edita/aprova/nega/HITL/DELETE; papel de `user` e `supervisor` |
| **OD-GD-03** | Semântica de `agentAuth` | (a) alias documentado = staffAuth (b) renomear (c) set distinto |
| **OD-GD-04** | Aprovadores reais | Só admin (estado de fato) vs incluir supervisor no allowlist |
| **OD-GD-05** | `enterpriseId` em propostas | Tratar em G-D vs **DEFER G-E/E-13** |
| **OD-GD-06** | Partner role `agente` | Confirmar **fora** de G-D AI/propostas staff (evidência atual: zero uso) |
| **OD-GD-07** | `resolvePapel` body | Hint validado pelo claim vs remoção; divergência = DENY |
| **OD-GD-08** | `GET /agentes/config` sem JWT | Aceitar (flag OFF fail-closed) vs exigir JWT |
| **OD-GD-09** | WS body authority | Incluir em G-D.5 vs gate separado |
| **OD-GD-10** | MGM `indicadorId` body | Binding ao authenticated user vs defer |
| **OD-GD-11** | `valorTotal` / voucher / aprovação | Aplicar PA-DEC-006 composition vs staff-only documentado |
| **OD-GD-12** | Ordem de CODE | Qual primeiro subgate após ODs (sugestão: D.0→D.1→D.8) |

---

## 11. O que este discovery NÃO faz

```text
CODE / IMPLEMENTATION     = NOT OPENED
Migration / Schema Apply  = NOT EXECUTED
DB / Seed                 = NOT EXECUTED
Staging / Production      = NOT EXECUTED
Commit / Push             = NOT EXECUTED
Refund / Payout / Gateway = NOT EXECUTED
Reabrir PA-DEC / OD-9c    = PROIBIDO
Abrir S10 / G-E           = NÃO
```

Alterações de produto (server/backend apps): **nenhuma** neste passo.  
Único artefato escrito: este plano em `.agents/shared/`.

---

## 12. Veredito de discovery

```text
G-D DISCOVERY / RECONCILIATION = COMPLETE (PLAN READY)

G-D CODE           = NOT AUTHORIZED
G-D IMPLEMENTATION = NOT OPENED

NEXT CORRECT STEP  = OWNER REVIEW → Owner Decisions (OD-GD-01…12)
                     → só então AUTHORIZE subgate específico (ex. G-D.0 / G-D.1)

NO CODE WITHOUT EXPLICIT SUBGATE GO
```

---

## 13. STOP

Após este plano:

```text
NO FURTHER IMPLEMENTATION AUTHORIZED
NO AUTOMATIC SUBGATE OPEN
AWAITING OWNER DECISIONS
STOP
```

*Fim — G-D Master Pre-Implementation Discovery / Reconciliation Plan.*
