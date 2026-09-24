# FASE 5 — Spec Pack Human Review (pre–SPEC_APPROVED)

**Baseline Spec:** `bacf9ecb`  
**Artefatos:** `FASE5_PARTNERS_SPEC.md` + `ADR-FASE5-PARTNER-DOMAIN.md`  
**Revisor:** Antigravity (Tech Lead) — apoio à decisão humana  
**Data:** 2026-09-22  
**Cursor:** IDLE  
**Veredito atualizado:** condições §C **aplicadas** no Spec/ADR → status `FASE5_PARTNERS_SPEC_CONDITIONS_CLOSED`.  
`SPEC_APPROVED` permanece **PENDING (humano)**. Cursor **IDLE**.

| Condição | Spec | ADR |
|----------|------|-----|
| Inc 1 CREATE-only | §15.1 | Addendum |
| UUID | §3.4 / §15.2 | Addendum |
| Rollback sem DROP ad-hoc | §6 / §15.2 | Addendum |
| SoT property aberto sem tocar inventário no Inc 1 | §14 / §15.2 | Decision §4 + Addendum |

---

## A. O que está sólido (PASS)

1. **Diagnóstico correto** — Partner ausente; SQL 007/008 órfão; Split + `/api/v1/comissoes` vivos; dois stacks de propriedade. Evita terceira arquitetura se Partner for **aditivo + adapters**.
2. **Separação Split vs Ledger** — Split = settlement MP externo; ledger = livro interno. Reduz risco de mexer em pagamento real cedo.
3. **Três “comissões” via `source_type`** — sem unificar tabelas no dia 1. Correto.
4. **`partner_links`** — ponte rastreável Affiliate/Owner/Empreendimento/Receiver sem DROP.
5. **Preservação explícita** — comissoes API, Split BFF, FASE 0 fora; sem DROP 007/008/011.
6. **Plano em incrementos + HIGH gates** — alinhado a AUTONOMOUS_POLICY.
7. **ADR** — alternativas rejeitadas coerentes; decisão aditiva clara.

---

## B. Riscos / ambiguidades (não são bugs do audit; são decisões em aberto)

| # | Lacuna | Impacto | Bloqueia Spec? | Bloqueia Inc 1? |
|---|--------|---------|----------------|-----------------|
| B1 | SoT property: `empreendimentos` vs `properties` (§14) | Adapter errado = dual-write futuro confuso | Não (direção) | **Sim** se Inc 1 incluir `ALTER … partner_id` nessas tabelas |
| B2 | Affiliate = programa sob Partner (assumido) vs tipo de Partner | Modelo de membership/backfill | Não | Não (só Inc 3+) |
| B3 | ID: UUID vs bigserial (§3.4) | Schema Inc 1 | Não | **Sim** — deve estar fechado antes do Cursor |
| B4 | OpenAPI/Zod só em texto (§4) | Contrato incompleto para código | Aceitável no Spec gate | Aceitável no Inc 1 (schema-only); **obrigatório** no Inc 2 |
| B5 | Facade vs 501 (§4) — escolha no Inc 2 | Risco de API morta vs stub | Não | Não |
| B6 | `partner_id` em `marketplace_split_transactions` “se seguro” (§5.2) | Toca settlement vivo | — | **Proibir no Inc 1** |
| B7 | Rollback M1 “DROP IF EXISTS se vazio” (§6) | Linguagem perigosa em prod | Clarificar | Clarificar antes de Inc 1 |
| B8 | Notion/GitHub externos não sync (§14) | Governança | Só se Orquestrador exigir | Não |

---

## C. Delimitação obrigatória do Incremento 1 (antes de liberar Cursor)

**Recomendação de escopo fechado Inc 1 (única forma segura de liberar Cursor depois):**

### IN SCOPE
- CREATE apenas (Drizzle):  
  `partners`, `partner_memberships`, `partner_links`,  
  `partner_earnings`, `partner_ledger_entries`,  
  `partner_payouts`, `partner_payout_items` (se itemizado)  
- Enums/CHECK/UNIQUE/índices das tabelas **novas**  
- Teste de migration up/down em **DB efêmero**  
- Sem seed prod; sem backfill

### OUT OF SCOPE (Inc 1)
- Qualquer `ALTER` em `comissoes_lancamento`, `marketplace_*`, `affiliates*`, split tables  
- Qualquer `ALTER` em `empreendimentos` / `acomodacoes` / `properties` (adiar até SoT B1 fechado)  
- Rotas API, facades, UI, jobs, webhooks  
- Dual-write, payouts, feature flags de dinheiro  
- Touch em FASE 0 / `.env` / Split BFF

### Pré-condições de liberação Cursor
1. Humano emite `SPEC_APPROVED` (direção + ADR + este escopo Inc 1)  
2. Humano emite (ou anexa) `INC1_AUTHORIZED` com allowlist de arquivos  
3. Branch `feat/fase5-partners-inc1`  
4. Dual gate + COMMIT_MANIFEST; **sem** auto-push HIGH

Até (1)+(2): **Cursor permanece IDLE.**

---

## D. Adapters legados — avaliação de ruptura

| Sistema vivo / legado | Spec garante não-ruptura? | Condição |
|-----------------------|---------------------------|----------|
| `/api/v1/comissoes` | Sim | Sem alterar até Inc 5 (dual-write flag) |
| Split BFF + SQL 011 | Sim | Sem `partner_id` em split no Inc 1; bridge só depois |
| Affiliate SQL 008 | Sim | Só `partner_links` no Inc 3; facade Inc 4 |
| Marketplace SQL 007 | Sim | Idem |
| Auth JWT roles | Sim | `partner_memberships` paralelo a `users.role` |
| UIs órfãs | Neutro | Continuam 404 até Inc 4 — aceitável |

**Conclusão:** o desenho de adapters **evita ruptura** se a ordem M1→M6 e o escopo Inc 1 acima forem respeitados. Risco principal = Cursor “ajudar” com ALTER colunas cedo.

---

## E. Checklist para o Orquestrador (aprovação humana)

Antes de `SPEC_APPROVED`, confirmar por escrito:

- [ ] Direção PARTNER → … → PAYOUTS aprovada  
- [ ] Affiliate = **programa sob Partner** (ou corrigir Spec)  
- [ ] Inc 1 = **somente CREATE Partner\*** (sem ALTER em tabelas vivas)  
- [ ] Tipo de ID de `partners` escolhido (UUID **ou** bigserial)  
- [ ] SoT property pode ficar **aberto** até Inc 2+ **desde que** Inc 1 não altere inventário  
- [ ] Rollback M1 = migration down / flag — **não** DROP ad-hoc em prod  
- [ ] `bacf9ecb` = baseline Spec, **não** autorização de código  
- [ ] Cursor IDLE até `SPEC_APPROVED` + `INC1_AUTHORIZED`

---

## F. Estado oficial atualizado (pós-revisão de apoio)

```text
FASE 5 — PARTNERS
Spec pack ............... COMPLETE (bacf9ecb)
Human review (apoio) .... DONE — CONDITIONAL PASS
SPEC_APPROVED ........... PENDING (humano)
Implementation .......... NOT STARTED
Cursor .................. IDLE
Risk .................... HIGH
```

**Próximo ato humano:** emitir `SPEC_APPROVED` com §C anexado, **ou** pedir patch do Spec/ADR fechando B3/B6/B7 antes de aprovar.
