# Smoke — rotas `/leads` e `/contacts` (demo Lintel)

**Data:** 13/11/2026 (atualizado A1 — 20/11/2026)  
**Pré-requisitos:** login parceiro (`docs/cotacao/TROUBLESHOOTING-LOGIN-LOCAL.md`), `npm run dev -w apps/turismo` em `:3005`, backend com `GET /api/v1/leads` (JWT parceiro)

| # | URL | Esperado |
|---|-----|----------|
| L1 | `/leads` | Shell Lintel, lista da API (`Bearer`); fallback demo só se API falhar; PII mascarada no servidor |
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
