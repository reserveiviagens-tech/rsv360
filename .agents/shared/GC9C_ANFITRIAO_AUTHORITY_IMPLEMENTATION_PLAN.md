# G-C.9c — Anfitrião Authority Boundary — Implementation Plan

**Status:** `PLAN_PASS`  
**CODE:** `NOT AUTHORIZED`  
**Migration / DB / Staging / Prod / Commit / Push:** `NONE`  
**G-C.9b:** `COMPLETE` (9b.1–9b.5 CLOSED; 9b.2 N-A) — **não reabrir**  
**Discovery phase:** `CLOSED` · **Implementation:** `NOT OPENED`  
**OD-9c-A / OD-9c-B:** `APPROVED` (registradas em PA-W5)

**Autoridade de decisão:** PA-W0…W6 · PA-DEC-001…011 APPROVED · OD-9c-A/B APPROVED · Master Re-Entry · estado real do working tree  

**Baseline observada (discovery):**

| Item | Valor |
|------|-------|
| Branch | `feat/c36dd-refund-request-domain` |
| HEAD | `4a4be757` |
| Working tree | **dirty** (inclui `anfitriao.routes.ts`, `anfitriao.service.ts`, membership 9b.*, etc.) |
| Alterações feitas por esta discovery | **nenhuma** (exceto este artefato) |

---

## 1. Objective

Reconciliar a superfície real de **Anfitrião Authority Boundary** e definir o plano operacional dos três sub-gates (PA-DEC-011 / PA-W6):

| Sub-gate | Alvo |
|----------|------|
| **G-C.9c.1** | Index — públicas + admin tipologias/addons |
| **G-C.9c.2** | Anfitrião Read |
| **G-C.9c.3** | Anfitrião Write |

Modelo obrigatório em superfícies partner-aware (PA-DEC-005/008):

```text
Enterprise Context
  + Partner Authority (owner-scope / carteira / cohost papéis)
  + Resource Binding
  + Economic Authority (quando a rota for economic-write/read)
```

**Proibido:** `requireEnterpriseRole()` isolado em partner-aware; mapear `anfitriao` → viewer/manager/admin; duplicar guards de G-C.9b (`tarifas-politica-*`, `tarifas-simular`, `tarifas-staff`).

---

## 2. Provenance (não reabrir)

| DEC | Status | Relevância 9c |
|-----|--------|---------------|
| PA-DEC-001 | APPROVED | `anfitriao` = owner-scope Partner Authority |
| PA-DEC-002..004 | APPROVED | corretor/agente/promotor = carteira-scope |
| PA-DEC-005 | APPROVED | Modelo D em partner-aware |
| PA-DEC-006 | APPROVED | composição econômica obrigatória onde houver pricing |
| PA-DEC-008 | APPROVED | proíbe `requireEnterpriseRole` isolado em partner-aware |
| PA-DEC-009 | APPROVED / RESOLVED | tarifas provenance — não bloqueia 9c |
| PA-DEC-011 | APPROVED | SPLIT 9c.1 / 9c.2 / 9c.3 |

**Nenhuma evidência contraditória nova** contra PA-DEC-001…011 foi encontrada nesta discovery.  
Assimetrias de helper Partner (ver §6) são **dívida legada comprovada**, não contradição de DEC.

---

## 3. Module mount reality (PROVEN)

`registerAcomodacoesModule` (`server/modules/acomodacoes/index.ts`):

| Mount | Router file |
|-------|-------------|
| `/api/v1/acomodacoes` | `routes/index.ts` |
| `/api/v1/acomodacoes/import` | `import.routes.ts` — **G-C.9a** (fora 9c) |
| `/api/v1/acomodacoes/sync` | `sync.routes.ts` — **G-C.9a** (fora 9c) |
| `/api/v1/acomodacoes/anfitriao` | `anfitriao.routes.ts` — **G-C.9c.2 / 9c.3** (+ staff slice TBD) |
| `/api/v1/tarifas` | `tarifas.routes.ts` — **G-C.9b COMPLETE** (fora 9c) |

`routes/index.ts` **não** monta sub-routers.

**Membership guards existentes relevantes:** sync/import/tarifas* — **nenhum** guard canônico anfitrião/index ainda.

---

## 4. G-C.9c.1 — Index

**Arquivo:** `server/modules/acomodacoes/routes/index.ts`  
**Prefix:** `/api/v1/acomodacoes`

### Auth arrays (PROVEN)

| Nome | Composição | Uso |
|------|------------|-----|
| `staffAuth` | JWT + `admin\|manager\|user` | **Dead code** — zero rotas |
| `adminAuth` | JWT + `admin` | rotas `/admin/*` |
| (público) | `publicLimiter` | tipologias públicas / wizard |

### Inventário

| Método + path | Auth | Partner? | Econômico? | Pertence a 9c.1? | Autoridade alvo |
|---------------|------|----------|------------|------------------|-----------------|
| `GET /health` | none | Não | Não | Sim (ops) | N/A |
| `GET /publico/preview/:token` | publicLimiter | Não | listing público | Sim | **N/A** (público) |
| `GET /publico/by-slug/:slug` | publicLimiter | Não | listing público | Sim | **N/A** |
| `GET /disponiveis` | publicLimiter | Não | cards/preço wizard | Sim | **N/A** |
| `GET /addons` | publicLimiter | Não | preços addon | Sim | **N/A** |
| `GET/POST/PATCH /admin/tipos*` | adminAuth | Não | Não | Sim | **Modelo A** (Enterprise complementar; min role espelhar `admin`) |
| `GET/POST/PATCH/DELETE /admin/addons*` | adminAuth | Não | pricing addon | Sim | **Modelo A** + economic-aware tests (staff) |

**Fora de 9c.1:** import/sync/tarifas/anfitriao mounts.

**Não introduzir novas rotas.**

### Flag contract (9c.1)

| Flag | Comportamento |
|------|----------------|
| OFF | legado bit-a-bit (público + adminAuth JWT) |
| ON | públicas inalteradas (N/A membership); `/admin/*` exigem Enterprise Context fail-closed (padrão G-C.9a / staff) |

---

## 5. Partner helpers (shared foundation — PROVEN)

`anfitriao.service.ts` (não inventar equivalentes Enterprise):

| Helper | Regra |
|--------|-------|
| `podeGerenciarUnidade` | staff bypass; anfitrião `proprietarioId===userId`; broker carteira |
| `podeVerUnidade` | gerenciar **ou** cohost ativo por e-mail |
| `podeEditarCalendarioUnidade` | gerenciar **ou** cohost com papel calendário |
| `podeEditarMensagensUnidade` | gerenciar **ou** cohost com papel mensagens |
| `obterUnidade` | load + `podeVerUnidade` |
| `podeAcessarEmpreendimento` | **9b.4** — não reutilizar como autoridade WRITE 9c sem necessidade |

**Identidade:** `authFromReq` → `{ userId, role, email }` do JWT. Query/body/header **nunca** autoridade para `userId`/`enterpriseId`.

---

## 6. G-C.9c.2 — Anfitrião Read

**Arquivo:** `server/modules/acomodacoes/routes/anfitriao.routes.ts`  
**Prefix:** `/api/v1/acomodacoes/anfitriao`  
**Auth dominante:** `parceiroAuth` = JWT + `anfitriao|corretor|agente|promotor|admin|manager`

### Superfícies READ (parceiroAuth / masterAuth GET)

| Grupo | Exemplos | Binding atual | Decision |
|-------|----------|---------------|----------|
| Dashboard / desempenho / CSV | `GET /dashboard`, `/desempenho`, exports | escopo listar / KPIs | 9c.2 |
| Impostos READ | `GET /impostos/*.csv` | filtra cohost | 9c.2 (fiscal READ) |
| Unidade | `GET /minhas`, `/unidades/:id` | `listarMinhas` / `obterUnidade` | 9c.2 |
| Calendário / reservas / msgs | `GET /calendario`, `/reservas`, `/mensagens*`, `/hoje` | escopo Partner | 9c.2 |
| Disponibilidade / rate-calendar READ | `GET .../disponibilidade`, `.../rate-calendar` | `obterUnidade` | 9c.2 (economic READ) |
| NFSe rascunhos | `GET .../nfse/rascunhos` | masterAuth + gerenciar | 9c.2 |
| SMS status | `GET /comunicacao/sms-status` | JWT only (sem unit) | 9c.2 (ops) |
| Admin verificações list | `GET /admin/verificacoes-local` | staffAprovacao | **9c.3 staff / Modelo A** (OD-9c-A APPROVED) |
| iCal feed | `GET .../ical.ics?token=` | **público por token** (≥16) | 9c.2 especial — **N/A membership**; token é autoridade do recurso |

### Autoridade alvo (9c.2)

```text
Flag ON:
  Enterprise Context (fail-closed)
  + Partner JWT (parceiroAuth / masterAuth conforme rota)
  + Resource binding existente (obterUnidade / listar escopo / token iCal)
  + NÃO mapear anfitriao → Enterprise Role
```

**Não alterar** helpers Partner (OD-9c-B APPROVED — PRESERVE). HARDEN exige gate próprio futuro.

---

## 7. G-C.9c.3 — Anfitrião Write

### Auth arrays

| Nome | Roles | Uso |
|------|-------|-----|
| `parceiroAuth` | anfitriao+brokers+staff | maioria mutações operacionais |
| `masterAuth` | anfitriao+admin+manager | NFSe prep, iCal write, pricing day/defaults, preco bulk |
| `staffAprovacao` | admin+manager | aprovar/rejeitar, verificação local, carteira |

### Superfícies WRITE (amostra crítica)

| Grupo | Exemplos | Binding atual | Econômico? |
|-------|----------|---------------|------------|
| Listing / mídia | PATCH unidade, galeria, trilho, arquivar, preview-link | majoritariamente `obterUnidade` (`podeVer`) | PATCH pode tocar `precoDiaria` |
| Calendário ops | PUT disponibilidade; POST bloquear/desbloquear | assimétrico: PUT só `podeVer`; bulk usa `podeEditarCalendario` | precoOverride possível |
| Pricing MASTER | POST .../preco; PUT rate-calendar/day; pricing-defaults; conjuntos-regras | `obterUnidade` + MASTER_ROLES no service | **ECONOMIC WRITE** |
| Desconto | POST aplicar/validar-desconto | broker+staff no service; teto política | **ECONOMIC** (não é PUT politica 9b.5) |
| Cohost | convidar/revogar/aceitar/remover | `podeGerenciar` ou e-mail | Não |
| NFSe | POST preparar | `podeGerenciar` | fiscal draft |
| iCal write | token/import/sync | masterAuth + obterUnidade | inventário |
| Reservas | aprovar/rejeitar; POST msgs | obterUnidade / podeEditarMensagens | hold/inventário |
| Staff ops | aprovar/rejeitar unidade; verificação; carteira | staffAprovacao | publicação / escopo broker |

### Achado de assimetria (PROVEN — não “corrigir” no plan sem OD)

Algumas mutações aceitam ator com **só** `podeVerUnidade` (incl. cohost), enquanto outras exigem `podeGerenciar` / `podeEditarCalendario`.  
**Flag OFF:** preservar bit-a-bit.  
**Flag ON (OD-9c-B APPROVED — PRESERVE):** complementar Enterprise Context **sem** endurecer Partner rules (`podeVer`/cohost intactos).

### Fronteira com G-C.9b (COMPLETE)

| Superfície | Gate |
|------------|------|
| `PUT/GET /api/v1/tarifas/politica-desconto` | **9b.4 / 9b.5** — proibido tocar |
| `GET /api/v1/tarifas/simular` | **9b.3** |
| Staff tarifas config/categorias/… | **9b.1** |
| `aplicar-desconto` / rate-calendar **em anfitriao.routes** | **9c.3** — Model D; **não** reusar `tarifas-politica-write.*` |

### Autoridade alvo (9c.3)

```text
Flag ON:
  Enterprise Context (fail-closed)
  + Partner/Master/Staff JWT conforme array da rota
  + Resource binding (helpers existentes; PRESERVE — OD-9c-B)
  + Economic composition onde pricing/desconto (PA-DEC-006)
  + Sem migration; audit/tx só se já existir ou OD/CODE GO exigir (não inventar)
```

---

## 8. Authority matrix (resumo)

| Sub-gate | Superfície | Autoridade atual | Autoridade alvo | Flag OFF | Flag ON | Testes |
|----------|------------|------------------|-----------------|----------|---------|--------|
| **9c.1** | Index públicas | publicLimiter | N/A | legado | legado | públicos 200/404; sem JWT |
| **9c.1** | Index `/admin/*` | adminAuth JWT | Modelo A + Enterprise | legado | fail-closed membership | missing context; non-admin; spoof |
| **9c.2** | Anfitrião READ partner | parceiroAuth + service scope | Modelo D | legado | EC + Partner binding | owner allow; third-party deny; cohost visibility; spoof |
| **9c.2** | iCal `.ics` | token query | token N/A membership | legado | legado token | token curto 401; token ok |
| **9c.3** | Anfitrião WRITE partner/master | arrays + helpers | Modelo D (+ economic) | legado | EC + binding; economic paths | owner/cohost rules; third-party deny; pricing paths; OFF preserve |
| **9c.3 staff** | staffAprovacao (6 rotas) | staff JWT | Modelo A (OD-9c-A) | legado | EC fail-closed | staff allow/deny; sem Partner composition |

---

## 9. Recommended composition (futuro CODE — não autorizado)

Espelhar padrão 9b: **arrays dedicados**, não contaminar `parceiroAuth` compartilhado se houver usos mistos no mesmo arquivo (hoje o arquivo é só anfitrião — ainda assim preferir arrays nomeados por fatia).

```text
# 9c.1
acomodacoesAdminAuth = [...adminAuth, requireAcomodacoesIndexAdmin]  // nome TBD

# 9c.2
anfitriaoReadAuth = [...parceiroAuth, requireAnfitriaoReadPartner]

# 9c.3
anfitriaoWriteAuth / anfitriaoMasterWriteAuth = [...parceiroAuth|masterAuth, requireAnfitriaoWritePartner]
staffAprovacaoAuth = [...staffAprovacao, requireAnfitriaoStaff…]  // OD-9c-A: Modelo A / Staff Authority
```

Guards novos: **somente** Enterprise Context complementar (como `tarifas-simular.guard` / politica-read), **sem** `requireEnterpriseRole` isolado em partner-aware.  
Partner binding permanece nos services/helpers (OD-9c-B PRESERVE).  
`staffAprovacao`: Modelo A — **sem** composição Partner × Enterprise.

---

## 10. File boundaries (futuro CODE GO por sub-gate)

### Propostos (ajustar no GO específico)

**9c.1**

- `server/modules/membership/acomodacoes-index.guard.ts` (CRIAR)
- `server/modules/membership/index.ts` (export)
- `server/modules/acomodacoes/routes/index.ts` (wiring admin only)
- `backend/src/__tests__/unit/acomodacoes-index-guard.test.ts` (CRIAR)

**9c.2**

- `server/modules/membership/anfitriao-read.guard.ts` (CRIAR)
- `server/modules/membership/index.ts`
- `server/modules/acomodacoes/routes/anfitriao.routes.ts` (somente GET partner/master + static isolation)
- `backend/src/__tests__/unit/anfitriao-read-guard.test.ts` (CRIAR)

**9c.3**

- `server/modules/membership/anfitriao-write.guard.ts` (CRIAR)
- `server/modules/membership/index.ts`
- `server/modules/acomodacoes/routes/anfitriao.routes.ts` (MUTATIONS partner/master + `staffAprovacao` Modelo A)
- `server/modules/membership/anfitriao-staff.guard.ts` (CRIAR — Modelo A para staffAprovacao; OD-9c-A)
- `backend/src/__tests__/unit/anfitriao-write-guard.test.ts` (CRIAR)
- `backend/src/__tests__/unit/anfitriao-staff-guard.test.ts` (CRIAR — opcional/junto 9c.3)
- `anfitriao.service.ts` — **NÃO tocar** (OD-9c-B PRESERVE; HARDEN fora deste gate)

### Proibidos (todos os sub-gates)

```text
tarifas.routes.ts / tarifas-*-guard/scope (G-C.9b)
import.routes.ts / sync.routes.ts (G-C.9a) salvo menção estática
payments / refund / ledger / earnings / payout / gateway
migrations / schema
apps/** UI (fora deste gate de autoridade API)
```

---

## 11. Execution order (após CODE GOs futuros)

```text
1) G-C.9c.1 Index          — menor blast radius; Modelo A + públicas N/A
2) G-C.9c.2 Anfitrião Read — Modelo D; valida EC + binding READ
3) G-C.9c.3 Anfitrião Write— Modelo D + economic paths; depende de 9c.2 patterns
```

**Não** abrir 9c.1 automaticamente após este plan. Cada sub-gate exige **OWNER GO** próprio.

Dependência: `WS15_MEMBERSHIP_AUTHORITY` plug existente; cadeia WS-04 `authorizedEnterpriseContext` (como 9b).

---

## 12. Test plan (mínimo por sub-gate)

### Comum

- Flag OFF → next()/legado  
- Flag ON + missing Enterprise Context → 403  
- `membershipVerified !== true` → 403  
- spoof `userId` / `enterpriseId` query/body/header → não autoriza  
- role inadequado → 403  
- isolamento estático entre sub-gates / 9b / 9a  

### 9c.2 Read

- owner allow / third-party deny  
- cohost visibility onde `podeVer` aplica  
- cross-enterprise deny (via EC)  
- invalid resource 404  
- iCal token curto vs válido  

### 9c.3 Write

- owner allow / third-party deny  
- cohost: respeitar regra **atual** (OD-9c-B PRESERVE)  
- economic paths: aplicar-desconto / pricing-defaults / rate-calendar day (sem tocar 9b politica)  
- staffAprovacao: Modelo A isolado (OD-9c-A); sem Partner composition  
- READ sucesso ≠ WRITE  

**Não** exigir Postgres integration só para provar EC (padrão 9b unitário + estático).

---

## 13. PASS / STOP criteria

### PASS (por sub-gate, futuro)

- Alvo único fechado na fronteira  
- Flag OFF legado; Flag ON fail-closed  
- Modelo D respeitado; sem mapear Partner → Enterprise Role  
- 9b/9a intocados  
- Testes dedicados + regressão família anfitrião  
- 0 erros typecheck **novos** no escopo  
- Sem migration/DB/staging/prod/commit/push  

### STOP imediato

- necessidade de migration/schema  
- contradizer PA-DEC  
- recurso sem binding determinístico e sem OD  
- alterar G-C.9b fechado / payments/refunds/ledger/payouts  
- ampliar MASTER_ROLES globalmente  
- transformar anfitriao em Enterprise Role  
- sair da fronteira de arquivos do GO  

---

## 14. Risks

| Risco | Mitigação |
|-------|-----------|
| Working tree dirty (anfitriao.* já modificado) | CODE GO deve declarar baseline de arquivos; não misturar com 9c sem inventory |
| Assimetria cohost WRITE | OD-9c-B PRESERVE — dívida legada; HARDEN = gate futuro |
| Contaminação de `parceiroAuth` | Arrays dedicados por fatia |
| Duplicar 9b | Fronteira explícita; testes estáticos de isolamento |
| Blast radius ~60 rotas anfitrião | Sub-gates 9c.2 → 9c.3; 9c.1 primeiro |
| Economic WRITE em anfitrião | Model D + testes; sem reabrir politica 9b |

---

## 15. Owner Decisions (FECHADAS)

| ID | Decisão Oficial do Owner | Status |
|----|--------------------------|--------|
| **OD-9c-A** | `staffAprovacao` → **Staff Authority / Modelo A** (Enterprise Context complementar). Não pertence ao Partner Authority do anfitrião. Sem mapear anfitriao → Enterprise Role. Wiring na **onda Write/staff** do mount `anfitriao` — **não** misturar com públicas do Index (9c.1). | **APPROVED** |
| **OD-9c-B** | Flag ON → **Enterprise Context complementar** + **preservação integral** das regras Partner existentes (`podeVer` / cohost / `podeGerenciar` / `podeEditarCalendario` intactos). **HARDEN** `podeVer`→`podeGerenciar` (ou equivalente) **NÃO autorizado** neste gate; exige gate/decisão própria por endpoint. | **APPROVED** |

Registro canônico também em `PA-W5-ARCHITECTURAL-DECISION-REGISTER.md`.

Nenhuma OD residual bloqueia o fechamento do plano.  
**9c.1 / 9c.2 / 9c.3 CODE** permanecem **NOT OPENED** até OWNER GO específico por sub-gate.

---

## 16. Final Verdict

```text
PLAN STATUS:  PLAN_PASS
OD-9c-A:      APPROVED — Modelo A / Staff Authority (onda Write/staff)
OD-9c-B:      APPROVED — PRESERVE Partner rules + EC complementar
CODE:         NOT AUTHORIZED
MIGRATION:    NOT AUTHORIZED
9c.1:         NOT OPENED
9c.2:         NOT OPENED
9c.3:         NOT OPENED
ARTIFACT:     .agents/shared/GC9C_ANFITRIAO_AUTHORITY_IMPLEMENTATION_PLAN.md
```

**Próximo passo operacional:** aguardar `OWNER GO — G-C.9c.1` (Index) **separado**. Não abrir 9c.2/9c.3 junto com 9c.1.

**STOP.** Sem implementação. Sem abertura automática de G-C.9c.1.
