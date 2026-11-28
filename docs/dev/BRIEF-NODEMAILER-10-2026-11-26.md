# Brief — nodemailer `10.0.6+` (security fatia)

**Data:** 26/11/2026  
**Base:** `develop` @ `961c5fa6` (pós-#600)  
**Origem:** follow-up de `NPM-AUDIT-CHORE-2026-11-26.md` — lock em `9.0.3` evitou `9.1.1` no dependency-review; advisories em 9.x exigem **10.0.6+**.

---

## Fase 0 — triagem

| Item | Valor |
|------|--------|
| Versão resolvida hoje (lock raiz) | `nodemailer@9.0.3` |
| Declarações | root `^9.0.1`, `backend` `^9.0.3`, `apps/site-publico` `^9.0.1` |
| Alvo | **`nodemailer@10.0.6`** (latest patch da major 10; `engines.node >=20`) |
| Tipos | v10 expõe `nodemailer.d.ts` — `@types/nodemailer@8` na raiz pode **duplicar** tipos (rever na PR) |
| Allowlist CI | `.github/audit-allowlist.json` → entrada `nodemailer` (expires 2026-12-31) — remover após audit limpo |

---

## Hipóteses (PACR)

1. **H1 (alta)** — GHSA em `<=9.1.x` sanadas ao fixar lock em `10.0.6+` nos três workspaces.  
2. **H2 (média)** — API `createTransport` / `sendMail` usada no repo permanece estável (sem breaking nos call sites).  
3. **H3 (média)** — `dependency-review` aceita bump explícito em `package.json` (evitar só lock, como em #598).  
4. **H4 (baixa)** — `apps/site-publico` mocks Jest de nodemailer continuam válidos.  

---

## Evidência read-only

| ID | Saída |
|----|--------|
| D1 | `npm view nodemailer@10.0.6` → version `10.0.6`, `engines.node >=20` |
| D2 | Call sites: `backend/.../password-reset-email.service.js`, `server/modules/communication/providers/email/nodemailer.provider.ts`, rental/coanfitrião invite, `apps/site-publico/lib/*` |
| D3 | `npx jest .../password-reset-email.service.test.ts` — **14/14 pass** (baseline pre-bump) |
| D4 | #598: `npm audit fix` sem force puxou `9.1.1` — motivo do pin `9.0.3` |

---

## Escopo PR (orientação ≤5 manifests + lock)

| Arquivo | Ação |
|---------|------|
| `package.json` (root) | `nodemailer` → `^10.0.6`; avaliar remover `@types/nodemailer` devDep |
| `backend/package.json` | `nodemailer` → `^10.0.6` |
| `apps/site-publico/package.json` | `nodemailer` → `^10.0.6` |
| `package-lock.json` | `npm install` (Node **24** preferido; evitar drift v26) |
| `.github/audit-allowlist.json` | remover key `nodemailer` se audit/gate verde |
| `docs/dev/NPM-AUDIT-CHORE-2026-11-26.md` | link para este brief (1 linha) |

**Fora do escopo:** Next bump, Zod 4, `audit fix --force`.

---

## Validação obrigatória

```powershell
npm ci
cd backend && npx jest src/__tests__/unit/password-reset-email.service.test.ts --runInBand
npm audit --workspace=backend
npm audit --workspace=apps/site-publico
npm run audit:gate
```

Opcional site-público: `npm test -w apps/site-publico` — suites que mockam `nodemailer`.

**Node:** CI/monorepo `engines` 24.x — alinhar ambiente local.

---

## Risco / blast radius

- **E-mail transacional:** password reset, convites coanfitrião, contrato rental sign, communication module SMTP, site-público tickets/credentials.  
- **Regression surface:** baixa se testes acima passam; mocks cobrem majority dos testes unitários.  
- **Blast radius lockfile:** alto diff (esperado); não misturar com E2E ou Sales.  
- **Automação:** `phase-config.json` em **initial** — agente documenta + patch; **PR humana** recomendada.

---

## Implementação (26 nov 2026)

- Branch: `chore/nodemailer-10.0.6`
- Lock resolve: `nodemailer@10.6.1` (`^10.0.6`)
- Removido `@types/nodemailer` (tipos embutidos na v10)
- `password-reset-email.service.test.ts`: **14/14**
- `npm audit` (root): sem entrada `nodemailer`
- Allowlist: entrada `nodemailer` removida