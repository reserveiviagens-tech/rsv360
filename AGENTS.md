# AGENTS.md — Contrato Central dos Agentes (RSV360)

> Leia antes de qualquer ação. Documento vinculante para agentes de IA, automations Cursor e revisores.

## Modelo operacional

**PACR-Ampla v1.0** — Protocolo de Análise de Causa Raiz **Ampla, Robusta e Multidisciplinar**, com **autonomia controlada por guardrails**.

Não operar como agente irrestrito. Amplitude de investigação ≠ permissão para alterar qualquer arquivo, deploy, secrets ou política enterprise.

Documento-fonte PACR: https://www.notion.so/PACR-Ampla-Protocolo-de-An-lise-de-Causa-Raiz-Ampla-Irrestrita-e-Robusta-d02ab82ed3ed4ecebe8f0dfeca6d7ca6?pvs=21

*(O link Notion mantém o nome histórico; no repositório usamos **ampla com guardrails**.)*

---

## Pacote Enterprise Automation Rules v2

| Regra | Arquivo |
|-------|---------|
| Boundaries e tokens | `.cursor/rules/enterprise-agent-boundaries.mdc` |
| Projeto (geral) | `.cursor/rules/enterprise-project-rules.mdc` |
| Automação / fases | `.cursor/rules/enterprise-automation-guardrails.mdc` |
| Segurança | `.cursor/rules/enterprise-security.mdc` |
| Arquitetura | `.cursor/rules/enterprise-architecture.mdc` |
| LGPD | `.cursor/rules/enterprise-lgpd.mdc` |
| Banco de dados | `.cursor/rules/enterprise-database.mdc` |
| Reservas / turismo | `.cursor/rules/enterprise-booking-rules.mdc` |
| Design system | `.cursor/rules/enterprise-design-system.mdc` |
| Testes | `.cursor/rules/enterprise-testing.mdc` |
| Política de PR | `.cursor/rules/enterprise-pr-policy.mdc` |
| Gate CI por fatia | `.cursor/rules/enterprise-ci-slice-gate.mdc` |

Automação Cursor: `.cursor/automations/phase-config.json` · Setup: `docs/cursor/ENTERPRISE-AUTOMATION-SETUP.md` · Memória: `MEMORIES.md`

---

## Princípios não negociáveis (PACR-Ampla)

1. Read-only first: nenhum patch antes de evidência consolidada.
2. Hipóteses antes de evidência: documente 3–5 hipóteses ordenadas por probabilidade.
3. Evidence-driven: descarte hipóteses com saída concreta.
4. Defesa em profundidade: bug em X exige grep do padrão no codebase relevante.
5. Camadas separadas: SSR ≠ CSR ≠ API ≠ service ≠ DB ≠ infra ≠ CI.
6. Símbolo não é causa-raiz: não pule etapas.
7. Patch mínimo cirurgico: escopo pequeno, blast radius mapeado.
8. Documentar enquanto investiga: registre D1, D2, … com saída literal.

## Workflow obrigatório

Fase 0 Triagem → Fase 1 Hipóteses → Fase 2 Evidência read-only → Fase 3 Causa-raiz → Fase 4 Defesa em profundidade → Fase 5 Patch + validação.

### Gate CI por fatia (obrigatório)

Entrega incremental: **1 fatia → 1 PR → verificar/analisar/corrigir CI → merge (humano) → só então próxima fatia**.

Ver `.cursor/rules/enterprise-ci-slice-gate.mdc`. Proibido iniciar a próxima fatia/tarefa com checks críticos vermelhos sem plano ou PR de correção (salvo dispensa explícita do owner).

## Guardrails enterprise (todos os agentes)

- **Sem** auto-merge, deploy automático ou push force em branch protegida
- **Sem** editar `.env`, secrets, credenciais ou infra de produção
- **Sem** apagar dados de produção ou SQL destrutivo sem confirmação do owner
- **Sem** alterar arquivos enterprise protegidos sem token (ver abaixo)
- PR do agente: escopo pequeno, testes, revisão humana obrigatória
- **Sem** pular o gate CI por fatia (`enterprise-ci-slice-gate.mdc`)

## Arquivos protegidos

Alteração bloqueada por hooks e política, salvo token do owner na mensagem:

- `.cursor/rules/**`, `.cursor/automations/**`, `.cursor/hooks/**`, `.cursor/hooks.json`
- `AGENTS.md`, `docs/cursor/ENTERPRISE-AUTOMATION-SETUP.md`

**`MEMORIES.md` (política especial):**

- A automação **Find critical bugs** pode atualizar apenas achados ativos/rejeitados recentes.
- **Proibido** gravar secrets, tokens, CPF, telefone, e-mail de cliente, cookies, `.env`, chaves privadas ou dados pessoais sensíveis.
- Alterações estruturais ou de política em `MEMORIES.md` exigem token do owner.

**Tokens:**

- `ALTERAR_ENTERPRISE_RULES_V2` — alterar política enterprise
- `REVOGAR_PACR_AMPLA_V1` — revogar PACR-Ampla (owner)

## Domínios críticos deste sistema

Turismo, PMS, CRM, reservas, disponibilidade, preço, cupom, pagamento, cliente, admin, multiusuário, concorrência, double booking, confirmação, cancelamento, auditoria e LGPD.

Consulte regras modulares v2 para detalhes por área.

## Proibições

- Patch antes das Fases 0–3 (PACR)
- Pular Fase 4 (defesa em profundidade)
- `as any` em retornos de framework; catch silencioso retornando vazio
- Push em branch protegida sem CI verde
- Mais de 1 camada em 1 PR sem racional explícito
- Comandos destrutivos sem confirmação
- Commit com `.env`, secrets, tokens ou chaves privadas

## Obrigações

- Grep do anti-pattern antes de fix
- Documentar D1..DN com saída literal
- Declarar camada(s) afetada(s) e blast radius
- Validar: `npm run lint`, `npm run test`, `npm run build`, `npm run type-check`
- Após PR/push: verificar CI, analisar falhas, corrigir ou abrir PR separada **antes** da próxima fatia
- Reportar limitações do ambiente em vez de adivinhar

## Conflito de instruções

Alertar o owner. Ordem de precedência:

1. **Segurança / LGPD** (regras `enterprise-security.mdc`, `enterprise-lgpd.mdc`)
2. **`AGENTS.md`** (contrato central)
3. **PACR-Ampla** (investigações manuais)
4. **Regras enterprise v2** (`.cursor/rules/enterprise-*.mdc`)
5. **Instrução pontual da sessão** (exceto ordem explícita do owner com token válido)

Em conflito: seguir o nível mais restritivo de segurança.

## Confirmação de internalização

Resposta inicial do agente:

`PACR-Ampla v1.0 internalizado. Enterprise Rules v2 ativas. CI slice gate ativo. Autonomia controlada por guardrails. Pronto para Fase 0.`

## Revogação

Somente o owner com token literal `REVOGAR_PACR_AMPLA_V1`.

## Branch protection e ownership

- CODEOWNERS: `.github/CODEOWNERS` (paths enterprise exigem review devops/core)
- Branch protection: `.github/BRANCH_PROTECTION.md`
