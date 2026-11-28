# Continuar daqui — CRM Deals / Smoke / Lintel (13 nov 2026)

> Checkpoint da sessão **13/11/2026 (noite)**. Retomar a partir deste ficheiro + `SMOKE-CRM-DEALS-2026-11-13.md` + `HANDOFF-CRM-DEALS-2026-11-25.md`.

### Atualização 26/11/2026 (pós #600–#602 — E2E overview, nodemailer, Next)

| Item | Estado |
|------|--------|
| `develop` | **`e057f790`** |
| Overview | Rentals/Sales API + E2E H8/H9 ✅ |
| **Próximo** | **`PLANO-EXECUCAO-RESTANTE-2026-11-26.md`** — Fatia B Kanban E2E, Docker rebuild |
| CRM deals | 2.3.3 / K3–K4 UI persistência — Fatia B em aberto |

### Atualização 25/11/2026 (pós #588–#590 — proxy, 3c, Overview P4)

| Item | Estado |
|------|--------|
| `develop` | `8b49de24` |
| **#588** | Proxy dev turismo `/api/v1` |
| **#589** | Lintel 3c residual rentals modal |
| **#590** | Overview **P4** — Rentals tab API anfitrião (smoke **H8**) |
| **Próximo** | Smoke H8 manual · Fatia B só com repro · NPM audit brief (chore) |

### Atualização 23/11/2026 (pós hub + K3–K4 + H7b)

| Item | Estado |
|------|--------|
| `develop` | `783b463c` |
| **Overview hub** | #563–#572 — leads API, contacts, convert deal |
| **#576–#579** | Drizzle journal · smoke K3a/K4 · H7b Kanban |
| Smoke | H1–**H7b** (`SMOKE-CRM-ROUTES-*`) · K1–**K4b** (`SMOKE-CRM-ESIGN-KANBAN-*`) |
| **Próximo** | `BRIEF-NPM-AUDIT-LOCKFILE-2026-11-13.md` · Anfitrião P2 (`BRIEF-OVERVIEW-ANFITRIAO`) |

### Atualização 21/11/2026 (pós #561 — e-sign C export admin)

| Item | Estado |
|------|--------|
| `develop` | `0a4d2b95` |
| **#561** | Export auditoria admin CSV/JSON + UI Histórico |
| Testes | `rental-sign` **19/19** |
| Smoke | E8 em `SMOKE-CRM-ESIGN-KANBAN-2026-11-17.md` |
| **Próximo** | Overview hub · ver PAUSA |

### Atualização 21/11/2026 (pós #559 — e-sign B webhook)

| Item | Estado |
|------|--------|
| `develop` | `19ed64e0` |
| **#559** | Webhook pós-assinatura HMAC + retry + replay |
| Testes | `rental-sign` **14/14** |
| Smoke | E7 em `SMOKE-CRM-ESIGN-KANBAN-2026-11-17.md` |
| **Próximo** | **C** export auditoria admin · ver PAUSA |

### Atualização 21/11/2026 (pós #557 — Leads A2 bulk)

| Item | Estado |
|------|--------|
| `develop` | `c39cba74` |
| **#557** | `POST /api/v1/leads/bulk`, modal Importar lote em `/contacts` |
| Testes | `crm-leads-list` **10/10** |
| Checkpoint | `docs/dev/PAUSA-CRM-2026-11-18.md` (A2 fechado) |
| **Próximo** | **B** webhook pós-assinatura · ver PAUSA |

### Atualização 20/11/2026 (pós #554 / #555 — Leads & Contatos A1)

| Item | Estado |
|------|--------|
| `develop` | `9d518dcf` |
| **#554** | `GET /api/v1/leads` + `/leads` autenticado |
| **#555** | Deep links deal/lead, `POST /leads`, pipeline em `/contacts` |
| Testes | `crm-leads-list` 7/7 |
| Checkpoint | `docs/dev/PAUSA-CRM-2026-11-18.md` (A1 fechado) |
| **Próximo** | A2 bulk import · ou B webhook e-sign · ver PAUSA |

### Atualização 17–18/11/2026 (pós #546 / #547)

| Item | Estado |
|------|--------|
| E-sign locações (#546) | MERGED — migration **0068** |
| Kanban `@dnd-kit` (#547) | MERGED |
| Testes backend (`rental-sign`, `deals-*`) | 29 testes OK |
| Build `apps/turismo` | OK |
| Smoke e-sign | `npm run smoke:crm-rental-sign` — **verde** (API + `/rentals/sign`) |
| Turismo Docker | Imagem **17/11** reconstruída; smoke HTML OK |
| Doc smoke | `docs/dev/SMOKE-CRM-ESIGN-KANBAN-2026-11-17.md` |
| **PR #548** (aberta) | Docker npm ci + smoke script/docs — ver **`PAUSA-CRM-2026-11-18.md`** |
| Branch local ao pausar | `chore/docker-npm-ci-and-esign-smoke` (WT limpa) |

**Próxima fatia P1:** e-mail com link de assinatura · expiração/revogação · mascaramento CPF na listagem.

**Pausa sessão:** `docs/dev/PAUSA-CRM-2026-11-18.md` (18 nov 2026).

---

## Estado do git (`develop`)

| Item | Valor |
|------|--------|
| Base remota | `develop` @ **#522** (`92a95457`) lockfile + **#521** Overview |
| **#517–#520** | Deals KPI · Rentals 3a · Sales 3b · polish 3c — todos MERGED |
| CI CRM | CodeQL/gitleaks OK · NPM Audit fora do escopo (ver brief lockfile) |
| Stash local | `wip-unrelated-pre-3a` (Anfitrião, package-lock, etc.) — não aplicar na fatia Rentals |

**Não misturar** com stash/working tree alheio: `fase1-api.ts` / carteira anfitrião (ver notas antigas no handoff 11/11).

---

## Homologação smoke — resumo executivo

| Veredito | 🟢 **VERDE** (13/11 — patch Win Rate aplicado e revalidado) |
|----------|-----------------------------------------------------------|

| Grupo | Resultado |
|-------|-----------|
| Auth 2.1.x | ✅ 3/3 |
| Deep links + kanban 2.2.x | ✅ 5/5 (Cursor) |
| Modal 2.3.x | ✅ 4/5 + **N/A** Perfil (2.3.5 sem ação) |
| KPI 2.4.x | ✅ 2/2 (fix `deals-crm-module.tsx`) |
| Dark 2.5.x | ✅ 2.5.1 OK; 2.5.2 N/A no código (`components/deals/` sem hex; kanban `globals.css` → Opção 2) |

**Build:** `npm run build -w apps/turismo` → OK.

---

## Fix aplicado (13/11 — sessão retomada)

**KPI Win Rate:** `winRate` conta apenas `status === 'won' | 'lost'`. **Opção 2:** `LINTEL_KANBAN_THEME` + vars CSS. Entregues via **#517** (não mergear `develop` local até gate).

---

## Auth — evidência (smoke Cursor, login fresco)

- Login: `http://localhost:3005/login`  
  - Email: `admin@rsv360.com.br`  
  - Senha dev: `dev-only-fallback-do-not-use-in-prod` (ver `docs/cotacao/TROUBLESHOOTING-LOGIN-LOCAL.md`)
- `2.1.2`: `/api/v1/deals` → **200** com `Authorization: Bearer` + token em `localStorage` (`access_token` / `authToken`); sem Bearer → **401** (esperado; não é falha de UI)

---

## Deep links (evidência 5/5)

| Slug | Valor |
|------|-------|
| `dhollismarc` | $1.185.000 — Marcus |
| `dhollispriya` | $1.240.000 — Priya |
| `dhollisspen` | $1.215.000 — Spencer · 2481 Hollis Lane |

URLs: `/deals?deal=<slug>` e overview com `tab=deals`.

---

## Ambiente local

```powershell
# Se :3005 já estiver em uso, NÃO iniciar outro dev (EADDRINUSE)
# Caso contrário:
npm run dev -w apps/turismo
```

Backend/auth: ver troubleshooting login (`:3005` proxy para `/api/v1/auth/login`).

---

## Próximos passos (ordem recomendada)

1. ~~**Gate + merge #517**~~ ✅
2. ~~**Opção 3a Rentals + PR #518**~~ ✅
3. ~~**Opção 3b Sales + PR #519**~~ ✅
4. ~~**3c polish (#520)**~~ ✅
5. ~~**Smoke Sales/Rentals**~~ ✅ — `SMOKE-CRM-SALES-RENTALS-2026-11-13.md` (manual 3R.7–3S.8 fechado 13/11)
6. ~~**PR lockfile #522**~~ ✅ merged; **Backlog:** NPM Audit CVE gate (`BRIEF-NPM-AUDIT-LOCKFILE-2026-11-13.md`) · Overview Anfitrião P1+
7. Deals: 2.3.3 / 2.3.4 manual; 2.3.5 Perfil N/A.

---

## Opção 3 — Brief Sales/Rentals (paridade Lintel) — *planeamento apenas*

**Objetivo:** alinhar abas **Vendas** e **Locações** do Cockpit (`RSV360ExecutiveDashboard`) à referência Lintel, no mesmo padrão entregue em Deals (shell, KPIs, tokens, deep links, dark mode).

**Pré-requisitos:** PR **#517** mergeada; smoke Deals verde mantido; gate da fatia anterior fechado.

### Escopo sugerido (2 PRs ou 2 sub-fatias)

| Fatia | Rotas / entrada | Módulos principais |
|-------|------------------|---------------------|
| **3a — Rentals** | `/overview?tab=rentals` | `rentals-crm-module.tsx`, `rental-portfolio-card.tsx`, `rent-roll-chart.tsx`, `lease-calendar-panel.tsx`, `rentals-skeleton.tsx` |
| **3b — Sales** | `/overview?tab=sales` | `sales-crm-module.tsx`, `sales-list-table.tsx`, `sales-property-card.tsx`, `sales-map-view.tsx`, `sales-market-pulse-card.tsx`, `sales-listing-share.ts` |

**Shell partilhado:** `lintel-shell-nav.tsx`, `crm-copy.ts`, `lintel-theme.ts` / `globals.css` (reutilizar padrão Opção 2).

### Critérios de aceitação (mínimo)

- KPI strip + layout consistentes com Deals (tokens, sem hex novo em `components/sales|rentals/`).
- Navegação overview: `tab=rentals` / `tab=sales` sem regressão em `tab=deals`.
- Dark mode legível (smoke visual documentado).
- `npm run build -w apps/turismo` OK.
- Checklist smoke dedicado (criar `docs/dev/SMOKE-CRM-SALES-RENTALS-*.md` quando iniciar).

### Referências

- `docs/dev/AUDITORIA-CRM-DEALS-LINTEL-2026-11-12.md` (gaps)
- `docs/cotacao/MATRIZ-PARCEIRO-OVERVIEW-LINTEL.md`
- Demo: `https://demo.codeandchill.store/lintel/` (Rentals / Sales)

### Estimativa / risco

- **Esforço:** médio-alto (2 módulos × polish + possíveis dados demo).
- **Risco:** médio (dashboard monolítico; evitar refactor em `RSV360ExecutiveDashboard.tsx` fora do necessário).
- **Blast radius:** `apps/turismo/components/{sales,rentals,lintel}` + CSS.

### Prompt para quando o gate libertar

> «Merge #517 feito. Ler brief Opção 3 em `CONTINUAR-CRM-DEALS-2026-11-13.md`. Implementar fatia **3a Rentals** com patch mínimo, build, smoke visual, PR separada.»

---

## Documentos de referência

| Ficheiro | Uso |
|----------|-----|
| `docs/dev/SMOKE-CRM-DEALS-2026-11-13.md` | Smoke Deals |
| `docs/dev/SMOKE-CRM-SALES-RENTALS-2026-11-13.md` | Smoke Sales/Rentals pós-#520 |
| `docs/dev/BRIEF-NPM-AUDIT-LOCKFILE-2026-11-13.md` | PR lockfile/audit |
| `docs/dev/BRIEF-OVERVIEW-ANFITRIAO-2026-11-13.md` | Fatia overview WIP |
| `docs/dev/HANDOFF-CRM-DEALS-LINTEL-2026-11-11.md` | Mapa de ficheiros e paridade Lintel |
| `docs/dev/AUDITORIA-CRM-DEALS-LINTEL-2026-11-12.md` | Gap vs Lintel |
| `docs/cotacao/TROUBLESHOOTING-LOGIN-LOCAL.md` | Login local |

---

## Gate enterprise

- **3a:** fechada (#518). **3b:** PR dedicada; não misturar WIP `pages/overview.tsx`.
- NPM Audit na base: fora do escopo das fatias CRM Lintel.

---

## Retomar no Cursor (prompt sugerido)

> «`gh pr checks 517`. Se merge OK: `git pull origin develop`. Iniciar Opção 3a Rentals conforme brief no CONTINUAR.»

---

*Gerado para pausa da sessão 13/11/2026. Transcript Cursor: buscar `a2c12981` em agent-transcripts.*
