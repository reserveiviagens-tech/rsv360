# FASE 3 — Matriz Tailwind v4 (auditoria)

**Branch:** `chore/tailwind-v4`  
**Base:** `b8f328965c2852249729a04ab77486058b07b286`  
**Modo:** G3.3 auditoria-first · G3.2 reservei OUT  
**Data:** 2026-09-21

## Critério desta fase (Orquestrador)

> Os apps/módulos incluídos na matriz **canônica** desta fase permanecem/operam corretamente em TW4; o residual `apps/turismo/pages/reservei` é identificado, documentado e **deliberadamente não alterado**.

**Não** é critério: “zero Tailwind v3 no repositório”.

---

## Matriz canônica (IN scope)

| App | package.json | Resolvido (lock/npm ls) | CSS-first | PostCSS | Plugins | Tokens | Oxide |
|-----|--------------|-------------------------|-----------|---------|---------|--------|-------|
| `apps/guest` | tw `^4.3.1` · postcss `^4.3.3` | tw **4.3.3** · postcss **4.3.3** | `@import 'tailwindcss'` · `@theme` · `@source` · `@custom-variant dark` | `@tailwindcss/postcss` | — | `brand-*`, `--shadow-soft` | **4.3.3** |
| `apps/admin` | idem | **4.3.3** / **4.3.3** | `@import 'tailwindcss'` · `@source` · dark | `@tailwindcss/postcss` | — | utilitários padrão (sem `@theme` custom) | **4.3.3** |
| `apps/site-publico` | + `tw-animate-css` `^1.4.0` | **4.3.3** / **4.3.3** | `@import` + `@theme` / `@theme inline` | `@tailwindcss/postcss` | `tw-animate-css` | shadcn CSS vars + theme | **4.3.3** |
| `apps/turismo` | + `tw-animate-css` `^1.4.0` | **4.3.3** / **4.3.3** | `@import` + `@theme` / `@theme inline` | `@tailwindcss/postcss` | `tw-animate-css` | shadcn + accent tokens | **4.3.3** |

### Controles negativos (canônicos)

| Check | Resultado |
|-------|-----------|
| `@tailwind base/components/utilities` em CSS canônico | **ausente** (apenas menção em MD legado `DIAGNOSTICO_SERVIDOR*.md`) |
| `tailwind.config.*` nos 4 apps | **ausente** (CSS-first) |
| Alinhamento 4.3.1↔4.3.3 via bump | **não necessário** — range `^4.3.1` resolve 4.3.3; Oxide alinhado |

Evidence Trilha-0 prévia: T0.15 guest · T0.16 admin · T0.21 site-publico · T0.22 turismo = GO.

---

## Residual conhecido (OUT scope — G3.2)

| Path | Declaração | Decisão FASE 3 |
|------|-----------|----------------|
| `apps/turismo/pages/reservei` | `tailwindcss` **^3.3.0** | **Não migrar**. Documentado. Permanência ≠ falha desta fase. |

---

## Oxide

| Pacote | Versão lock |
|--------|-------------|
| `@tailwindcss/oxide` | 4.3.3 |
| `@tailwindcss/oxide-win32-x64-msvc` | 4.3.3 |
| `@tailwindcss/postcss` | 4.3.3 |

---

## Decisão G3.3

**Sem bump** de `tailwindcss` / `@tailwindcss/postcss` nos package.json: evidência objetiva mostra resolução já coerente (4.3.3) e Oxide alinhado. Nenhum gap de incompatibilidade encontrado que justifique alteração de código de produto.

---

## Validação runtime (FASE 3)

| Check | Resultado |
|-------|-----------|
| type-check sem `.next` — guest | exit **0** |
| type-check sem `.next` — admin | exit **0** |
| type-check sem `.next` — site-publico | exit **0** |
| type-check sem `.next` — turismo | exit **0** |
| build — guest | exit **0** |
| build — admin | exit **0** |
| build — site-publico | exit **0** |
| build — turismo | exit **0** |

### Smoke visual (checklist)

| App | Rota | Desktop | Mobile ~390px | Resultado |
|-----|------|---------|---------------|-----------|
| guest | `/login` :3011 | layout TW (brand/slate, cards, form) | tipografia/cards OK | **PASS** |
| admin | login UI | card admin + botão primary | render OK (via :3000/admin/login no ambiente) | **PASS** |
| site-publico | `/` :3013 | home renderizada (nav, busca, CTAs) | conteúdo ok; clip/overlap header pré-existente observado | **PASS** (sem regressão FASE 3 — zero diff CSS) |
| turismo | `/login` :3014 | login RSV 360° | — | **PASS** |

**Nota:** `site-publico` `next start` exige `JWT_SECRET` (fail-closed). Smoke usou placeholder de processo **sem** ler/editar `.env`.

---

## Código de produto alterado nesta fase

**Nenhum.** Auditoria-first + evidência suficiente → sem patch de CSS/deps.
