# Enterprise Automation — Setup no Cursor (v2)

Configuração do template **Find critical bugs** com **Enterprise Automation Rules v2 — RSV360**: operação ampla, robusta e multidisciplinar, com **autonomia controlada por guardrails** (nunca irrestrita).

## Pré-requisitos

1. Repositório no GitHub: `ReserveiViagens/PMS-CRM-RSV360-Versao-Oficial-definitivo`
2. Comandos na raiz: `npm run lint`, `npm run test`, `npm run build`, `npm run type-check`
3. Branch protection conforme `.github/BRANCH_PROTECTION.md`

## Estrutura de hooks (JSON + scripts separados)

```
.cursor/
  hooks.json                          ← apenas referencia scripts
  hooks/
    enterprise-guardrails.cjs         ← shell: deploy, SQL, .env
    protect-enterprise-files.cjs      ← Write/StrReplace em paths protegidos
    lib/
      enterprise-policy.cjs           ← paths, tokens, helpers compartilhados
```

O `hooks.json` **não contém lógica JavaScript** — só chama `node .cursor/hooks/*.cjs`.

## Pacote de regras v2

| Arquivo | Conteúdo |
|---------|----------|
| `enterprise-agent-boundaries.mdc` | Autonomia, arquivos protegidos, tokens |
| `enterprise-security.mdc` | Auth, RBAC, OWASP, rate limit |
| `enterprise-lgpd.mdc` | Dados pessoais, mascaramento, auditoria |
| `enterprise-database.mdc` | Migrations, transações, DELETE seguro |
| `enterprise-booking-rules.mdc` | Reservas, preço, cupom, double booking |
| `enterprise-design-system.mdc` | Tokens, a11y, estados UI |
| `enterprise-testing.mdc` | Matriz de testes por tipo de mudança |
| `enterprise-pr-policy.mdc` | Checklist obrigatório de PR |
| `enterprise-ci-slice-gate.mdc` | Gate CI: verificar/analisar/corrigir antes da próxima fatia |
| `enterprise-architecture.mdc` | Camadas e domínio turismo/CRM/PMS |
| `enterprise-project-rules.mdc` | Regras gerais |
| `enterprise-automation-guardrails.mdc` | Fases da automation |

Contrato central: **`AGENTS.md`**

## Arquivos protegidos contra edição do agente

Bloqueados por hook `preToolUse` e política, salvo token do owner:

- `.cursor/rules/**`
- `.cursor/automations/**`
- `.cursor/hooks.json`, `.cursor/hooks/**`
- `AGENTS.md`, `MEMORIES.md`
- `docs/cursor/ENTERPRISE-AUTOMATION-SETUP.md`

**Tokens de desbloqueio** (literal na mensagem do owner):

- `ALTERAR_ENTERPRISE_RULES_V2`
- `REVOGAR_PACR_AMPLA_V1`

## Passo a passo no Cursor

### 1. Criar a Automation

1. **Cursor → Automations → Find critical bugs**
2. Nome: `Enterprise Bug Finding RSV360 v2`
3. **Instructions:** copiar de `.cursor/automations/find-critical-bugs-instructions.md` (abaixo do `---`)

### 2. Gatilho por fase

| Fase | `currentPhase` | Gatilho |
|------|----------------|---------|
| Inicial | `initial` | 1× por dia |
| Intermediária | `intermediate` | Push em `develop` |
| Produção | `production` | Push `main`/`develop` + PRs |

Editar `"currentPhase"` em `.cursor/automations/phase-config.json`.

### 3. Saídas

- Resumo no Cursor: **sim**
- PR no GitHub: a partir de `intermediate` — **sem auto-merge**
- Slack: opcional

### 4. Nunca habilitar

- Auto-merge
- Deploy automático
- Agente sem hooks
- Edição de `.env`/secrets pela automation

## Validar hooks localmente

```powershell
cd "C:\Users\RSV 360\Documents\s2-fase-e-clean"

# Shell: bloqueia force push
'{"command":"git push --force origin main"}' | node .cursor/hooks/enterprise-guardrails.cjs

# Tool: bloqueia edit de AGENTS.md sem token
'{"tool_input":{"path":"AGENTS.md"}}' | node .cursor/hooks/protect-enterprise-files.cjs

# Tool: permite com token
'{"user_message":"ALTERAR_ENTERPRISE_RULES_V2","tool_input":{"path":"AGENTS.md"}}' | node .cursor/hooks/protect-enterprise-files.cjs
```

Reinicie o Cursor após alterar `hooks.json`. Verifique **Settings → Hooks**.

## CODEOWNERS e branch protection

- `.github/CODEOWNERS` — review obrigatório em `.cursor/` e `AGENTS.md`
- `.github/BRANCH_PROTECTION.md` — checklist para `main`/`develop`

## Checklist go-live v2

- [ ] `rulesVersion: v2` em `phase-config.json`
- [ ] Hooks carregados e testados
- [ ] Auto-merge desligado (Cursor + GitHub)
- [ ] Branch protection ativa em `main`
- [ ] Prompt v2 colado na automation
- [ ] `MEMORIES.md` sem duplicatas de PRs abertas
