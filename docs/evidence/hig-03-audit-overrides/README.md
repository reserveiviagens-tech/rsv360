# HIG-03 — npm audit overrides (Security Scan BLOCK)

**GO:** `GO higiene @ main f1a9795218395a6948640093b5ebc3de30c287ff`  
**Branch:** `security/pr-hig-03-audit-overrides`  
**Alvo:** Security Scan vermelho em `main` (NPM Audit Gate BLOCK)

## Inventário (pré)

| Pacote | Antes (override/tip) | Depois |
|--------|----------------------|--------|
| `brace-expansion` | 5.0.7 | **5.0.9** |
| `minimatch` | 9.0.7 | **9.0.9** |
| `nanoid` | 3.3.12 | **3.3.18** |
| `ip-address` | 10.2.0 | **10.5.0** |
| `socket.io-parser` | 4.2.6 | **4.2.7** |

Allowlist inalterada: `engine.io-client` · `ws` · `xlsx`.

## Extra

- CodeQL **#4673**: remove import não usado `getJwtSecret` em `dpop.service.test.ts`.

## OUT

- Allowlist novas entradas
- Bump major de `socket.io` / Playwright / route-smoke
- VPS / 04b / 12c / 16d enforce

## Validação

```bash
npm audit --omit=dev --json > /tmp/audit-root.json
python .github/scripts/audit-gate.py /tmp/audit-root.json .github/audit-allowlist.json
# EXIT 0 — All critical/high fixed or allowlisted

cd backend && npx jest src/__tests__/unit/dpop.service.test.ts --forceExit --runInBand
```

## Risco

- Blast: overrides + lockfile; runtime Socket.IO / rate-limit IP parsing.
- Rollback: revert squash.

## Relação com higiene canônica

guest-portal/payments já fechados em H4. Playwright/route-smoke sem falha recente em `main` — esta fatia ataca o **único CI vermelho recorrente** (Security Scan).
