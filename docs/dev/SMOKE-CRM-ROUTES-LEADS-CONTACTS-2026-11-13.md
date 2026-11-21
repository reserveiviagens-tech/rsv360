# Smoke — rotas `/leads` e `/contacts` (demo Lintel)

**Data:** 13/11/2026 (atualizado A1 — 20/11/2026)  
**Pré-requisitos:** login parceiro (`docs/cotacao/TROUBLESHOOTING-LOGIN-LOCAL.md`), `npm run dev -w apps/turismo` em `:3005`, backend com `GET /api/v1/leads` (JWT parceiro)

| # | URL | Esperado |
|---|-----|----------|
| H1 | `/overview?tab=deals` | Barra **Hub** (Deals/Leads/Contatos/Locações); Kanban deals ativo |
| H2 | `/overview?tab=leads&lead=l1` | Aba leads + card `l1` com destaque (ring) |
| H3 | `/deals?deal=<id>` | Redirect → `/overview?tab=deals&deal=<id>` |
| H4 | Nav Lintel Deals/Leads/Contatos | Href `/overview?tab=…` (não rotas órfãs) |
| H5 | `/overview?tab=leads` + login parceiro | Lista via API; badge **API**; PII mascarada; fallback demo se backend/auth falhar |
| H5b | `/overview?tab=leads&lead=<id>` | Destaque no card do lead da API (`?lead=` alinhado a `GET /api/v1/leads`) |
| H6 | `/overview?tab=contacts` | Carteira via overview; chips **Ver lead** / **Ver deal** quando pipeline associa nome → lead |
| H6b | `/overview?tab=contacts&contact=<id>` | Aba contacts + destaque no card (`carteira-*` id) |
| H7 | `/overview?tab=leads` → selecionar lead API → **Converter em deal** | Oportunidade criada; link **Ver no Kanban** → `tab=deals&deal=` |
| L1 | `/leads` | Redirect hub → `/overview?tab=leads` (preserva `?lead=`) |
| L1b | `GET /api/v1/leads` | 401 sem token; 200 corretor; `data.items[].email` com `•` |
| L1c | `/leads?lead=<id>` | Painel seleciona o lead correspondente |
| L1d | `POST /api/v1/leads` | 201 cria lead; resposta mascarada; modal Contatos persiste via API |
| L1e | `POST /api/v1/leads/bulk` | 1–25 itens; 201; replay 200 com `idempotencyKey`; UI **Importar lote** |
| D1 | `/deals?deal=<id>` | Modal/detalhe do deal aberto (id `deal_*` ou slug) |
| C3 | `/contacts` filtros pipeline | Favoritos / com lead-deal / sem vínculo; chips Ver lead · Ver deal |
| L2 | Busca leads | Filtra por nome/e-mail interno; UI não expõe `tel:`/`mailto:` completos |
| C1 | `/contacts` | Grid VIP; botões Ligar/Email sem PII em `href` |
| C2 | `AnfitriaoRoleGuard` | Visitante sem role → redireciono login |

**Veredito:** 🟢 após build `npm run build -w apps/turismo`.
