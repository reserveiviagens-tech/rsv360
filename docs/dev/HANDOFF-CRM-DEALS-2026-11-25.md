# Handoff — CRM / Overview / Lintel (25 nov 2026 — pausa)

> Retomar por este ficheiro + `CONTINUAR-CRM-DEALS-2026-11-13.md` + `BRIEF-OVERVIEW-ANFITRIAO-2026-11-13.md`.

## develop (fonte de verdade)

| Item | Valor |
|------|--------|
| **origin/develop** | `1c14d458` — merge **#591** |
| **Gate CI #591** | ✅ verde (gitleaks, CodeQL, NPM Audit, Trivy, Analyze) |
| **Último merge** | P5 — Rentals API desacoplada de `useCommissionDemo` |

### PRs mergeados (sessão 24–25/11)

| PR | Escopo |
|----|--------|
| **#588** | Proxy dev `next.config` — `/api/v1` → `:3002` |
| **#589** | Lintel 3c — último hex em `rental-property-detail-modal` |
| **#590** | **P4** — `?tab=rentals` portfólio API (`unidadesToRentalPortfolio`) + badge API + smoke **H8** |
| **#591** | **P5** — Rentals API independente de comissão demo (`overview.tsx`) |

### Já em develop antes desta sessão

| PR | Escopo |
|----|--------|
| #586 | Perfil buyer → contacts hub |
| #587 | Copiar link + aria-live |
| #582–#583 | Anfitrião P2/P3 (Leads/Contacts API) |

## Overview Anfitrião — estado

| Fatia | Status |
|-------|--------|
| P0–P1 | ✅ |
| P2–P3 | ✅ #582/#583 |
| **P4 Rentals API** | ✅ **#590** |
| **P5 Rentals ≠ comissão demo** | ✅ **#591** |
| P5+ | Backlog (ver abaixo) |

## Smoke

| Doc | Notas |
|-----|--------|
| `SMOKE-CRM-DEALS-2026-11-13.md` | 2.3.4/2.3.5 ✅; 2.3.3 parcial (Fatia B em espera) |
| `SMOKE-CRM-ROUTES-LEADS-CONTACTS-2026-11-13.md` | **H8** ✅ 25/11 (H8a demo comissão; H8b API pós-**#591**) |

### H8 (validado 25/11 — browser Docker `:3005`)

| Caso | Resultado |
|------|-----------|
| **H8a** admin + comissão demo | ✅ Sample Lintel; sem badge API — `useCommissionDemo` |
| **H8b** badge API + portfólio API | ✅ 25/11 pós-rebuild turismo #591 — badge **API**; unidades reais (não sample Lintel) |

## Ambiente dev local

| Item | Nota |
|------|------|
| Auth proxy | **#588** em develop; `.env.local` → `NEXT_PUBLIC_API_URL=http://localhost:3002` (**não commitar**) |
| Docker | Rebuild `turismo` para imagem com **#591** (~15–20 min) |
| `dev:mem` | Script no `package.json` pode existir só local — não obrigatório |

```powershell
cd "c:\Users\RSV 360\Documents\rsv360"
git checkout develop
git pull origin develop
docker compose up -d postgres redis backend   # se usar stack
docker compose build turismo && docker compose up -d turismo   # opcional
# OU: npm run dev -w apps/turismo  (uma instância :3005; parar container turismo)
# Smoke: http://localhost:3005/overview?tab=rentals
```

## Backlog prioritizado (próxima sessão)

1. ~~Smoke H8b~~ ✅ — próximo: NPM audit chore ou Overview P5+
2. **Fatia B** — persistência Kanban/API — **somente** com repro documentado
3. **NPM audit brief** — chore/CI, PR separada (não bloqueador)
4. Playwright clipboard 2.3.4 — nice-to-have (#587 já cobre UX)
5. Overview P5+ — Sales tab API, deep links `?rental=unit-*` e2e, jest `overview-portfolio-rentals.test.ts`

## Branches / housecleaning

| Branch | Ação sugerida |
|--------|----------------|
| `feat/overview-anfitriao-p4-rentals-api-portfolio` | Pode apagar após pull |
| `fix/lintel-3c-hex-polish` | Obsoleta (commit vazio + docs) — apagar remoto |

## Gate enterprise

- **Próxima fatia:** gate **#591** + smoke **H8** ✅ — **liberado**
- Sem auto-merge · sem Fatia B sem repro

## Prompt para retomar no Cursor

> Pull `develop` @ `1c14d458`. Gate #591 verde. Rebuild turismo + smoke **H8b**. Depois: NPM audit chore **ou** Overview P5+.