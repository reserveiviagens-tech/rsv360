# RSV360 — AUTONOMOUS_POLICY

**Versão:** 1.0  
**Complementa:** `AUTONOMOUS_EXECUTION_PROTOCOL.md`

## Objetivo

Permitir commit/push **automáticos** sem abrir mão de governança: trocar *human gate* por *policy gate* verificável — exceto risco HIGH.

## Níveis de risco

### LOW
Documentação, metadata, bridge `.agents/shared/*` (protocolo, handoff, evidência), comentários sem lógica.

**Auto:** commit + push se C1–C3 PASS e dual review PASS.

### MEDIUM
CI, Docker, runtime, dependências pontuais, config de tooling, auditorias com evidência (modelo FASE 1–4).

**Auto:** commit + push se:
- dual review PASS
- COMMIT_MANIFEST match
- validações da fase PASS (ou NOT_EXECUTED aceito **explicitamente** no manifesto pelo Antigravity)
- sem scope creep
- protected files intactos

### HIGH
Auth, pagamentos, banco/migrations, secrets, produção, RBAC, infraestrutura crítica, mudança de política enterprise.

**Auto execução de código:** somente com plano VALIDATED.  
**Commit/push:** exige **aprovação humana explícita** na sessão (`COMMIT_AUTHORIZED` / token do owner quando a política enterprise exigir).  
Agentes **não** auto-aprovam HIGH.

## Arquivos sempre proibidos no stage (salvo ordem humana explícita)

- `Aruanda2.md`
- `docs/governance/PROTOCOLO-CONVIVENCIA-ANTIGRAVITY-CURSOR.md`
- `test-compose.yml`
- `.env` e quaisquer secrets/credenciais
- arquivos de política enterprise protegidos (exigem token do owner na mensagem)

## Operações Git sempre proibidas

- `git push --force` / `-f`
- merge/rebase/cherry-pick de FASE 0 sem gate
- commit direto em `main` / `develop`
- auto-merge de PR

## Dual review

```text
COMMIT_ALLOWED =
  CURSOR_REVIEW == PASS
  AND ANTIGRAVITY_REVIEW == PASS
  AND MANIFEST_MATCH == true
  AND RISK_POLICY_ALLOWS_AUTO == true
```

Qualquer `false` → STOP (`COMMIT_BLOCKED`). Sem bypass.

## Fases encerradas

Após `FASE_N_CLOSED`: **não** reabrir nem “melhorar” oportunisticamente.  
Próxima fase só com `PLAN_REQUESTED` + aprovação de plano (G*.0).

## Classificação padrão (referência)

| Fase típica | Risco |
|-------------|-------|
| Docs / protocolo / evidência | LOW |
| Deps CI / Docker Actions / TW audit / Node runtime audit | MEDIUM |
| Auth refresh / pagamentos / migrations | HIGH |
