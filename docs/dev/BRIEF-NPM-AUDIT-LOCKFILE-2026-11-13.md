# Brief — PR dedicada NPM Audit / lockfile (fora do escopo CRM Lintel)

**Data:** 13/11/2026  
**Contexto:** PRs **#517–#520** falham check **Security Scan / NPM Audit** com o mesmo padrão da base `develop` (não regressão das fatias de UI).

---

## Como o CI decide

1. **Validate lockfiles** — `.github/scripts/check-lockfiles.sh` (root + `backend`): `npm ci --dry-run` deve passar.
2. **NPM Audit** — `npm audit --omit=dev` + `.github/scripts/audit-gate.py` + `.github/audit-allowlist.json` (root, `backend`, `apps/site-publico`).

Workflow: `.github/workflows/security-scan.yml` (job `NPM Audit`).

---

## Hipóteses (ordenadas)

| # | Causa provável | Evidência a colher |
|---|----------------|-------------------|
| H1 | `package-lock.json` dessincronizado de `package.json` (root ou backend) | Log do step **Validate lockfiles** no Actions |
| H2 | Vulnerabilidade prod não allowlisted | Saída do `audit-gate.py` no job |
| H3 | Workspace `apps/site-publico` com audit distinto | Step **NPM Audit (frontend)** |

---

## Escopo sugerido da PR (mínimo)

- **Só lockfile/sync:** `npm install` controlado + `npm ci` verde localmente; **sem** `audit fix --force` sem review.
- **Só allowlist:** entrada documentada em `audit-allowlist.json` com issue de follow-up de upgrade.
- **Upgrade dirigido:** uma dependência por commit quando `audit-gate` apontar CVE concreta.

**Proibido na mesma PR:** CRM Lintel, Anfitrião, migrations destrutivas.

---

## Comandos (validação local)

```powershell
# Na raiz do repo (Git Bash ou WSL para o script shell)
bash .github/scripts/check-lockfiles.sh . backend

npm ci
npm audit --omit=dev
```

Backend:

```powershell
Set-Location backend
npm ci
npm audit --omit=dev
```

---

## Checklist PR

- [ ] Causa-raiz citada (log do Actions ou repro local)
- [ ] `check-lockfiles.sh` verde
- [ ] `audit-gate.py` verde ou allowlist justificada
- [ ] CI Security Scan verde na PR
- [ ] Blast radius: só `package.json` / `package-lock.json` / allowlist

---

## Risco

**Médio** — upgrades npm podem quebrar build/test; exige `npm run test`, `npm run build` (monorepo) antes do merge.
