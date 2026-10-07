# RSV360 — G-D — OWNER DECISION REGISTER

**Base:** `GD_MASTER_PRE_IMPLEMENTATION_DISCOVERY_PLAN.md` §10  
**Estado Discovery:** ACCEPTED  
**Status do register:** **CLOSED / OWNER APPROVED**  
**Owner:** RSV360 Owner (decisão formal inequívoca)  
**Data de fechamento:** 2026-10-06  

> CODE = NOT AUTHORIZED · PLAN_PASS depende do Master Implementation Plan ·  
> G-D.0…D.9 = NOT OPENED até `CODE GO — G-D.X` explícito.

---

## Sign-off fechado

| ID | Decision | Status | Owner | Rationale (resumo) | Evidence | Impact |
|---|---|---|---|---|---|---|
| **OD-GD-01** | **A** — adapter local documentado | **APPROVED** | Owner | RANK não vira contrato global | Discovery §4.1 / rbac.ts | Adapter em plano; sem promoção |
| **OD-GD-02** | Esqueleto matriz canônica; detalhe no Master Plan | **APPROVED** | Owner | Obrigação de matriz antes do CODE; detalhe operacional no MIP | Discovery §4; ballot Owner | Matriz no MIP; CODE bloqueado sem ela |
| **OD-GD-03** | **A** — `agentAuth` = alias documentado de `staffAuth` | **APPROVED** | Owner | Equivalência funcional comprovada | routes/index.ts ~L44 | Sem novo contrato; ≠ Partner |
| **OD-GD-04** | **A** — somente **admin** como aprovador | **APPROVED** | Owner | Estado de fato; não promover supervisor | hasMinRole+staffAuth | Allowlist approve/deny = admin |
| **OD-GD-05** | **DEFER → G-E / E-13** | **DEFERRED** | Owner | Carrier ≠ autoridade | enterprise_id query/body | Fora do CODE G-D |
| **OD-GD-06** | Partner `agente` **FORA** de AI / propostas staff / agentAuth | **APPROVED** | Owner | Zero uso; sem equivalência por nome | PA-DEC-003; Discovery §2 | Boundary obrigatório |
| **OD-GD-07** | **A** — body hint validado; divergência = DENY | **APPROVED** | Owner | body ≠ authority | resolvePapel | Endurecimento AI instrutor |
| **OD-GD-08** | **B** — JWT **obrigatório** em `GET /agentes/config` | **APPROVED** | Owner | Config não é superfície pública | agentes/routes | Hardening config |
| **OD-GD-09** | **B** — WS body authority = **gate separado** | **APPROVED** | Owner | Blast radius / superfície distinta | WS join:parceiro | Fora da sequência G-D principal |
| **OD-GD-10** | **A** — binding server-side ao authenticated user | **APPROVED** | Owner | indicadorId body ≠ autoridade | MGM routes | Em fatia G-D autorizada depois |
| **OD-GD-11** | **A** — PA-DEC-006 Economic Composition | **APPROVED** | Owner | PA-DEC-006 prevalece | Discovery §4.5 | valorTotal/voucher/aprovação |
| **OD-GD-12** | **A** — D.0 → D.1 → D.8 → demais por dependência | **APPROVED** | Owner | Ordem ≠ CODE GO | Ballot Owner | Sequência no MIP |

```text
OWNER DECISIONS = CLOSED
REGISTER STATUS = CLOSED / OWNER APPROVED
CODE = NOT AUTHORIZED
NO SUBGATE WITHOUT EXPLICIT CODE GO — G-D.X
```
