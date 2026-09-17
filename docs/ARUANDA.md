# Aruanda — Mapa completo do servidor Turismo (RSV360)

> Documento canônico de auditoria do ecossistema **RSV360** — app Turismo (detalhado) + **stack canônica completa** (backend, site-publico, admin, guest, infra).  
> **Nome:** Aruanda  
> **Data da auditoria:** 2026-09-13 (Turismo) · **2026-09-13 (Stack canônica — extensão)**  
> **Escopo:** inventário estático de rotas, shells, APIs, maturidade, backlog, mapa de servidores e auditoria **função a função** da stack `rsv360-*`  
> **Método:** leitura de código + inspeção Docker/portas — não substitui QA autenticado em runtime  
>
> **Turismo / Anfitrião:** auditoria **completa** nas §§5–6, 11–14 (não re-inventariada nesta extensão).  
> **Stack canônica (demais serviços):** §19.  

**Canvas visual (opcional):** `~/.cursor/projects/c-Users-RSV-360-Documents-rsv360/canvases/turismo-audit-mapa.canvas.tsx`

---

## 1. Veredito executivo

| Métrica | Valor (est.) |
|---------|----------------|
| Páginas de rota (`pages/**`, excl. `_app`/`_document`) | **204** |
| READY (UI + wiring API) | **~52** |
| PARTIAL / mock / localStorage | **~128** |
| MISSING / placeholder | **~15** |
| LEGACY / morto / conflito | **~9** |
| API routes Next locais (`pages/api/**`) | **4** (sem negócio anfitrião) |

**Superfície de produto real hoje**

1. **Anfitrião** (Fases 9–10) — `/anfitriao/**` + backend `/api/v1/acomodacoes/anfitriao`
2. **Fase 1 operacional** — orçamentos, propostas, passageiros, campanhas
3. **Módulos dashboard** — leilões, excursões, viagens em grupo, marketplace/OTA/GHA (validar profundidade)

**Maior dívida**

- Monólito legado: `/reservei/**`, dezenas de páginas root com mock, ECOSYSTEM morto
- Menu lateral (`AppSidebar`) ainda lista ~20 “façades” (página existe, negócio frágil ou mock)
- Limites conscientes ainda não rotulados na UI: NFSe draft, Twilio opcional, sem scrape OTA

---

## 2. Arquitetura (camadas)

```
UI (apps/turismo)
  pages/*  →  hooks (useAnfitriao, Fase1)  →  fase1-api.ts / *Api clients
       ↓
API (server/modules/acomodacoes)
  anfitriao.routes.ts  →  services / utils
       ↓
Dados (backend)
  Drizzle schema  ·  Postgres  ·  migrations 0050–0057
```

| Camada | Onde vive | Não misturar |
|--------|-----------|--------------|
| Shell dashboard | `pages/_app.tsx` + `AppSidebar` | Chrome do host |
| Shell anfitrião | `AnfitriaoHostNav` | AppSidebar (escondido em `/anfitriao/**`) |
| Regras de reserva/preço/host | `server/modules/acomodacoes` | Componentes React |
| Schema / migrations | `backend/drizzle`, `backend/src/db` | Frontend |

### Shell — `pages/_app.tsx`

- Providers: `QueryProvider` → `AuthProvider`
- Chrome: `AppSidebar` + `InstrutorHelpWidget`
- **Sidebar oculta** em: `/login`, `/register`, `/anfitriao`, `/anfitriao/**`
- Margem do `<main>`: `ml-0` (oculto/mobile) · `ml-16` (colapsado) · `ml-64 md:ml-72` (aberto)

### Navegação Anfitrião no slide (descoberta)

Categoria **Anfitrião** no `AppSidebar` (submenu):

| Item | URL |
|------|-----|
| Hoje | `/anfitriao` |
| Calendário | `/anfitriao/calendario` |
| Anúncios | `/anfitriao/unidades` |
| Mensagens | `/anfitriao/mensagens` |
| Reservas | `/anfitriao/reservas` |
| Desempenho | `/anfitriao/desempenho` |

Dentro de `/anfitriao/*` vale o **HostNav** (topo). Sem double shell.

---

## 3. Heurística de status

| Status | Significado |
|--------|-------------|
| **READY** | UI substancial + wiring a API/hooks reais |
| **PARTIAL** | UI grande com mock, TODO, localStorage ou backend incompleto |
| **MISSING_IMPL** | Placeholder / “em construção” / vazio |
| **LEGACY_DEAD** | Backup, conflito de rota, abandonado |
| **NOT_IMPLEMENTED** | Domínio pedido inexistente no código |

---

## 4. Contagens por pasta

| Grupo | Contagem | Maturidade dominante |
|-------|----------|----------------------|
| `pages/anfitriao/**` | 15 | READY |
| `pages/dashboard/**` | 22 | READY (módulos) / PARTIAL (analytics) |
| `pages/dashboard*.tsx` (raiz) | 7 | PARTIAL / LEGACY |
| `pages/cotacoes/**` | 11 | PARTIAL (localStorage) |
| `pages/reservei/**` | ~34 | PARTIAL (mock) |
| Auth + home | 3 | READY / redirect |
| `pages/api/**` | 4 | health / CSP / proxy core |
| Restante monólito | ~100+ | PARTIAL / MISSING / LEGACY |
| App Router `app/` | 0 | inexistente |
| Espelho `src/pages/` | ~122 | **não** é rota Next ativa |

---

## 5. Anfitrião — inventário completo de páginas

**Componentes shared:** `AnfitriaoRoleGuard`, `AnfitriaoHostNav`, `AnfitriaoListingEditor` (+ ~30 editors), calendário/rate drawers, `useAnfitriao` → `fase1Api`.

| URL | Arquivo | Status | Evidência |
|-----|---------|--------|-----------|
| `/anfitriao` | `pages/anfitriao/index.tsx` | READY | `useAnfitriaoDashboard` + `useAnfitriaoHoje` |
| `/anfitriao/calendario` | `calendario.tsx` | READY | `useAnfitriaoCalendarioAgregado` |
| `/anfitriao/reservas` | `reservas.tsx` | READY | reservas + decidir pedido |
| `/anfitriao/mensagens` | `mensagens.tsx` | READY | inbox / thread / enviar |
| `/anfitriao/desempenho` | `desempenho/index.tsx` | READY | métricas + CSV fiscal |
| `/anfitriao/unidades` | `unidades/index.tsx` | READY | minhas + lista |
| `/anfitriao/unidades/[id]` | `unidades/[id]/index.tsx` | READY | `AnfitriaoListingEditor` |
| `/anfitriao/unidades/[id]` | `unidades/[id].tsx` | **LEGACY_DEAD** | Conflito com `[id]/index.tsx` |
| `/anfitriao/unidades/[id]/disponibilidade` | `disponibilidade.tsx` | READY | rate-calendar, iCal, bulk |
| `/anfitriao/tarifas` | `tarifas/index.tsx` | READY | tarifasConfig / simulação |
| `/anfitriao/comissoes` | `comissoes.tsx` | READY | comissões |
| `/anfitriao/importar` | `importar.tsx` | READY | import preview + modelo xlsx |
| `/anfitriao/convites/aceitar` | `convites/aceitar.tsx` | READY | aceitar por `?token=` |
| `/anfitriao/admin/verificacao-local` | `admin/verificacao-local.tsx` | READY | staff aprovar/rejeitar |
| `/anfitriao/perfil` | `perfil.tsx` | READY | conta (sessão) + troca senha MFA; bio no editor |

### Editor de anúncio (36 seções)

| Grupo | Seções | Status |
|-------|--------|--------|
| Seu espaço (20) | fotos, título, tipo, camas, preços, descontos, disponibilidade, hóspedes, descrição, comodidades, acessibilidade, localização, verificação, sobre, coanfitriões, config reserva, regras, segurança, cancelamento, link | Implementados; **mapa preview “em breve”** |
| Guia chegada (9) | check-in/out, como chegar, método, wifi, guia casa, regras, checkout, guias locais, interação | Implementados |
| Preferências (7) | status, idiomas, requisitos, leis, impostos, solidária, remover | Implementados |

### Matriz de completude Anfitrião

| Feature | UI | API | Completude |
|---------|----|-----|------------|
| Hoje | OK | OK | Alta |
| Calendário | OK | OK | Alta |
| Anúncios / unidades | OK | OK | Alta |
| Editor | OK | OK | Alta (UI); média em domínio metadata |
| Mensagens | OK | OK | Alta |
| Reservas | OK | OK | Alta |
| Desempenho / CSV | OK | OK | Alta |
| Coanfitriões / SMS | OK | OK (SMS se Twilio) | Alta / PARTIAL ops |
| Comp-set | OK (CSV) | OK | Média (by design: sem scrape) |
| NFSe | draft UI | preparar rascunho | PARTIAL |
| Verificação / web_gps | OK | OK (≤500 m) | Alta; app nativo ausente |
| Tarifas / comissões / import | OK | OK | Alta; descoberta baixa (fora HostNav) |
| Perfil | OK (mínimo + senha MFA) | change-password | Alta (sem PATCH perfil conta) |

---

## 6. APIs Anfitrião (backend)

**Prefixo canônico:** `/api/v1/acomodacoes/anfitriao`  
**Rotas:** `server/modules/acomodacoes/routes/anfitriao.routes.ts`  
**Mount:** `server/modules/acomodacoes/index.ts`  
**Cliente UI:** `apps/turismo/src/lib/fase1-api.ts` + `src/hooks/useAnfitriao.ts`

Auth: `parceiroAuth` · `masterAuth` · `staffAprovacao` (admin/manager).

### 6.1 Core / unidades — READY

| Method | Path |
|--------|------|
| GET | `/dashboard` |
| GET | `/minhas` |
| GET/PATCH | `/unidades/:id` |
| POST | `/unidades/:id/enviar-aprovacao` |
| POST | `/unidades/:id/arquivar` · `/desarquivar` · bulk desarquivar |
| POST | `/unidades/:id/preview-link` |
| POST | uploads trilho / galeria / acessibilidade |
| PATCH | galeria · trilho-capa |
| POST | `/admin/unidades/:id/aprovar` · `/rejeitar` |
| POST | `/admin/carteira` |

### 6.2 Rate-calendar / preços / conjuntos — READY

| Method | Path |
|--------|------|
| GET | `/unidades/:id/rate-calendar` |
| PUT | `/unidades/:id/rate-calendar/day` |
| PUT | `/unidades/:id/pricing-defaults` |
| POST | aplicar/validar desconto |
| POST | conjuntos-regras aplicar |
| POST | disponibilidade/preco (bulk) |

### 6.3 Calendário / disponibilidade / reservas / mensagens — READY

| Method | Path |
|--------|------|
| GET | `/calendario` · `/unidades/:id/calendario` |
| GET/PUT | `/unidades/:id/disponibilidade` |
| POST | bloquear / desbloquear |
| GET | `/reservas` · `/hoje` · `/mensagens` · `/mensagens/unread-count` |
| GET/POST | `/reservas/:propostaId/mensagens` |
| POST | aprovar / rejeitar reserva |
| iCal | token · import · sync · `.ics` público |

### 6.4 Coanfitriões — READY

Convites: aceitar-token, criar, reenviar, revogar, aceitar, DELETE.  
SoT: tabela `coanfitriao_convites` (sem dual-write metadata).

### 6.5 SMS Twilio — PARTIAL

| Method | Path | Nota |
|--------|------|------|
| GET | `/comunicacao/sms-status` | readiness sem secrets |
| side-effect | invite/reenviar | `skipped` se Twilio ausente |

Env: `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + from number.

### 6.6 Fiscal / NFSe — PARTIAL

| Method | Path | Nota |
|--------|------|------|
| GET | `/impostos/export.csv` | cadastro |
| GET | `/impostos/relatorio-mensal.csv` | estimativa ≠ NFSe |
| POST | `/unidades/:id/nfse/preparar` | **draft only** |
| GET | `/unidades/:id/nfse/rascunhos` | lista drafts |

### 6.7 Comp-set — READY (sem scrape)

Via `PATCH /unidades/:id` → `metadata.compSet[]`; overlay no rate-calendar. CSV no client turismo.

### 6.8 Verificação local + web_gps — READY

Admin lista/aprova/rejeita; host PATCH metadata; `web_gps` Haversine ≤ 500 m.

### 6.9 Desempenho / reviews — PARTIAL

| Method | Path |
|--------|------|
| GET | `/desempenho` |
| GET | `/desempenho/relatorio.csv` |

Reviews: agregação `guest_feedback.acomodacao_id` — **sem CRUD host**.

### 6.10 Alias / lacunas API

| Pedido | Realidade |
|--------|-----------|
| `/host` | NOT_IMPLEMENTED |
| `/units` (EN) | READY como `/unidades` |
| `/reviews` CRUD | NOT_IMPLEMENTED (só agregação) |

### 6.11 Migrations 0050–0057

| # | Arquivo | Tema |
|---|---------|------|
| 0050 | `0050_coanfitriao_convites.sql` | Tabela convites |
| 0051 | backfill coanfitriões | metadata → tabela |
| 0052 | `0052_conjuntos_regras.sql` | Conjuntos de regras |
| 0053 | backfill conjuntos | metadata → tabela |
| 0054 | `expires_at` convites | +14d pendentes |
| 0055 | preview token | hash + expires |
| 0056 | `guest_feedback.acomodacao_id` | reviews → desempenho |
| 0057 | telefone SMS no convite | Twilio |

**Ops:** local Docker já aplicado na sessão de 2026-09-13; **prod/staging ainda precisam** `npm run migrate` com `DATABASE_URL` real (humano).

### 6.12 `pages/api` no turismo (não é negócio anfitrião)

| Path | Função |
|------|--------|
| `api/health.ts` | health local |
| `api/csp-report.ts` | CSP report |
| `api/core/token.ts` | proxy → backend |
| `api/core/users.ts` | proxy → backend |

---

## 7. Limites intencionais (não bugs)

| Tema | Limite |
|------|--------|
| NFSe | Só rascunho (`nfse_pending`); sem API municipal / certificado |
| Relatório fiscal | Estimativa receita × alíquota — não é NFSe |
| Comp-set / OTA | Preços manuais / CSV; **sem scrape**; `ota-scraper.service.ts` é simulação |
| SMS | Skip se Twilio não configurado |
| GPS nativo | Deep-link `reservei://` + `web_gps`; sem app store |
| Coanfitriões | Write só em DB; read pode ter fallback metadata |
| Reviews | Agregação; sem reply do host |

---

## 8. Dashboard e módulos turismo

### `pages/dashboard/**` (amostra)

| URL | Status |
|-----|--------|
| `/dashboard/leiloes*` | READY |
| `/dashboard/excursoes*` | READY |
| `/dashboard/viagens-grupo*` | READY / PARTIAL (wishlists/pagamentos) |
| `/dashboard/marketplace` | READY* |
| `/dashboard/ota-sync` | READY* |
| `/dashboard/google-hotel-ads` | READY* |
| `/dashboard/voice-commerce` | PARTIAL (sem load real) |
| `/dashboard/affiliates` | PARTIAL (TODO ID hardcoded) |
| `/dashboard/analytics-financeiro` | PARTIAL (mock + TODOs) |

\* Validar profundidade das APIs no `server/` antes de tratar como produção.

### `pages/dashboard*.tsx` (raiz)

| URL | Status |
|-----|--------|
| `/dashboard` | PARTIAL (hub teatro) |
| `/dashboard-master`, `-personalizado`, `-rsv`, `-reservei-viagens` | PARTIAL |
| `*-fixed`, `*-backup` | LEGACY_DEAD |

---

## 9. Fase 1, cotações, auth

### Auth

| URL | Status |
|-----|--------|
| `/login` · `/register` | READY |
| `/` | redirect → `/dashboard` ou `/login` |

### Fase 1

| Domínio | Status |
|---------|--------|
| `/modulos`, `/orcamentos*`, `/propostas*`, `/passageiros*`, `/campanhas` | READY / PARTIAL |
| `/financeiro`, `/logistica`, `/relatorios` | PARTIAL |

### Cotações (`/cotacoes/**`)

Dominante **PARTIAL** — `budgetStorage` / localStorage, não API servidor.  
`/cotacoes/test-page` → LEGACY_DEAD.

---

## 10. Reservei, placeholders e legado

### `/reservei/**` (~34)

Padrão: UI grande + `hoteisMock` / “dados mock” / TODO. **Nenhuma fatia marcada READY** na auditoria.

### MISSING_IMPL (exemplos)

`/activities`, `/orders`, `/finance-complete`, `/reservations-complete`, `/settings-complete`, `/partners`, `/integracoes-apis`, políticas de cookies/privacidade/termos, `/example-modern-layout`.

### LEGACY / perigo

| Item | Nota |
|------|------|
| `unidades/[id].tsx` vs `[id]/index.tsx` | Conflito de rota |
| `reservations-rsv 14012026as2012.tsx` | Espaço no filename |
| `pages/ECOSYSTEM-MASTER*`, `rsv-360-ecosystem`, `reservei/RSV-360-ECOSYSTEM/**` | Código morto |
| `src/pages/` | Espelho; não inventariar como rota ativa |

### Soft orphans do AppSidebar

- **Hard orphans (href sem página):** 0 / 71  
- **Soft orphans (página mock/thin):** ~20 — ex.: `/hotels`, `/marketing`, `/reports`, `/permissions`, `/contracts`, `/voice-commerce`

---

## 11. Maturidade por domínio (resumo visual)

| Domínio | Ready | Partial | Missing | Legacy |
|---------|------:|--------:|--------:|-------:|
| Anfitrião | 13 | 1 | 0 | 1 |
| Dashboard módulos | 18 | 4 | 0 | 0 |
| Fase1 | 10 | 5 | 0 | 0 |
| Cotações | 1 | 9 | 0 | 1 |
| Reservei | 0 | 32 | 2 | 0 |
| Auth + shell | 3 | 0 | 0 | 0 |
| Resto monólito | 7 | 77 | 13 | 8 |

---

## 12. O que falta concluir (lista acionável)

### Produto Anfitrião

1. Remover conflito `pages/anfitriao/unidades/[id].tsx` legado  
2. Mapa real no `LocalizacaoEditor` (hoje “em breve”)  
3. Perfil anfitrião completo ✅ (A8 — conta + senha MFA; bio no editor)  
4. Expor no HostNav (ou submenu): tarifas, comissões, importar  
5. Rotular UI NFSe como **rascunho** ou integrar prefeitura  
6. App GPS nativo **ou** remover opção “app” da verificação  
7. Reviews: resposta do host **ou** esconder quando `disponivel: false`  
8. Twilio + migrate em prod/staging (ops humano)  
9. Testes de rota faltando: desempenho, NFSe, sms-status, verificação admin, iCal ✅ (A9)  

### Plataforma / dívida

10. Esconder no AppSidebar categorias mock (Marketing, E-commerce, Relatórios, Voice Commerce…)  
11. Podar `/reservei/**` e leftovers ECOSYSTEM  
12. Cotações: persistência servidor  
13. Validar ou retirar do menu: leilões/OTA/marketplace se API rasa  
14. Contratos GATE-PROD-01: nunca parecer documento válido  
15. Affiliates: remover ID hardcoded  
16. Mensagens: unread realtime (melhoria) ✅ (A12 — polling + badge; sem Socket.IO host)  

---

## 13. O que não foi implantado (explícito)

| Item | Motivo / estado |
|------|-----------------|
| NFSe municipal + certificado | Fora do MVP (draft only) |
| Scrape OTA de preços | Legal/ToS; só CSV/manual |
| App store GPS nativo | Só web_gps + deep-link |
| CRUD reviews pelo host | Só agregação Desempenho |
| Alias EN `/host`, `/units` | Só PT `anfitriao` / `unidades` |
| Proxy anfitrião em `pages/api` | Browser → backend direto |
| App Router (`app/`) | Projeto em Pages Router |

---

## 14. Melhorias priorizadas (impacto × esforço)

| # | Ação | Impacto | Esforço |
|---|------|---------|---------|
| 1 | Esconder mocks no AppSidebar | Alto | Baixo |
| 2 | Remover `[id].tsx` legado anfitrião | Alto | Baixo |
| 3 | Mapa real na Localização | Alto | Médio |
| 4 | Twilio + migrate prod/staging | Alto | Ops |
| 5 | NFSe: integrar **ou** rótulo draft-only | Alto | Alto / baixo |
| 6 | Expor tarifas/comissões/importar na nav | Médio | Baixo |
| 7 | Completar perfil anfitrião | Médio | Baixo |
| 8 | Reviews: reply ou hide | Médio | Médio |
| 9 | Podar reservei + ECOSYSTEM | Médio | Médio |
| 10 | Cotações no servidor | Alto | Alto |
| 11 | Validar APIs dashboard ou tirar do menu | Alto | Médio |
| 12 | Voice Commerce / Affiliates fora do menu | Médio | Baixo |
| 13 | Contratos mock não parecerem válidos | Alto | Baixo |
| 14 | Testes de rota anfitrião faltantes | Médio | Médio |
| 15 | Realtime unread mensagens | Médio | Alto |

### Sequência sugerida de fatias

1. **Fatia limpeza (baixo risco):** AppSidebar + remover `[id].tsx` legado + rótulos draft/mock  
2. **Fatia ops:** Twilio env + migrate staging/prod (humano)  
3. **Fatia produto:** mapa localização **ou** escopo NFSe explícito  
4. **Fatia dívida:** podar ECOSYSTEM / reservei mortos (PR dedicada)

---

## 15. Servidores e endereços (stack completa)

Inventário de **todos os servidores** do ecossistema local RSV360. Fonte: `docker-compose.yml` na raiz + workspaces `apps/*` / `backend` + S1 externo. Snapshot de status da máquina: **2026-09-13**.

### 15.1 Stack canônica RSV360 (`docker-compose.yml`)

Rede Docker interna: **`rsv360_internal`**.

| Nome | Container | Endereço local | Papel |
|------|-----------|----------------|-------|
| Postgres | `rsv360-postgres` | `127.0.0.1:5433` | Banco (`rsv_360_ecosystem`). Container escuta 5432; host mapeia **5433** |
| Redis | `rsv360-redis` | `127.0.0.1:6379` | Cache / filas |
| Backend | `rsv360-backend` | http://localhost:3002 | API canônica (`/api/v1/...`, health) |
| Site público | `rsv360-site-publico` | http://localhost:3000 | Marketing / site / admin lab |
| Admin | `rsv360-admin` | http://localhost:3004 | App admin |
| Turismo | `rsv360-turismo` | http://localhost:3005 | App turismo / anfitrião |
| Guest | `rsv360-guest` | http://localhost:3006 | Portal hóspede |
| Prometheus | `rsv360-prometheus` | http://localhost:9090 | Métricas |
| Alertmanager | `rsv360-alertmanager` | http://localhost:9093 | Alertas |
| Grafana | `rsv360-grafana` | http://localhost:3007 | Dashboards |

Comandos úteis (raiz do monorepo):

```bash
npm run docker:up      # docker compose up -d --build
npm run docker:down
npm run docker:logs
```

### 15.2 Fora do compose (coexiste hoje)

| Nome | Origem | Endereço | Papel |
|------|--------|----------|-------|
| S1 — Site principal | `Crm-RSV-360` (`npm run start:s1` → `scripts/start-s1-site-principal.ps1`) | http://localhost:5000 | CRM / site legado S1 (repo em `Documents/GitHub/Crm-RSV-360`) |
| Postgres Windows local | serviço do SO | `localhost:5432` | **Não** é o Postgres do RSV360 (esse é `:5433`) |

S1 usa o Postgres Docker do RSV360 (`:5433`), mas **não** é o backend monorepo (`:3002`).

### 15.3 Estado agora (máquina — snapshot 2026-09-13, atualizado pós-limpeza órfãos)

| Endereço | Status |
|----------|--------|
| `:3000` site-publico | UP (Docker) |
| `:3002` backend | UP (Docker) |
| `:3004` admin | UP (Docker) |
| `:3005` turismo | UP (`next dev` local; container `rsv360-turismo` Exited — porta no host) |
| `:3006` guest | UP (Docker) |
| `:3007` / `:9090` / `:9093` | UP (monitoramento) |
| `:5433` / `:6379` | UP |
| `:5000` S1 | verificar na sessão |

**Limpeza 2026-09-13:** removidos 17 containers órfãos (nomes auto Docker), imagens `route-smoke-clean-backend` / `rsv360-backend:test`, redes antigas e ~613 MB volumes mortos. Restam **apenas** `rsv360-*`.


### 15.4 Apps no monorepo (workspaces)

| Workspace | Porta canônica | Papel |
|-----------|----------------|-------|
| `apps/turismo` | `:3005` | Turismo / Anfitrião / dashboard operacional |
| `apps/site-publico` | `:3000` | Site público |
| `apps/admin` | `:3004` | Admin |
| `apps/guest` | `:3006` | Guest portal |
| `backend` | `:3002` | API Express canônica |

Scripts raiz: `npm run dev:turismo` · `dev:site` · `dev:admin` · `dev:guest` · `dev:backend`.

`apps/atendimento-ia` aparece no script `dev:atendimento` do `package.json` raiz, mas **a pasta não existe** hoje no monorepo.

### 15.5 Não são servidores vivos

- Composes / ECOSYSTEM sob `apps/turismo/pages/reservei/**` e similares — **legado/morto**, não a stack atual.
- `apps/turismo/pages/ECOSYSTEM-MASTER/**` e `rsv-360-ecosystem` — documentação/teatro, não processos de produção local.
- `docker-compose.prod.yml` — perfil de produção (não inventariado aqui como “ligado agora”).

### 15.6 Referência rápida Anfitrião + dados

| URL / recurso | Nota |
|---------------|------|
| http://localhost:3005/anfitriao | Host (requer login) |
| http://localhost:3002/health | Backend |
| Postgres `:5433` · DB `rsv_360_ecosystem` | Migrations 0050–0057 (local já aplicado na sessão; prod/staging = humano) |

> **Auditoria profunda da stack canônica (backend, site-publico, admin, guest, infra):** ver **§19**. Turismo/Anfitrião detalhado permanece nas **§§5–6**.

---

## 16. Fases Anfitrião já entregues (contexto histórico)

| Fatia | PR | Entrega |
|-------|-----|---------|
| 9.1–9.4 | #345–#348 | Preview token, reviews Desempenho, ratings calendar, SMS coanfitrião |
| 9.5 | #349 | `web_gps` + Haversine ≤500 m |
| 9.6 | #350 | CSV fiscal mensal |
| 9.7 | #351 | Comp-set manual |
| 9.8 | #352 | Cutover sem dual-write coanfitriões |
| 10.1–10.2 | #353 | dotenv migrate, Twilio compose, sms-status UI |
| 10.3–10.5 | #354 | NFSe draft, deep-link GPS, CSV comp-set |

---

## 17. Glossário rápido

| Termo | Significado neste doc |
|-------|------------------------|
| **Aruanda** | Este mapa/auditoria do servidor Turismo + stack de servidores |
| **fase1Api** | Client HTTP do turismo para backend canônico |
| **HostNav** | Abas topo do modo anfitrião |
| **AppSidebar** | Menu slide do dashboard operacional |
| **SoT** | Source of Truth (fonte de verdade) |
| **S1** | Site/CRM legado em `:5000` (`Crm-RSV-360`), coexistente |
| **Stack canônica** | Serviços `rsv360-*` do `docker-compose.yml` na raiz |
| **DEAD (módulo)** | Código presente no repo mas **não montado** no boot do backend |
| **Lab** | Modo `marketing-lab` do site-publico (`/lab`, MFA admin no mesmo app) |

---

## 18. Manutenção deste documento

- Atualizar Aruanda após cada fatia mergeada que mude maturidade de domínio.  
- Atualizar a **§15** quando portas, containers ou coexistências (S1) mudarem; marcar a data do snapshot de status.  
- Atualizar a **§19** quando módulos do backend forem montados/desmontados ou maturidade de site-publico/admin/guest/infra mudar.  
- **Não** re-auditar Turismo/Anfitrião em duplicata — manter §§5–6 como SoT e só ajustar status se houver regressão.  
- Não gravar secrets, tokens, PII ou conteúdo de `.env`.  
- Contagens READY/PARTIAL são **estimativas por inventário estático**; validar com smoke autenticado antes de declarar “pronto para produção”.  


### 18.1 Tracking — Plano de execução Aruanda

Programa: 1 fatia → 1 PR → CI gate → merge. Baseline Onda 0: `main` @ `247269f2` (2026-09-13); CI recente verde (route-smoke, Security Scan, Gitleaks); só containers `rsv360-*` (órfãos removidos). GO Onda 1: implícito em “Implement the plan”.

| Fatia | Status | PR / nota |
|-------|--------|-----------|
| Onda 0 baseline | Merged | #355 |
| A1 rota legado `[id].tsx` | Merged | #355 |
| A2 AppSidebar mocks | Merged | #356 |
| A3 rótulos NFSe/contratos | Merged | #357 |
| A4 HostNav tarifas/comissões/importar | Merged | #358 |
| D1 Prometheus↔Alertmanager | Merged | #359 |
| B1 DEAD modules | Merged | #360 |
| B2 PORT 3002 default | Merged | #361 |
| B3a payments inventário | Merged | #362 |
| B3b PaymentService wire | Merged | #363 |
| B3c PixService wire | Merged | #364 |
| B3d webhook regressão | Merged | #365 |
| B3e booking E2E pago | Merged | #366 |
| B3 P0 Checkout — idempotency, webhooks, B2C public route | Merged | #382 — `feat(payments): P0 checkout idempotency, webhooks secure validation, and B2C public route (#382)` |
| B3 P0 Checkout — rename legacy payments table (0058) | Merged | #383 — `fix(payments): rename legacy payments table before P0 schema in 0058 (#383)` |
| B3 P0 Checkout — smoke, HTTPS auto_return, public client helper | Merged | #384 — `chore(payments): P0 checkout smoke script, HTTPS auto_return, public client helper (#384)` |
| Fatia MGM Public Tracking | Merged | #386 — `feat(mgm): add public referral tracking (#386)` |
| C1 site-publico portas | Merged | #367 |
| C2 Guest stubs | Merged | #368 |
| C3 Admin honestidade | Merged | #369 |
| C4 Teatro fora prod | Merged | #370 |
| A5 rótulo GPS sem app | Merged | #371 |
| A6 Reviews hide | Merged | #372 |
| A7 Mapa LocalizacaoEditor | Merged | #373 |
| A8 Perfil anfitrião | Merged | #374 |
| A9 Testes rota | Merged | #375 |
| A10 Podar reservei/** | Adiado | Requer GO owner |
| A11 Cotações servidor | Adiado | Pós-payments / alto esforço |
| A12 Mensagens unread | Merged | #376 |
| B4 Tracking dedup Redis | Merged | #377 |
| B5 Housekeeping schedule | Merged | #378 |
| B6 CRM path exception | Merged | #379 |
| B7 exporters (opcional) | Merged | #380 |
| Onda 6 hardening | Merged | #377–#380 |
| Onda 7 ops humano | Pendente | Checklist §18.2 (humano; agente não executa) |

### 18.2 Checklist ops humano (Onda 7)

- [ ] Preencher `TWILIO_*` no `.env` do host + recreate `rsv360-backend`
- [ ] `npm run migrate` em staging com `DATABASE_URL` real (0050–0057 se faltarem)
- [ ] `npm run migrate` em produção (após staging OK)
- [ ] Confirmar `METRICS_TOKEN` / Grafana admin por ambiente
- [ ] GO separado: obs no `docker-compose.prod.yml` (hoje ausente)


---

## 19. Stack canônica RSV360 — auditoria completa (exceto Turismo detalhado)

> **Turismo (`apps/turismo` + Anfitrião):** já auditado por completo neste documento (**§§5–6**, maturidade **§11**, lacunas **§§12–14**). Esta seção **não** repete o inventário página a página do Turismo.  
> **Escopo desta seção:** Backend `:3002`, Site público `:3000`, Admin `:3004`, Guest `:3006`, Postgres, Redis, Prometheus, Grafana, Alertmanager — e o mapa de prontidão da stack como sistema.

### 19.1 Mapa dos serviços canônicos

```
                    ┌─────────────────┐
   Browser/LAN ────►│  Frontends      │
                    │  :3000 site     │
                    │  :3004 admin    │
                    │  :3005 turismo* │  *detalhe §§5–6
                    │  :3006 guest    │
                    └────────┬────────┘
                             │ HTTP /api/v1 · /api/portal
                             ▼
                    ┌─────────────────┐     ┌──────────────┐
                    │ rsv360-backend  │────►│ postgres     │
                    │ :3002           │     │ :5433        │
                    │ Express+Socket  │────►│ redis :6379  │
                    └────────┬────────┘     └──────────────┘
                             │ /metrics (Bearer)
                             ▼
                    ┌─────────────────┐
                    │ prometheus:9090 │ ────► alertmanager:9093 (D1 ligado)
                    │ grafana:3007    │◄── prometheus
                    └─────────────────┘

Rede: rsv360_internal · Compose: docker-compose.yml · Projeto: rsv360
*Externo:* S1 Crm-RSV-360 :5000 (não canônico — §15.2)
```

| Serviço | Container | Endereço | Papel | Maturidade stack |
|---------|-----------|----------|-------|------------------|
| Backend | `rsv360-backend` | http://localhost:3002 | API Express canônica | READY (gaps críticos de Payments P0 encerrados em #382–#384) |
| Site público | `rsv360-site-publico` | http://localhost:3000 | B2C + Lab + admin MFA + BFF | PARTIAL (híbrido) |
| Admin | `rsv360-admin` | http://localhost:3004 | Shell ops → :3002 | PARTIAL |
| Turismo | `rsv360-turismo` / `next dev` | http://localhost:3005 | Turismo + Anfitrião | **READY núcleo Anfitrião** — ver §§5–6 |
| Guest | `rsv360-guest` | http://localhost:3006 | Portal hóspede | READY núcleo / PARTIAL extras |
| Postgres | `rsv360-postgres` | 127.0.0.1:5433 | DB `rsv_360_ecosystem` | READY |
| Redis | `rsv360-redis` | 127.0.0.1:6379 | Cache / filas / rate-limit | READY |
| Prometheus | `rsv360-prometheus` | :9090 | Scrape `/metrics` | PARTIAL |
| Grafana | `rsv360-grafana` | :3007 | 1 dashboard | PARTIAL |
| Alertmanager | `rsv360-alertmanager` | :9093 | Null sink (UI only) | READY (lab D1) |

---

### 19.2 Backend (`rsv360-backend` :3002) — função a função

**Boot:** `backend/server.js` → `createApp()` (`backend/app.js`) → módulos + workers (propostas, acomodacoes import, auctions, fornecedores-hub) + Socket.IO.

**Health:** `GET /health` · `GET /health/security` · `GET /metrics` (Bearer `METRICS_TOKEN`).

#### Módulos montados

| Módulo | Prefixo | Status | Evidência / nota |
|--------|---------|--------|------------------|
| multi-property | `/api/properties` | READY | Tenant middleware |
| auth (v1) | `/api/v1/auth` | READY | Login/refresh/2FA/SSO/OAuth/reset |
| tenant | `/api/v1/tenant` | READY | `GET /context` |
| auctions | `/api/v1/auctions` | READY | + worker settlement |
| payments | `/api/v1/payments` | **READY** | P0 B2C checkout + webhooks seguros + schema 0058 (#382–#384); smoke `smoke:p0-checkout` (#384) |

#### Payments — inventário B3a (histórico) + fechamento P0

| Peça | Path | Estado B3a (histórico) |
|------|------|------------------------|
| Factory | `backend/server/modules/payments/factory.ts` | `PAYMENT_PROVIDER` → MP/Stripe; default `mercadopago` |
| PaymentService | `…/services/payment.service.ts` | Era mock silencioso na B3a; supersedido pelo wire P0 (#382) |
| PIXService | `…/services/pix.service.ts` | Era mock silencioso na B3a; supersedido pelo wire P0 (#382) |
| MercadoPagoProvider | `…/providers/mercadopago.provider.ts` | Implementação real (`MP_ACCESS_TOKEN`) |
| StripeProvider | `…/providers/stripe.provider.ts` | Implementação real |
| OpenFinance PIX | `…/providers/openfinance-pix.provider.ts` | Alt via `PIX_PROVIDER` |
| Webhooks | `…/services/webhook.service.ts` + HMAC lib | Maduro; reforçado no P0 (#382); teste `pr02-mp-webhook-hmac.test.ts` |
| Rotas | `payment.routes.ts` / `pix.routes.ts` + checkout B2C público | P0: rota pública B2C + idempotência (#382) |

**Critérios de aceite (B3b–B3e) — histórico do contrato; P0 (#382–#384) encerrou o gap crítico de checkout:**

1. `create`/`list`/`get`/`cancel` **deixam de retornar mock** quando o provider está configurado (credenciais presentes).
2. Sem provider utilizável (`PAYMENT_PROVIDER=none|disabled` **ou** credencial ausente) → **erro explícito** (4xx/5xx de domínio), nunca mock silencioso.
3. Testes de contrato com **test doubles** do provider (sem PII; sem chamar rede).
4. Webhook HMAC + `webhook_events` intactos (B3d).
5. Suite booking E2E pago com doubles (B3e).

| guest-portal | `/api/portal`, `/api/admin/portal` | READY | Token portal + staff |
| housekeeping | `/api/housekeeping` | READY | CRUD OK; scheduler explícito (`auto-disabled` / `HK_AUTO_SCHEDULE`) |
| revenue | `/api/revenue` | READY | Rules/calendar/forecast |
| crm | `/api/crm` | READY | Guests/loyalty/campaigns — **exceção canônica** fora de `/api/v1` (B6; migrar só com GO) |
| notifications | `/api/v1/notifications` | READY | Hub dispatch |
| orcamentos | `/api/v1/orcamentos` | READY | Fase1 |
| propostas | `/api/v1/propostas` | READY | CRUD + WS HITL + workers |
| passageiros | `/api/v1/passageiros` | READY | + FNRH |
| financeiro | `/api/v1/financeiro` | READY | Dashboard/transações |
| campanhas | `/api/v1/campanhas` | READY | + cupons |
| logistica | `/api/v1/logistica` | READY | Reservas/transporte |
| relatorios | `/api/v1/relatorios` | READY | Export |
| fornecedores-hub | `/api/v1/fornecedores-api` | READY | Cotação + reservar-vaga + lock Redis |
| acomodacoes (+ anfitrião) | `/api/v1/acomodacoes*` · `/api/v1/tarifas` | READY | **Anfitrião: ver §§5–6** |
| cotacao-publica | `/api/v1/cotacao-publica` · `/api/v1/p/:token` | READY | Wizard + Turnstile |
| configuracoes | `/api/v1/configuracoes` | READY | Regras cotação |
| vouchers | `/api/v1/vouchers` | PARTIAL | Health + verificar QR |
| roteiro / roteiro-analytics | `/api/v1/roteiro` | READY | Mapa + batch |
| comissoes | `/api/v1/comissoes` | READY | Aprovação |
| cms | `/api/v1/cms` | READY | Vitrine + uploads |
| agentes | `/api/v1/agentes` | READY | Feature-flag + instrutor |
| tracking | `/api/tracking` | READY | CAPI; dedup Redis (fallback memória) |

**Exceção canônica CRM (Aruanda B6):** o módulo monta em **`/api/crm`**, deliberadamente fora de `/api/v1`. Clients, OpenAPI e smoke tests usam esse prefixo. **Não** criar alias silencioso em `/api/v1/crm`; migração exige GO do owner.

#### Módulos NÃO montados (código morto no processo)

| Módulo | Prefixo pretendido | Status |
|--------|--------------------|--------|
| pricing | `/api/pricing` | **DEAD** — 410 stub (B1); não montado |
| cloud | `/api/cloud` | **DEAD** — 410 stub (B1) |
| communication | `/api/v1/comm` | **DEAD** — 410 stub (B1) |
| marketing | `/api/v1/mkt` | **DEAD** — 410 stub (B1) |

#### Domínios críticos (backend)

| Domínio | Status | Gap principal |
|---------|--------|---------------|
| Auth | READY | — |
| Anfitrião / acomodações | READY | Detalhe §§5–6 |
| Cotação → proposta → hub | READY | Checkout P0 entregue (#382–#384); E2E oferta→portal ainda PARTIAL |
| Pagamento | **READY** | P0 checkout B2C + webhooks + 0058 (#382–#384) |
| Booking E2E | PARTIAL | Falta suite oferta→pagamento→inventário→portal |
| Guest portal API | READY | — |
| CRM | READY | Poucos testes Jest de domínio |

#### Backend — pronto / falta / não implantado / melhorar

| Categoria | Itens |
|-----------|--------|
| **Pronto** | Auth v1, Fase1 CRUD, acomodações/anfitrião, cotação pública, propostas+WS, auctions, payments P0 (#382–#384), guest-portal, revenue, CRM, CMS, comissões, agentes, health/metrics |
| **Falta concluir** | — (B7 exporters lab opcional entregue) |
| **Não implantado** | Módulos pricing/cloud/comm/marketing no boot; `/api/core/token` legado |
| **Melhorar** | Remover ou montar DEAD modules com auth fail-closed; default `PORT=3002` no `server.js`; OpenAPI sincronizado com módulos vivos |

---

### 19.3 Site público (`rsv360-site-publico` :3000)

| Item | Valor |
|------|-------|
| Framework | Next.js 16 **App Router** |
| Rotas | ~125 `page.tsx` · ~249 BFF `app/api/**` |
| Auth | Cookies `auth_token` / `admin_token`; MFA admin; BFF → `:3002` |
| Modos | `public` \| `marketing-lab` (`RSV360_APP_MODE`) |

| Grupo | Status | Nota |
|-------|--------|------|
| Cotação / proposta / roteiro | READY | Crítico; rewrite para `:3002` |
| Auth user + admin MFA | READY | Enroll + TOTP |
| Landing / catálogo B2C | PARTIAL | Drift de porta `:5000` em hooks legados |
| Conta / reservas / check-in | PARTIAL | Depende BFF/DB |
| Marketing Lab (`/lab`, marketing, crm lab, pricing lab) | PARTIAL | MVP; A/B mock localStorage |
| Admin CMS / website ops | PARTIAL | Útil; demos teatro |
| Leilões / marketplace / insurance UI | LEGACY / teatro | Mocks |
| Legal | READY | Paths duplicados LEGACY |

| Categoria | Itens |
|-----------|--------|
| **Pronto** | Cotação/proposta/roteiro, auth+MFA admin, middleware CSRF, CMS núcleo |
| **Falta concluir** | Eliminar defaults `:5000`/`:3001`; group-travel tabelas; bookings B2C consistentes |
| **Não implantado / teatro** | A/B real, Serasa/OCR/smart-lock reais, split MP-MOCK como produção |
| **Melhorar** | Separar mentalmente Lab vs B2C; reduzir dashboards teatro no mesmo app |

---

### 19.4 Admin (`rsv360-admin` :3004)

| Item | Valor |
|------|-------|
| Framework | Next.js 16 **Pages Router** (~52 páginas) |
| Auth | Bearer v1 + refresh em `:3002`; **sem** login/MFA nativos neste app |
| API local | Só CSP report |

| Grupo | Status |
|-------|--------|
| Shell + dashboard hub | READY (navegação) |
| Housekeeping / CRM / Communication / Revenue / Properties | PARTIAL (API real; UI com hardcoded) |
| Fiscal / LGPD | PARTIAL |
| Fase1 thin (`/orcamentos` etc.) | PARTIAL — empty state aponta Turismo `:3005` |
| Cloud settings | MISSING (form sem save) |

| Categoria | Itens |
|-----------|--------|
| **Pronto** | Clients API CRM/HK/comm/properties quando backend UP |
| **Falta concluir** | Login dedicado ou deep-link MFA; persistência cloud; funis reais |
| **Não implantado** | MFA neste app; várias “new” screens superficiais |
| **Melhorar** | Remover funis/StaffWorkload fake; não duplicar Fase1 se Turismo é SoT CRUD |

---

### 19.5 Guest (`rsv360-guest` :3006)

| Item | Valor |
|------|-------|
| Framework | Next.js 16 Pages (~14 páginas) |
| Auth | Portal token → `/api/portal*` · `/api/guest-portal*` em `:3002` |

| Grupo | Status |
|-------|--------|
| Login / dashboard / check-in / mensagens / reservas | READY / PARTIAL |
| Serviços | PARTIAL (catálogo estático fallback) |
| Checkout / review | PARTIAL |
| Minhas propostas | MISSING (stub link `:3000`) |
| QR check-in | LEGACY (placeholder visual) |

| Categoria | Itens |
|-----------|--------|
| **Pronto** | Fluxo portal token + check-in/mensagens núcleo |
| **Falta concluir** | Serviços dinâmicos; propostas reais; QR real |
| **Não implantado** | MFA (N/A); deep features hotel |
| **Melhorar** | Remover stub minhas-propostas ou ligar a propostas reais |

---

### 19.6 Infra — Postgres / Redis / Observabilidade

| Serviço | Endereço | Config | Status | Gaps |
|---------|----------|--------|--------|------|
| Postgres | 127.0.0.1:5433 | `POSTGRES_*` + init SQL | READY | Healthcheck user/db hardcoded; exporter lab (`lab-exporters`) |
| Redis | 127.0.0.1:6379 | AOF inline | READY | Sem senha; exporter lab (`lab-exporters`) |
| Prometheus | :9090 | `monitoring/prometheus/*.yml` | READY | Scrape backend `/metrics`; `alerting.alertmanagers` → `alertmanager:9093` |
| Grafana | :3007 | `monitoring/grafana/**` | PARTIAL | 1 dashboard (conversão); sem healthcheck |
| Alertmanager | :9093 | `monitoring/alertmanager/alertmanager.yml` | READY (lab) | Null sink (sem webhook); ligado ao Prometheus (D1) |

**Prod (`docker-compose.prod.yml`):** sem Prometheus/Grafana/Alertmanager; Postgres/Redis sem publish de porta.

**Lab exporters (B7):** `docker compose --profile lab-exporters up -d` sobe `postgres-exporter` (:9187 interno) e `redis-exporter` (:9121 interno). Prometheus já tem scrape jobs; targets ficam DOWN até o profile estar ativo. **Ausente no compose prod.**

| Categoria | Itens |
|-----------|--------|
| **Pronto** | Postgres+Redis healthy gate; scrape backend com Bearer; Grafana→Prometheus; Alertmanager lab (D1); exporters lab opt-in (B7) |
| **Falta concluir** | receivers reais Alertmanager; obs no compose **prod** (GO) |
| **Não implantado** | Observabilidade no compose **prod**; multi-job scrape avançado |
| **Melhorar** | Mais dashboards; healthchecks nos monitores; alinhar healthcheck PG ao `.env` |

---

### 19.7 O que a stack tem pronto vs falta (visão sistema)

#### Pronto (núcleo operacional)

1. Backend Express canônico com Auth, Fase1, acomodações/anfitrião, cotação pública, propostas, portal guest  
2. Postgres + Redis na rede interna  
3. Site-publico: cotação/proposta/roteiro + MFA admin  
4. Turismo: produto Anfitrião (SoT §§5–6)  
5. Guest: portal token check-in/mensagens  
6. Métricas Prometheus do backend (lab)

#### Falta concluir (alta prioridade)

1. **Prometheus→Alertmanager** + receiver real  
2. Drift de portas no site-publico (`:5000`/`:3001`)  
3. Admin: login/MFA unificado ou documentar dependência do site-publico  
4. Guest: remover stubs (propostas/QR/serviços estáticos)  
5. Decisão explícita sobre módulos DEAD (pricing/cloud/comm/marketing)

#### Não implantado

1. Observabilidade na stack **prod** compose  
2. `/api/core/token` no backend canônico  
3. A/B marketing real, background-check/OCR/smart-lock reais  
4. `apps/atendimento-ia` (script existe, pasta não)

#### Melhorar (backlog stack)

| # | Ação | Impacto | Esforço |
|---|------|---------|---------|
| 1 | Ligar Alertmanager + webhook útil | Alto | Baixo |
| 2 | Arquivar ou montar DEAD modules | Alto | Médio |
| 3 | Booking E2E pago (sem PII) | Alto | Alto |
| 4 | Unificar auth admin (um lugar) | Médio | Médio |
| 5 | Limpar teatro site-publico/admin do caminho prod | Médio | Médio |
| 6 | Exporters Postgres/Redis | Médio | Médio |
| 7 | Guest QR + propostas reais | Médio | Médio |
| 8 | Default PORT 3002 no server.js | Baixo | Baixo |
| 9 | Tracking dedup Redis | Médio | Baixo |

### 19.8 Sequência sugerida (stack, pós-Turismo)

1. **Observabilidade lab** (Prometheus↔Alertmanager) — baixo risco  
2. **DEAD modules** — cortar clients ou montar com auth  
3. **Site-publico porta drift** + **Guest stubs**  
4. Continuar backlog Turismo (§14) em paralelo se produto host for prioridade

---

*Fim do documento Aruanda — RSV360 Turismo + Stack canônica.*
