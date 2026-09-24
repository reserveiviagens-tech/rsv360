# RSV360 — PROTOCOLO DE EXECUÇÃO AUTÔNOMA
# CURSOR AI ↔ ANTIGRAVITY

**Versão:** 1.1  
**Escopo:** fases de execução governada (modelo FASE 4+)  
**Canal oficial:** `.agents/shared/`

## Agentes

| Papel | Agente | Função |
|-------|--------|--------|
| Tech Lead / Arquiteto / Orquestrador de política | **Antigravity** | plano, escopo, arquitetura, review, PASS/NEEDS_REWORK/BLOCKED, COMMIT_MANIFEST |
| Executor / Validator de código | **Cursor** | comandos, diff, testes, build, Docker, smoke, Git gates, commit/push **após** dual PASS |

Repositório = fonte operacional. Comunicação **somente** via artefatos compartilhados — não depender de o humano copiar mensagens entre IAs.

## Artefatos obrigatórios

| Arquivo | Função |
|---------|--------|
| `AUTONOMOUS_EXECUTION_PROTOCOL.md` | este protocolo |
| `AUTONOMOUS_POLICY.md` | o que pode ser automático por risco |
| `COMMIT_MANIFEST.md` | allowlist do próximo commit |
| `CURRENT_TASK.md` | tarefa ativa |
| `HANDOFF.md` | estado + próxima etapa + agente |
| `EXECUTION_LOG.md` | trilha cronológica |
| `FASE*_PLAN.md` / `FASE*_MATRIX.md` | plano e evidências da fase |

---

## 1. Regra fundamental

NÃO esperar cópia manual entre agentes.

Cada agente deve: ler estado → identificar última etapa → executar se for responsável → validar → registrar evidência → atualizar HANDOFF → continuar se a próxima etapa for sua.

- NÃO repetir trabalho já validado  
- NÃO apagar evidências  
- NÃO assumir conclusão sem evidência  
- NÃO confundir “pode executar” com “pode fazer qualquer coisa”

---

## 2. Papéis (detalhe)

### Antigravity
Interpretar plano; controlar arquitetura/escopo; impacto; sequência; revisar Cursor; auditoria; detectar scope creep; decidir PASS / NEEDS_REWORK / BLOCKED; produzir/atualizar `COMMIT_MANIFEST.md`; supervisionar Git; **não** substituir Cursor_REVIEW.

### Cursor
Comandos; inspeção; alterações **autorizadas**; testes; build; type-check; Docker; smoke; evidências; Git audit; commit/push **somente** se dual gate PASS conforme `AUTONOMOUS_POLICY.md`.

Cursor **não** amplia escopo, não inicia outra fase, não altera auth/FASE 0, não toca arquivos protegidos, não faz merge/rebase/cherry-pick/force-push.

---

## 3. Primeira ação obrigatória

Antes de alterar produto:

1. Ler `FASE*_PLAN.md`, `CURRENT_TASK.md`, `HANDOFF.md`, `EXECUTION_LOG.md`, este protocolo, `AUTONOMOUS_POLICY.md`  
2. `git status` · `git branch` · `git log -5` · `git diff`  
3. Confirmar **BASE** e **BRANCH** declaradas na tarefa  

Se base/branch inválidas: **BLOCKED — INVALID_BASE** (sem merge/rebase/cherry-pick automático).

---

## 4. Loop autônomo

```text
READ STATE → IDENTIFY NEXT STEP → CHECK RESPONSIBLE AGENT
→ EXECUTE → VALIDATE → RECORD EVIDENCE → UPDATE HANDOFF
→ READ NEW STATE → CONTINUE
```

Não pedir confirmação humana entre microetapas **autorizadas** pelo plano.

Parar apenas se: gate falhar · SCOPE_VIOLATION · INVALID_BASE · SECURITY_GATE_FAILURE · risco HIGH exigindo humano · fase CLOSED aguardando novo objetivo.

---

## 5. Classificação de evidência (runtime)

Separar sempre:

| Camada | Significado |
|--------|-------------|
| DECLARADO | Dockerfile / engines / .nvmrc |
| CONSTRUÍDO | `docker build` / artefato |
| EXECUTADO | container/processo + `node -v` medido |
| HEALTH | HTTP health real |
| SMOKE | fluxo mínimo real |

`docker build PASS` **≠** runtime saudável.  
`NOT_EXECUTED` **≠** PASS (registrar motivo).

---

## 6. Falhas

Classificar: REAL_REGRESSION | PRE_EXISTING | ENVIRONMENT_LIMITATION | CONFIGURATION_ERROR | SCOPE_ERROR | UNKNOWN  

Corrigir **somente** se pertencer à fase. Senão: residual documentado.

---

## 7. Scope creep — STOP imediato

Proibido sem gate explícito:

- `apps/turismo/pages/reservei` (OUT default)  
- FASE 0 / auth  
- FASE N+1 sem PLAN_REQUESTED  
- Untracked protegidos: `Aruanda2.md`, `docs/governance/PROTOCOLO-CONVIVENCIA-ANTIGRAVITY-CURSOR.md`, `test-compose.yml`  
- Secrets / `.env` real  
- Force push / merge / rebase / cherry-pick de FASE 0  

Se diff fora do escopo: **SCOPE_VIOLATION_DETECTED** → STOP.

---

## 8. Handoff estruturado (obrigatório)

Após cada etapa, atualizar `HANDOFF.md` / `CURRENT_TASK.md` / `EXECUTION_LOG.md` com:

```text
FASE:
ETAPA:
AGENTE:
STATUS:
AÇÃO EXECUTADA:
EVIDÊNCIA:
ARQUIVOS ALTERADOS:
ARQUIVOS PRESERVADOS:
PRÓXIMA ETAPA:
AGENTE RESPONSÁVEL:
BLOQUEIOS:
```

---

## 9. Dual review (dois pares de olhos)

Nenhum agente substitui a aprovação do outro.

```text
CURSOR_REVIEW = PASS
AND
ANTIGRAVITY_REVIEW = PASS
```

Sem ambos: **COMMIT_BLOCKED**.  
“Parece correto” sem evidência = inválido.  
“Não consegui o outro agente, sigo sozinho” = **PROIBIDO**.

---

## 10. Commit Manifest Gate

Antes de qualquer commit, Antigravity (ou sessão com ambos papéis documentados) preenche `COMMIT_MANIFEST.md`:

- Phase, Branch, Base  
- Allowed files (allowlist)  
- Forbidden files  
- Validation checklist  
- CURSOR_REVIEW / ANTIGRAVITY_REVIEW  
- Risk level (LOW|MEDIUM|HIGH)  

Cursor compara `git diff --name-only` / staged vs allowlist.  
Mismatch → **COMMIT_BLOCKED**.

Comandos mínimos pré-commit:

```bash
git status --short
git diff --name-only
git diff --stat
git diff --check
```

---

## 11. Gates de Git (C1 → C2 → C3)

### C1 — Commit (automático se política permitir)

Requer (conforme risco em `AUTONOMOUS_POLICY.md`):

- BASE_VALID, BRANCH_VALID, SCOPE_VALID  
- PROTECTED_FILES_UNTOUCHED  
- DIFF matches COMMIT_MANIFEST  
- Validações da fase (type-check/build/docker/health/smoke conforme aplicável)  
- CURSOR_REVIEW=PASS ∧ ANTIGRAVITY_REVIEW=PASS  

→ `git add` **somente** allowlist → `git commit`

### C2 — Push

- Commit SHA conhecido  
- Branch correta  
- Sem force  
- Manifest ainda válido no commit  

→ `git push -u origin HEAD` (sem `-f`)

### C3 — Pós-push

- `git fetch`  
- HEAD == `@{u}`  
- Working tree limpo exceto untracked protegidos  
- Registrar SHA em HANDOFF/EXECUTION_LOG  

CI vermelho crítico → **AUTONOMOUS_EXECUTION_STOPPED** (não iniciar próxima fase).

---

## 12. Estados de saída

| Estado | Significado |
|--------|-------------|
| `IMPLEMENTATION_COMPLETE_PENDING_REVIEW` | execução pronta; aguarda dual review / C1 (se humano ainda exigido) |
| `FASE_N_COMMIT_PUSH_COMPLETE` | C1–C3 PASS |
| `FASE_N_CLOSED` | fase encerrada |
| `*_BLOCKED` | gate falhou — não contornar |

---

## 13. Princípio final

Objetivo **não** é produzir mudanças.  
Objetivo é estado **tecnicamente comprovado**.

`AUDIT PASS` / `DOCUMENTATION ONLY` são resultados válidos.  
Não criar trabalho artificial.
