# Brief — Next.js `16.4.6` (security patch)

**Data:** 26/11/2026  
**Base:** `develop` @ `7d42794c` (pós-#601 nodemailer)  
**Origem:** `NPM-AUDIT-CHORE-2026-11-26.md` — advisories **critical** em `next` até **16.4.4**; fix em **`16.4.6`**.

---

## Fase 0 — triagem

| Item | Valor |
|------|--------|
| Versão pinada (4 apps) | **`16.2.11`** — `turismo`, `admin`, `guest`, `site-publico` |
| `eslint-config-next` | **`16.2.11`** (mesmo pin nos 4 apps) |
| Alvo audit/npm | **`16.4.6`** (`npm view next` / `next@16.4.6`) |
| Override raiz | `package.json` → `overrides.next` (postcss, sharp) — **manter** após bump |
| Allowlist CI | `.github/audit-allowlist.json` → `next` (critical, expires 2026-12-31) |
| Exceção | `apps/turismo/pages/reservei/package.json` → `next@15.5.21` (legado aninhado) — **fora do escopo** ou micro-bump isolado |

---

## Hipóteses (PACR)

1. **H1 (alta)** — Bump `16.2.11` → `16.4.6` + `eslint-config-next@16.4.6` limpa CVEs critical do `npm audit --workspace=apps/turismo`.  
2. **H2 (média)** — `npm run build:turismo` passa sem alteração de código (patch minor na mesma major 16).  
3. **H3 (média)** — `sharp@0.35.3` pin em turismo compatível com Next 16.4.6 (já alinhado ao override).  
4. **H4 (baixa)** — `@next/bundle-analyzer@16.4.5` pode subir para `16.4.6` por consistência (devDep turismo).  

---

## Escopo PR sugerido

| Arquivo | Ação |
|---------|------|
| `apps/turismo/package.json` | `next` + `eslint-config-next` → `16.4.6`; opcional `@next/bundle-analyzer` |
| `apps/admin/package.json` | idem |
| `apps/guest/package.json` | idem |
| `apps/site-publico/package.json` | idem |
| `package-lock.json` | `npm install` (Node **24**) |
| `.github/audit-allowlist.json` | remover `next` se gate limpo |
| `docs/dev/NPM-AUDIT-CHORE-2026-11-26.md` | link para este brief |

**Fora do escopo:** Zod 4, `eslint-config-next` 15.x downgrade (audit force), `pages/reservei` nested 15.5.21.

---

## Validação obrigatória

```powershell
npm ci
npm run build:turismo
npm run build --workspace=apps/admin    # se tempo
npm audit --workspace=apps/turismo
npm run audit:gate
npm run lint --workspace=apps/turismo  # opcional se CI já roda
```

Smoke manual (pós-build ou dev): `/overview`, `/login`, image/og routes se usados em prod.

---

## Risco / blast radius

- **Runtime:** SSR, middleware, image optimization, App/Pages router em 4 frontends.  
- **Breaking risk:** patch 16.2 → 16.4 — **médio**; ler [Next.js release notes 16.3 / 16.4](https://github.com/vercel/next.js/releases).  
- **Rollback:** revert PR + `npm ci`.  
- **CI:** dependency-review + monorepo build jobs.

---

## Branch / gate

- Branch: `chore/next-16.4.6-security` off `develop`  
- 1 fatia → 1 PR → gate CI antes da próxima tarefa (Kanban B).

---

## Evidência D1 (26/11/2026)

`npm audit --workspace=apps/turismo` lista `next 9.3.4-canary.0 - 16.4.4` **critical** (GHSA-p293, GHSA-2xp9, GHSA-vcvr, …). Fix targeted: **16.4.6**.

## Implementação (26 nov 2026)

- Branch: `chore/next-16.4.6-security`
- `next` / `eslint-config-next` **16.4.6** nos 4 apps; `@next/bundle-analyzer` **^16.4.6**
- `npm run build:turismo`: **OK** (~81s local)
- Critical em `next` resolvido no grafo instalado; audit raiz ainda lista `next` **high** (via postcss/sharp) — allowlist atualizada para `high`