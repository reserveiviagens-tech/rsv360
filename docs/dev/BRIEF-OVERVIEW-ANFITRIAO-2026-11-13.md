# Brief — Overview Anfitrião (WIP local, fora do arco Opção 3)

**Data:** 13/11/2026  
**Estado:** ficheiros **untracked** no working tree; **não** em `origin/develop`.

---

## Objetivo

Página `apps/turismo/pages/overview.tsx` — cockpit unificado (Anfitrião + abas CRM) com dados reais (`useAnfitriao*`) e libs `overview-contacts` / `overview-portfolio`.

---

## Bloqueio atual (build)

```
pages/overview.tsx importa:
  useOverviewCarteiraVinculos
  useOverviewPortfolioUnits
→ export não existem em apps/turismo/src/hooks/useAnfitriao.ts
```

Enquanto `overview.tsx` existir localmente, `npm run build -w apps/turismo` **falha** (confirmado 13/11).

**Mitigação temporária:** renomear/mover WIP fora de `pages/` ou implementar hooks antes de build local.

---

## Ficheiros WIP (não commitar na mistura)

| Ficheiro | Função |
|----------|--------|
| `pages/overview.tsx` | Shell overview + `RSV360ExecutiveDashboard` |
| `pages/contacts.tsx`, `leads.tsx`, `rentals.tsx` | Rotas auxiliares (WIP) |
| `src/lib/overview-contacts.ts` | Mapeamento carteira → contactos |
| `src/lib/overview-portfolio.ts` | Unidades → pins / hero listings |
| `HANDOFF-CRM-OVERVIEW-2026-11-10.md` (docs) | Handoff parceiro |

**Stash:** `wip-unrelated-pre-3a` — não aplicar em massa sobre `develop` limpa.

---

## Fatia sugerida (1 PR)

1. Implementar hooks em `useAnfitriao.ts` (ou adapter server-side) com auth/RBAC existente.
2. Testes mínimos de hook ou API mock.
3. Commit **só** overview + libs + hooks; **sem** hex novo (reutilizar `lintel-theme.ts`).
4. Smoke: login anfitrião/corretor, `tab=deals|rentals|sales` sem regressão.

---

## Pré-requisitos

- Arco Opção 3 **fechado** (#517–#520).
- Smoke Sales/Rentals documentado (`SMOKE-CRM-SALES-RENTALS-2026-11-13.md`).

---

## Risco

**Alto** — auth, PII carteira, dashboard monolítico. Patch pequeno por PR; review humana obrigatória.
