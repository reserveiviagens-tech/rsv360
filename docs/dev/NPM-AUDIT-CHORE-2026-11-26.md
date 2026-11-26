# Chore — `npm audit fix` lockfile (pós-Lintel #597)

**Data:** 26/11/2026  
**Branch:** `chore/audit-deps`  
**Escopo:** apenas `package-lock.json` na raiz (resoluções compatíveis com semver; **sem** `npm audit fix --force`).

---

## Objetivo

Reduzir vulnerabilidades reportadas no workspace `apps/turismo` com atualizações **não-breaking** no lockfile, após merge do bloco Lintel 1–5 (#597).

---

## Baseline × pós-chore (workspace turismo)

| Métrica | Antes (sessão audit) | Depois (`npm audit --workspace=apps/turismo`) |
|---------|----------------------|------------------------------------------------|
| Total   | 29                   | **21** (14 moderate, 6 high, 1 critical)       |

Comando de reprodução:

```powershell
npm audit --workspace=apps/turismo
```

---

## O que foi aplicado

- `npm audit fix` (sem `--force`) na árvore lockfile já regenerada.
- **Não** incluído: bumps de **Next** para 16.4.6+ via force, **Zod 4**, downgrades/upgrades breaking de `eslint-config-next`.
- **CI Dependency Review:** `npm audit fix` puxou `nodemailer@9.1.1` no lockfile (GHSA novas). Lock mantém **`9.0.3`** (igual `develop`); **não** alterar declaração em `package.json` (pin/override na raiz dispara PR-09b). Follow-up: **`nodemailer@10.0.6+`** — ver **`BRIEF-NODEMAILER-10-2026-11-26.md`**.

---

## Itens em aberto (PRs futuras)

### Critical — Next.js (transitivo / faixa auditada)

Turismo declara `"next": "16.2.11"` em `apps/turismo/package.json`. O relatório `npm audit` ainda lista advisories na faixa **9.3.4-canary.0 – 16.4.4**, incluindo:

- [GHSA-p293-qw3h-jr36](https://github.com/advisories/GHSA-p293-qw3h-jr36) — RCE (Windows-hosted)
- [GHSA-2xp9-vwfh-vxw4](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) — RCE Image Optimization (AVIF)
- [GHSA-vcvr-r3jv-pc5j](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j) — RCE `next/og` ImageResponse
- (e demais GHSA listados no output completo de `npm audit --workspace=apps/turismo`)

**Plano:** PR dedicada `chore: bump next@16.4.x` (ou patch mínimo após release notes) + `build:turismo` + smoke; alinhar com `.github/audit-allowlist.json` / `npm run audit:gate` se necessário.

### High — Zod, sharp, brace-expansion (tooling/eslint)

- **Zod** &lt; 4.6.6 — [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5); fix force → Zod 4 (breaking).
- **sharp** — GHSA via libheif/librsvg; frequentemente resolvido com bump de **Next** / sharp pin.
- **brace-expansion** — cadeia eslint/typescript-eslint; monitorar upgrades de devDeps.

### Ambiente — EBADENGINE (não é CVE)

- Monorepo: `engines.node` **>=24 &lt;25** (ver root `package.json`).
- Ambiente local de desenvolvimento desta sessão: **Node v26** + npm 11 — gera `EBADENGINE` e lockfiles diferentes dos do CI.
- **CI/local canônico:** Node **24** + npm **10.x** (conforme `BRIEF-NPM-AUDIT-LOCKFILE-2026-11-13.md`).

---

## Fora do escopo deste PR

- `packages/shared/dist/*` — artefato de build; não commitar mudanças acidentais.
- Overview **P5+** (Sales API) — após merge deste chore + gate CI.

---

## Validação esperada

```powershell
bash .github/scripts/check-lockfiles.sh . backend   # quando disponível
npm ci
npm run build:turismo
npm audit --workspace=apps/turismo
npm run audit:gate   # gate monorepo
```

---

## Rollback

Reverter merge: `git revert <merge-commit>` ou restaurar `package-lock.json` de `develop` anterior + `npm ci`.

---

## Referências

- `docs/dev/BRIEF-NPM-AUDIT-LOCKFILE-2026-11-13.md` — política CI / allowlist
- Handoff CRM: `docs/dev/HANDOFF-CRM-DEALS-2026-11-25.md` (backlog P5+ após audit)