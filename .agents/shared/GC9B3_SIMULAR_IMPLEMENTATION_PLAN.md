# G-C.9b.3 — Implementation Plan
## Partner Tariff Simulation — `GET /api/v1/tarifas/simular`

**Status:** `PLAN_READY_FOR_OWNER_GO`  
**CODE:** `NÃO AUTORIZADO` até `OWNER GO — G-C.9b.3`  
**Pré-condições satisfeitas:** G-C.9b.1 PASS/CLOSED · G-C.9b.2 CLOSED/N-A · PA-DEC-001..006,009,010 APPROVED  

---

## 0. Fechamento herdado (registro)

| Gate | Estado |
|------|--------|
| G-C.9b.1 Staff Tariff Authority | **PASS / CLOSED** |
| G-C.9b.2 Partner Tariff Read | **CLOSED / N-A — NO PARTNER READ TARGET** |
| G-C.9b.3 Partner Tariff Simulation | **THIS PLAN** |
| G-C.9b.4 / 9b.5 | PENDING — fora deste plano |
| G-C.9c | BLOCKED — `anfitriao.routes.ts` intocado |

Zero código produzido em 9b.2; nada a reverter.

---

## 1. Alvo único (PROVEN)

**Arquivo:** `server/modules/acomodacoes/routes/tarifas.routes.ts`  
**Rota:** `GET /simular` — `...parceiroAuth` (L173+)

### Legacy atual (preservar bit-a-bit no handler)

```text
parceiroAuth = [authenticateJwt, requireRole('anfitriao','corretor','agente','promotor','admin','manager')]

Handler:
  1. valida acomodacaoId + data
  2. preview=1|true → somente JWT role ∈ {admin,manager}; senão 403
  3. se NÃO staff → anfitriaoService.obterUnidade(auth, acomodacaoId)
       - forbidden → 403
       - not found → 404
  4. tarifaService.resolverTarifa({ ..., preview: previewRequested && isStaff })
```

### Fora deste gate (proibido tocar)

- `GET|PUT /politica-desconto` (9b.4 / 9b.5)
- qualquer rota `staffAuth` (9b.1)
- `anfitriao.routes.ts` (9c)
- `tarifa.service` / `rate-calendar.service` lógica econômica interna (exceto o que o handler já chama)
- migrations / DB / staging / prod / commit / push

---

## 2. Modelo de autoridade — Modelo D (PA-DEC-005)

```text
Legacy Partner Auth (JWT requireRole + obterUnidade)
        +
Enterprise Context (authorizedEnterpriseContext, flag ON)
        +
Economic surface (resolverTarifa — already in-handler; não reimplementar pricing)
```

### Regras inegociáveis (PA-DEC-001..004)

| JWT / Partner role | Escopo Partner (legado — NÃO substituir) | Equivalente Enterprise |
|--------------------|------------------------------------------|-------------------------|
| `anfitriao` | owner-scope via `obterUnidade` / `proprietarioId` | **Nenhum** — não mapear |
| `corretor` / `agente` / `promotor` | carteira-scope | **Nenhum** — não mapear |
| `admin` / `manager` (staff) | bypass de unidade no handler | Membership Enterprise fail-closed quando flag ON; **não** usar `requireEnterpriseRole` isolado como única barreira Partner |

**Proibido:** `requireEnterpriseRole('viewer'|'manager')` isolado como substituto de Partner Authority nesta rota.

---

## 3. Desenho do guard complementar

### Arquivo novo

`server/modules/membership/tarifas-simular.guard.ts`

### Export barrel

`server/modules/membership/index.ts` — **somente** `export * from './tarifas-simular.guard'`

### Wiring (única mudança em rotas)

```ts
// NÃO alterar a definição global de parceiroAuth usada por politica-desconto.
// Opção A (preferida): auth dedicado só para /simular
const simularAuth = [
  authenticateJwt,
  requireRole('anfitriao', 'corretor', 'agente', 'promotor', 'admin', 'manager'),
  requireTarifasSimularPartner, // Model D complementary
];
router.get('/simular', ...simularAuth, handler);

// Opção B (aceitável): 3º elemento inline só na linha do /simular
router.get('/simular', authenticateJwt, requireRole(...), requireTarifasSimularPartner, handler);
```

**Critério:** `parceiroAuth` compartilhado com `GET /politica-desconto` **não** deve ganhar o guard 9b.3 (evita vazamento para 9b.4).

### Comportamento do guard

| Flag `WS15_MEMBERSHIP_AUTHORITY` | Comportamento |
|----------------------------------|---------------|
| OFF / ausente / ≠ `'true'` | `next()` imediato — legado governa 100% |
| ON | Fail-closed Enterprise Context |

**Flag ON — checklist:**

1. `req.authorizedEnterpriseContext` presente  
2. `membershipVerified === true`  
3. `internalEnterpriseId` finito / válido  
4. Caso contrário → `403 { success:false, error:'Acesso negado' }`  
5. **Não** ler `body` / `query.enterpriseId` / `x-enterprise-id` / claims spoofáveis como autoridade  
6. **Não** invocar `requireEnterpriseRole` para roles Partner  
7. **Não** chamar `obterUnidade` no guard (permanece no handler)  
8. Catch → 403 fail-closed  
9. Default repository unconfigured → 403 com flag ON (mesmo padrão 9b.1), **ou** se o guard for só membership-context (sem role lookup), documentar: sem chamada a repo de role — apenas contexto D10  

**Nota de implementação:** Se o guard 9b.3 for *somente* validação de `authorizedEnterpriseContext` (sem rank de role), factory/repo de role assignment **não** são obrigatórios. Preferir o desenho mais fino: **Enterprise membership proof only** + Partner legado no handler = Modelo D sem falsa equivalência de roles.

### Preview (`preview=1`)

- Permanecer **exclusivamente** no handler (JWT staff).  
- Guard 9b.3 **não** concede preview.  
- Flag ON + partner + preview → continua 403 pelo handler (legado).  
- Flag ON + staff + preview → exige Enterprise Context no guard; handler libera preview como hoje.

---

## 4. Arquivos autorizados (quando CODE GO)

| Arquivo | Ação |
|---------|------|
| `server/modules/membership/tarifas-simular.guard.ts` | CRIAR |
| `server/modules/membership/index.ts` | +1 export |
| `server/modules/acomodacoes/routes/tarifas.routes.ts` | wiring `/simular` apenas |
| `backend/src/__tests__/unit/tarifas-simular-guard.test.ts` | CRIAR |

### Proibidos

`anfitriao.routes.ts`, `politica-desconto` handlers, `tarifa.service.ts` (salvo se teste mockar), drizzle/migrations, financial modules.

---

## 5. Matriz de testes obrigatórios

Arquivo: `tarifas-simular-guard.test.ts` (+ asserts estáticos de wiring se útil)

| # | Caso | Esperado |
|---|------|----------|
| 1 | Flag OFF / ausente | `next()` |
| 2 | Flag inválida (`'1'`, `'yes'`) | `next()` (contrato `isMembershipAuthorityEnabled`) |
| 3 | Flag ON + context membership OK | `next()` |
| 4 | Flag ON + context ausente | 403 |
| 5 | Flag ON + `membershipVerified=false` | 403 |
| 6 | Flag ON + sem `internalEnterpriseId` | 403 |
| 7 | Spoof body/query/headers enterprise/partner | 403 se context inválido; context válido ignora spoof |
| 8 | Cross-enterprise: membership A não valida context B | 403 |
| 9 | Static: `/simular` usa guard; `/politica-desconto` **não** | assert source |
| 10 | Static: handler ainda chama `obterUnidade` | assert source |
| 11 | Static: `preview` staff-only string preservada | assert source |
| 12 | Nenhum import RefundService/Ledger/Earnings/Payout/Gateway | assert source |

### Família / regressão

```text
tarifas-simular-guard
+ tarifas-staff-guard          (9b.1)
+ acomodacoes-import-guard
+ acomodacoes-sync-guard
```

Separar falhas novas vs baseline pré-existente do WT.

### Testes de integração handler (opcional neste gate)

Se o Owner exigir prova de composition end-to-end no mesmo GO: Supertest mínimo com mocks de `obterUnidade` + flag ON/OFF — **somente** se couber no blast radius; senão unitário do guard + asserts estáticos bastam para o CODE GATE deste plano.

---

## 6. Critérios PASS / FAIL

### PASS

- Legacy `requireRole` + `obterUnidade` + preview rules semanticamente intactos  
- Flag OFF = comportamento pré-9b.3  
- Flag ON = Enterprise Context fail-closed sem mapear Partner→Enterprise role  
- `/politica-desconto` e `staffAuth` intocados  
- Zero migration/DB/staging/prod/commit/push  
- Testes dedicados + família verdes (ou baseline separado)

### FAIL / STOP

- Qualquer `requireEnterpriseRole` isolado para anfitriao/corretor  
- Guard acoplado a `parceiroAuth` compartilhado vazando para 9b.4  
- Remoção de `obterUnidade`  
- Alteração de pricing / tetos / politica  
- Ampliação para categorias/temporadas/regras  

---

## 7. Sequência de execução (após OWNER GO CODE)

1. Criar guard + testes  
2. Wiring `/simular` apenas  
3. Export index  
4. Rodar 12+ testes dedicados  
5. Rodar família  
6. Diff real + evidência  
7. **STOP** — sem commit/push  

---

## 8. Decisão Owner pendente

Este documento é **Implementation Plan apenas**.

```text
CODE GATE G-C.9b.3 = CLOSED
Aguardando: OWNER GO — G-C.9b.3 — AUTHORIZED
```

Nenhuma mega-discovery adicional é necessária; fronteira 9b.2 N/A já confirmou o alvo real = `/simular`.
