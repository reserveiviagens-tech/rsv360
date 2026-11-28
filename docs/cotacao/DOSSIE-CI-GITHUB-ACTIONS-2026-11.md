# Dossiê CI/CD — GitHub Actions (RSV360)

> **Data:** 2026-11-03  
> **Escopo:** falhas correlacionadas em `develop` após merges #510, #511, #512  
> **Fonte:** [Actions — reserveiviagens-tech/rsv360](https://github.com/reserveiviagens-tech/rsv360/actions)  
> **Commit referência:** `80022d97` (merge #512)

---

## 1. Resumo executivo

| Conclusão | Detalhe |
|-----------|---------|
| **Causa-raiz dominante (nov/2026)** | `npm ci` falha no **install lifecycle** do **`@playwright/browser-chromium`** porque o runner `ubuntu-latest` passou a reportar **`ubuntu26.04-x64`**, plataforma **não suportada** pela versão de Playwright no lockfile (~1.60–1.61). |
| **Efeito em cascata** | Jobs que executam `npm ci` na raiz **morrem no passo Install** — **não chegam** a testes, audit gate, E2E ou build. |
| **Não é regressão #510–#512** | Mesmo padrão em #510, #511, #512 e runs anteriores de `develop` quando o runner já era 26.04. |
| **Checks que passam** | CodeQL, Gitleaks, Dependency Review (PR), Trivy (quando o job chega a build de imagem). |
| **CD Staging** | Workflow **separado** (Docker build `--ignore-scripts` no Dockerfile) — pode **continuar** enquanto CI falha; **não garante** deploy do app **Turismo** (ver §5). |

---

## 2. Matriz de workflows × resultado (push `develop`, 2026-11-03)

| Workflow | Run (exemplo) | Resultado | Primeiro passo que falha | Mesma causa Playwright? |
|----------|---------------|-----------|--------------------------|-------------------------|
| **Security Scan** | [41661274979](https://github.com/reserveiviagens-tech/rsv360/actions/runs/41661274979) | fail | `NPM Audit` → Install dependencies (root) | **Sim** |
| **CI** | [41661275569](https://github.com/reserveiviagens-tech/rsv360/actions/runs/41661275569) | fail | Vários jobs → Install dependencies | **Sim** |
| **E2E Infra Smoke** | [41661275034](https://github.com/reserveiviagens-tech/rsv360/actions/runs/41661275034) | fail | `infra-smoke` → Install dependencies | **Sim** |
| **Fase 4 - Tests and Hardening** | [41661275169](https://github.com/reserveiviagens-tech/rsv360/actions/runs/41661275169) | fail | `backend-tests` → Install dependencies | **Sim** |
| **CodeQL Analysis** | 41661274992 | success | — | N/A |
| **Gitleaks** | 41661274980 | success | — | N/A |
| **CD - Staging Deployment** | [41661274962](https://github.com/reserveiviagens-tech/rsv360/actions/runs/41661274962) | variável | Docker / SSH | **Não** |

**Correlação:** quatro workflows falham no **mesmo passo** (`npm ci`) → **uma causa-raiz de infra**.

---

## 3. Evidência literal (causa-raiz)

```text
npm error Error: ERROR: Playwright does not support chromium on ubuntu26.04-x64
```

**Mecanismo:** postinstall de `@playwright/browser-chromium` durante `npm ci` na raiz (`package.json`: `playwright` ^1.60, `@playwright/test` ^1.61).

---

## 4. Histórico correlacionado

| Período | Observação |
|---------|------------|
| **2026-10-17** (#481) | Security Scan falhou em **`audit-gate.py`** — classe **B** (allowlist/CVE), não `ubuntu26.04`. |
| **2026-11-03** (#510–#512) | Falhas homogéneas Playwright — classe **A**. |

---

## 5. Staging vs Turismo (validação P0.5)

`cd-staging.yml` publica frontend com **`APP_DIR=apps/site-publico`**, não **`apps/turismo`**.

- **Backend** staging: deve expor APIs `/admin/carteira*`.
- **UI** `/anfitriao/admin/carteira-corretor`: validar no host Turismo (ex. local `:3005`) ou estender CD.

---

## 6. Plano de correção (P0)

**PR:** `fix/ci-playwright-skip-browser-download` — `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` nos jobs com `npm ci` raiz.

Arquivos: `security-scan.yml`, `ci.yml`, `e2e.yml`, `fase4-tests.yml`, `route-smoke.yml`.

Validação staging: `STAGING-VALIDACAO-CARTEIRA-P05.md`.

---

## 7. Pós-fix

```bash
# Windows
set PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
npm ci
cd backend && npx jest src/__tests__/unit/anfitriao-carteira-admin.routes.test.ts
```

Re-run: `gh run rerun <run-id> --failed`

---

*Sem secrets/PII. Ver também runbooks em `docs/cotacao/`.*
