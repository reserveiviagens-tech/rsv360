# Handoff — CRM / Overview / Lintel (25 nov 2026 — pausa)

> Retomar por este ficheiro + `CONTINUAR-CRM-DEALS-2026-11-13.md` + `BRIEF-OVERVIEW-ANFITRIAO-2026-11-13.md`.

## develop (fonte de verdade)

| Item | Valor |
|------|--------|
| **origin/develop** | `8b49de24` — merge **#590** |
| **Gate CI #590** | ✅ verde (gitleaks, CodeQL, NPM Audit, Trivy, Analyze) |
| **Último merge** | P4 Overview Anfitrião — Rentals API |

### PRs mergeados (sessão 24–25/11)

| PR | Escopo |
|----|--------|
| **#588** | Proxy dev `next.config` — `/api/v1` → `:3002` |
| **#589** | Lintel 3c — último hex em `rental-property-detail-modal` |
| **#590** | **P4** — `?tab=rentals` portfólio API (`unidadesToRentalPortfolio`) + badge API + smoke **H8** |

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
| P5+ | Backlog (ver abaixo) |

## Smoke

| Doc | Notas |
|-----|--------|
| `SMOKE-CRM-DEALS-2026-11-13.md` | 2.3.4/2.3.5 ✅; 2.3.3 parcial (Fatia B em espera) |
| `SMOKE-CRM-ROUTES-LEADS-CONTACTS-2026-11-13.md` | **H8** novo — validar manual pós-merge #590 |

### H8 (pendente validação manual owner)

- Login parceiro com unidades → `/overview?tab=rentals` → badge **API**, ids `unit-<n>`
- Sem unidades / demo comissão Lintel → aviso âmbar + sample

## Ambiente dev local

| Item | Nota |
|------|------|
| Auth proxy | **#588** em develop; `.env.local` → `NEXT_PUBLIC_API_URL=http://localhost:3002` (**não commitar**) |
| Docker | Rebuild `turismo` se quiser imagem com #590 (~15–20 min) |
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

1. **Smoke H8** + opcional amend SMOKE (commit local ou PR só docs se owner quiser)
2. **Fatia B** — persistência Kanban/API — **somente** com repro documentado
3. **NPM audit brief** — chore/CI, PR separada (não bloqueador)
4. Playwright clipboard 2.3.4 — nice-to-have (#587 já cobre UX)
5. Overview P5 — ex.: Sales tab API, deep links `?rental=unit-*` e2e, ou jest runner turismo para testes `overview-portfolio-rentals.test.ts`

## Branches / housecleaning

| Branch | Ação sugerida |
|--------|----------------|
| `feat/overview-anfitriao-p4-rentals-api-portfolio` | Pode apagar após pull |
| `fix/lintel-3c-hex-polish` | Obsoleta (commit vazio + docs) — apagar remoto |

## Gate enterprise

- **Próxima fatia:** só após merge #590 ✅ — **liberado**
- Sem auto-merge · sem Fatia B sem repro

## Prompt para retomar no Cursor

> Pull `develop` @ `8b49de24`. Gate #590 verde. Executar smoke **H8** em Docker ou dev. Escolher próximo item do backlog (recomendado: smoke H8 + então NPM audit **ou** próximo gap Overview P5).