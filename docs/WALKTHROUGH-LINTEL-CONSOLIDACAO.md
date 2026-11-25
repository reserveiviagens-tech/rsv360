# Walkthrough — Consolidação Lintel RSV360°

> Matriz dual-repo + backlog de fatias. Monorepo: `reserveiviagens-tech/rsv360` (`develop`).

## Matriz dual-repo (resumo)

| Dimensão | Versão oficial | Monorepo develop | Ação |
|----------|----------------|------------------|------|
| ORM | Prisma | Drizzle (`backend/src/db/schema/*`) | Manter Drizzle |
| Tokens Lintel | `packages/tokens` | `apps/turismo/components/lintel/` | **Fatia 1** — extender Lintel |
| Comissões `paid` | módulo oficial | `server/modules/comissoes/services/comissoes.service.ts` | **Fatia 4** — diff cirúrgico |
| Carteira CSV | csv-importer | parcial (`carteira-corretor`) | **Fatia 2** — port |
| Rio Quente / Aviva | proposta-rio-quente | ausente | **Fatia 3** — port |
| Testes | 12× `.mjs` | harness monorepo | **Fatia 5** — Jest/vitest turismo |
| Pastas UI | `src/pages` | `pages/` + `components/` | Sem pasta `src/` extra |

## Fatias (1 PR → CI → review humana)

| Fatia | Escopo | Status develop |
|-------|--------|----------------|
| 1 | `lintel-tokens.css`, `tokens.ts`, `DenseTable`, `KpiZeigarnikCard`, `StickyBottomBar` | ✅ **#593** |
| 2 | CSV carteira corretores | **Em PR** |
| 3 | Propostas Rio Quente / Aviva | backlog |
| 4 | Comissões `status === 'paid'` | backlog |
| 5 | Testes no harness | backlog |

## Fatia 1 — consumo

```tsx
import { DenseTable, KpiZeigarnikCard, StickyBottomBar } from '@/components/lintel/lintel-dense-ui';
```

CSS carregado via `apps/turismo/styles/globals.css` → `lintel-tokens.css`.