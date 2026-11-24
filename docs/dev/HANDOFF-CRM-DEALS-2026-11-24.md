# Handoff — CRM Deals / dev local (24 nov 2026)

## develop

| Item | SHA / nota |
|------|------------|
| **origin/develop** | `3bc7c2d6` (#586 Perfil + #587 aria-live) |
| **local develop** | `0018dddf` — commit **só docs** SMOKE 2.3.4/2.3.5 (**não pushed**) |
| **Working tree** | `next.config.js` (proxy dev) — ver commit desta sessão ao retomar |

## PRs mergeados (esta sessão)

| PR | Escopo |
|----|--------|
| **#585** | TDZ Leads KPI |
| **#586** | Fatia A — botão **Perfil** → `/overview?tab=contacts&contact=<id>` |
| **#587** | Fatia C — toast copiar link + `aria-live` persistente |

## Smoke

| ID | Status |
|----|--------|
| **2.3.5** | ✅ Validado dev local `:3005` (Marcus → `contact=c5`) — ver SMOKE doc amend |
| **2.3.4** | ✅ Código mergeado; clipboard Playwright opcional |
| **2.3.3** | ⚠️ Parcial — **Fatia B** só com bug reproduzido |

Doc: `docs/dev/SMOKE-CRM-DEALS-2026-11-13.md` (commit local `0018dddf`).

## Ambiente dev (estado ao pausar)

| Serviço | Estado |
|---------|--------|
| `docker compose stop turismo` | Container **parado** (imagem antiga antes do merge) |
| `rsv360-backend` | **Up** `:3002` |
| Front | **`npm run dev`** em `:3005` (processo Node separado / janela cmd) |

### Auth / 404 (corrigido no working tree)

- Sintoma: overlay **Falha ao renovar token**, `404` em `/api/v1/auth/*` no `:3005`.
- Causa: proxy `/api/v1` não alcançava backend; `.env.local` tinha `NEXT_PUBLIC_API_URL=http://localhost:3005`.
- Fix: `next.config.js` **rewrites** dev → `:3002`; `.env.local` → `NEXT_PUBLIC_API_URL=http://localhost:3002` (**local, não commitar**).

### Retomar daqui

```powershell
cd "c:\Users\RSV 360\Documents\rsv360"
docker ps   # backend healthy
# Parar dev antigo se existir; depois:
npm run dev -w apps/turismo
# Validar: Invoke-WebRequest http://localhost:3005/api/v1/auth/session → 401 (não 404)
```

## Backlog

- **Fatia B** — persistência estágio Kanban + API (só com evidência)
- **Push** opcional: commit docs `0018dddf` + fix proxy (quando owner quiser PR)
- **Docker turismo** — rebuild só se quiser stack full container de novo (~20 min, rede instável)

## Não fazer sem owner

- PR só docs / PAUSA
- Auto-merge
- Fatia B sem repro