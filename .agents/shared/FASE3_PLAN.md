# FASE 3 — PLAN_REQUESTED

**Status:** PLAN_REQUESTED (sem execução / sem escrita de código de produto)  
**Fonte canônica:** `plano_rsv360.md` § FASE 3 — Tailwind  
**Orquestrador:** aguardando VALIDATED (G3.0+) antes de EXECUTING  
**Data:** 2026-09-21

## Checkpoints congelados

| Fase | Branch | SHA | Conteúdo |
|------|--------|-----|----------|
| FASE 0 | `fix/auth-refresh-contract` | `c42222848bf27bfcb38e50faecbf979d5fe5c240` | auth refresh (paralela — G2.5) |
| FASE 1 | `chore/fase1-safe-bumps` | `8dd5dd6b9d4b4d1c44c7015b4b2df09fa29d3478` | google-auth + docker actions |
| FASE 2 | `chore/fase2-node-setup-bumps` | `b8f328965c2852249729a04ab77486058b07b286` | setup-node v6 + Node 24 CI |
| main | `origin/main` | `8c9efe9dd35dd925c9509d44713feca8e8e8aa8f` | baseline |

**G2.5:** FASE 0 permanece **paralela**. Sem merge/cherry-pick/rebase nesta fase.

---

## 1. Objetivo exato

Conforme `plano_rsv360.md`:

> FASE 3 — Tailwind  
> - Branch `chore/tailwind-v4`  
> - Migrar por app conforme matriz real de compatibilidade  
> - Validar Oxide, plugins e tokens RSV360  
> - Smoke visual em cada app  

### Realidade descoberta (read-only) — crítica para escopo

Os apps Next **canônicos** já migraram para Tailwind **4.x CSS-first** na Trilha-0:

| App | Declaração atual | Entry | PostCSS | Evidence |
|-----|------------------|-------|---------|----------|
| `apps/guest` | `tailwindcss` ^4.3.1 · `@tailwindcss/postcss` ^4.3.3 | `@import 'tailwindcss'` + `@theme` | `@tailwindcss/postcss` | T0.15 GO |
| `apps/admin` | idem | idem | idem | T0.16 GO |
| `apps/site-publico` | idem | idem + `@theme inline` | idem | T0.21 GO |
| `apps/turismo` | idem | idem | idem | T0.22 GO |
| Oxide (lock) | `@tailwindcss/oxide` **4.3.3** | — | — | presente no lock |
| `apps/turismo/pages/reservei` | **`tailwindcss` ^3.3.0** | pacote aninhado (não-workspace) | — | **único residual TW3** |

**Consequência:** FASE 3 **não** deve reabrir migração completa dos 4 apps canônicos. O objetivo operacional torna-se:

1. **Fechar a matriz** Tailwind 4 (auditoria + validação Oxide/plugins/tokens + smoke).  
2. Decidir, via gate, se o residual **`reservei` (TW3)** entra nesta fase ou fica **explicitamente fora**.  
3. Evitar creep para FASE 4 (Dockerfiles / `engines.node`).

---

## 2. Branch proposta

| Campo | Proposta |
|-------|----------|
| Branch | `chore/tailwind-v4` (nome do plano canônico) |
| Commit-base **recomendado** | `b8f32896` (tip FASE 2) |
| Motivo | Continuidade da cadeia FASE 1→2→3; checkpoints empilhados |
| Alternativa | `origin/main` @ `8c9efe9d` — Tailwind é funcionalmente independente de CI/deps; Gate **G3.1** |

FASE 0 **fora** do base.

---

## 3. Relação com FASE 0

```text
origin/main
└── FASE 0  c4222284  (auth)  ← G2.5 MANTER PARALELO
```

- FASE 3 **não** toca AuthContext / refresh / api.ts.  
- Sem integração FASE 0.

---

## 4. Relação com FASE 1 + FASE 2

```text
origin/main
└── FASE 1  8dd5dd6b  (deps)
       └── FASE 2  b8f32896  (CI / Node 24)
              └── FASE 3  chore/tailwind-v4  [proposta empilhada]
```

- FASE 1/2 = deps Actions + Node em **workflows**.  
- FASE 3 = CSS/tooling Tailwind (camada distinta).  
- Empilhar em FASE 2 evita PR órfã; não implica misturar auth.

---

## 5. Arquivos potencialmente afetados

### Cenário A — Auditoria/fechamento (mínimo; recomendado se reservei ficar fora)

| Path | Motivo |
|------|--------|
| `apps/*/styles/globals.css` | somente se gap de token/plugin evidenciado |
| `apps/*/postcss.config.js` | somente se gap |
| `apps/*/package.json` + `package-lock.json` | alinhar `tailwindcss` ↔ `@tailwindcss/postcss` **se** Orquestrador autorizar (hoje 4.3.1 vs 4.3.3) |
| `.agents/shared/*` | CONTEXT / CURRENT_TASK / HANDOFF / FASE3_PLAN / evidência |

### Cenário B — Incluir residual `reservei` (somente se G3.2 = SIM)

| Path | Motivo |
|------|--------|
| `apps/turismo/pages/reservei/package.json` | TW3 → TW4 |
| CSS/config do pacote `reservei` (se existirem) | CSS-first + PostCSS |
| Possível lock local ou evidência “sem lock” (padrão H6) | documentar |

### Fora do escopo FASE 3 (explícito)

- Dockerfiles / `engines.node` → **FASE 4**  
- Auth / FASE 0  
- Bumps CI (`setup-node`, Node 24 workflows) já fechados  
- `@types/node`, `react-dropzone` (decididos na FASE 2)  
- Untracked: `Aruanda2.md`, `PROTOCOLO-*`, `test-compose.yml`  
- Refactor de componentes / redesign visual  
- Enterprise Rules / `.env` / migrations  

---

## 6. Análise de impacto

| Item | Impacto | Risco |
|------|---------|-------|
| Reabrir TW4 nos 4 apps canônicos | Alto blast; trabalho já GO | **Evitar** |
| Alinhar versões 4.3.1 ↔ 4.3.3 | Baixo–médio (lock) | Médio se lock crescer |
| Migrar `reservei` TW3→TW4 | Médio (app isolado, Next 15.5.21, React 18) | Médio — UI/build do atendimento |
| Smoke visual | Detecta regressão de token/utilitário | Baixo se checklist curto |
| Oxide nativo | Falha de install em CI/OS | Médio — validar `npm ls @tailwindcss/oxide` |

---

## 7. Dependências

- FASE 2 CLOSED (`b8f32896`) — OK  
- Evidence Trilha-0 T0.15–T0.22 — referência obrigatória  
- Decisão G3.1 (base) e G3.2 (reservei in/out)  
- **Não** depende de FASE 0  

---

## 8. Riscos

1. Escopo creep: “já que estamos no TW4, vamos migrar reservei + alinhar tudo + ajustar tokens”.  
2. Diff de lockfile grande sem necessidade.  
3. Smoke visual subjetivo sem checklist objetivo.  
4. Confundir FASE 3 com FASE 4 (runtime Node/Docker).  
5. Quebrar build de app canônico por “upgrade oportunista”.  

---

## 9. Fora do escopo (lista fechada)

- Dockerfiles; `engines.node`; health/E2E de produção (FASE 4)  
- Integração FASE 0  
- FASE 5 (hardening/negócio)  
- Correção oportunista de ESLint/Babel/`.next` types  
- Redesign / muda de design system além de preservação de tokens  

---

## 10. Baseline necessário (antes de editar)

1. `git status` + branch/base confirmados.  
2. Matriz versão (já acima) reconfirmada no tip escolhido.  
3. `npm ls tailwindcss @tailwindcss/postcss @tailwindcss/oxide` por workspace canônico.  
4. Build curto de pelo menos **um** app canônico (preferência: `site-publico`) **sem** alterar deps — prova de ambiente.  
5. Inventário tokens: grep `@theme` / `--color-` / brand em `globals.css`.  
6. Classificar `reservei` como IN ou OUT (Gate G3.2) **antes** de qualquer bump.

---

## 11. Testes e validações previstos

| ID | Validação |
|----|-----------|
| V1 | Matriz TW: zero `@tailwind base/components/utilities` nos apps canônicos |
| V2 | Oxide resolvido (versão alinhada ao postcss) |
| V3 | `npm run build` nos apps tocados (mínimo: apps com diff) |
| V4 | type-check **sem** `.next` nos workspaces tocados |
| V5 | Checklist smoke visual (desktop + 1 viewport mobile) por app tocado: home/login ou rota estável |
| V6 | Se reservei IN: build `apps/turismo/pages/reservei` + smoke da UI de atendimento |
| V7 | `git diff --check`; escopo file-list revisado |

---

## 12. Critérios objetivos

### PASS
- Escopo = apenas o autorizado em G3.2/G3.3  
- Apps canônicos permanecem TW4 CSS-first (ou melhoram só gaps evidentes)  
- Oxide/plugins/tokens validados com evidência  
- Builds/type-checks dos apps tocados PASS (ou FAIL pré-existente documentado)  
- Smoke checklist preenchido  
- FASE 0 intacta; untracked preservados; sem FASE 4  

### NEEDS_REWORK
- Diff fora da lista autorizada  
- Regressão visual/build causada pela FASE 3  
- Reabertura não autorizada de migração massiva dos 4 apps  
- Inclusão de Docker/`engines`/auth/untracked  

### VALIDATED
- Orquestrador revisa diff + evidências  
- Autoriza commit/push (G3.4)  

---

## 13. Estratégia de commit/push

1. Só após plano VALIDATED + execução VALIDATED.  
2. Mensagem sugerida (cenário A):  
   `chore(ui): close Tailwind v4 matrix audit and token/oxide checks`  
3. Se reservei IN: commit separado ou mesmo commit **somente** se Orquestrador permitir blast maior.  
4. Push da branch `chore/tailwind-v4`.  
5. **STOP** — sem FASE 4 no mesmo ciclo.  
6. Sem merge FASE 0/1/2/3.

---

## 14. Pontos de intervenção do Orquestrador

| Gate | Pergunta |
|------|----------|
| **G3.0** | Aprovar este plano? |
| **G3.1** | Base = FASE 2 tip `b8f32896` ou `origin/main`? |
| **G3.2** | Incluir migração `apps/turismo/pages/reservei` (TW3→TW4) **nesta** FASE 3? (recomendação: **NÃO** — fatia separada ou defer) |
| **G3.3** | Autorizar alinhamento de versões `tailwindcss`/`@tailwindcss/postcss` (4.3.1↔4.3.3) ou **somente auditoria** sem bump? |
| **G3.4** | Após execução: VALIDATED → commit/push? |
| **G3.5** | Integração futura com FASE 0 (permanece aberto; default = paralelo) |

### Recomendação do Executor (não vinculante)

- **G3.1:** base `b8f32896`  
- **G3.2:** **OUT** — `reservei` fica fora da FASE 3 (documentar residual)  
- **G3.3:** **auditoria-first**; bump de alinhamento só com evidência de incompatibilidade Oxide/plugin  

---

## 15. Estado solicitado

```text
FASE 3 — PLAN_REQUESTED
(não EXECUTING)
```

**Nenhuma alteração de código de produto da FASE 3 foi feita nesta mensagem.**
