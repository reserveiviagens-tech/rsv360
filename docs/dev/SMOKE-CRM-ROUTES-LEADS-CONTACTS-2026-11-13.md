# Smoke — rotas `/leads` e `/contacts` (demo Lintel)

**Data:** 13/11/2026  
**Pré-requisitos:** login parceiro (`docs/cotacao/TROUBLESHOOTING-LOGIN-LOCAL.md`), `npm run dev -w apps/turismo` em `:3005`

| # | URL | Esperado |
|---|-----|----------|
| L1 | `/leads` | Shell Lintel, lista + painel lateral; e-mail/telefone **mascarados** no detalhe |
| L2 | Busca leads | Filtra por nome/e-mail interno; UI não expõe `tel:`/`mailto:` completos |
| C1 | `/contacts` | Grid VIP; botões Ligar/Email sem PII em `href` |
| C2 | `AnfitriaoRoleGuard` | Visitante sem role → redireciono login |

**Veredito:** 🟢 após build `npm run build -w apps/turismo`.
