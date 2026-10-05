# C36-ID-02 / WS-15 — S5 Canonical Role Context (Implementation + Evidence)

```text
S1–S4 = PASS/CLOSED · S5 CODE GATE = OPEN
HEAD = 61040b02 · sem commit/push · sem DDL · sem DB write
```

## 1. O que foi implementado

`server/modules/membership/role.context.ts` (F-1):

```text
CanonicalRoleContext { role, source, permissions, roleVerified }
buildRoleContext({ recordRole, legacyRole, legacySource, membershipVerified })
roleContextAllows(ctx, permission)
```

Regras:

- `role` vem do **registro de membership** (`membership-record`) ou de **mapeamento legado**
  (`legacy-mapping`). Nunca de JWT claim — `legacySource: 'jwt-claim'` retorna contexto vazio.
- `membershipVerified: false` ⇒ **nenhum papel exposto** (fail-closed de apresentação):
  um owner não é exibido sobre membership não provada.
- Papel ausente/desconhecido ⇒ `{ role: null, permissions: [], roleVerified: false }` — sem erro.
- `permissions` são **derivadas** do papel canônico (contrato mínimo do S2), nunca persistidas.

## 2. Separação formal verificada

`resolveEnterpriseContext` **não foi alterado** e seu retorno continua sendo exatamente
`{ authorizedEnterpriseId, internalEnterpriseId, membershipVerified, source }` — sem `role`,
sem `permissions`. Teste S5.2 afirma isso por igualdade exata de chaves, garantindo que o
papel é dimensão **independente**, não um campo que "contamina" a decisão.

## 3. MATRIZ BLOQUEADORA (exigida pelo Owner) — resultado

```text
ACTIVE + owner/admin/manager/viewer  => verified=true   ✓ (4 casos)
ACTIVE + role undefined             => verified=true, contexto vazio ✓
ACTIVE + role 'root' (inválido)     => verified=true, contexto vazio ✓
INACTIVE/REVOKED/SUSPENDED/NOT_FOUND + owner => verified=false ✓ (4 casos)
lookup error + owner                 => verified=false ✓
usuário diferente + owner            => verified=false ✓
```

Ou seja: **owner não ressuscita membership inválida** e **role ausente não invalida membership
válida** — exatamente o contrato pedido.

## 4. Falha intermediária (1, corrigida na fatia)

`buildRoleContext({ legacyRole: 'admin', legacySource: 'jwt-claim' })` retornava `'admin'`
porque o mapa S2 recusava a fonte, mas o fallback `asCanonicalEnterpriseRole` ainda a aceitou.
**Isso era uma violação real de I-07 no código de produto** (o teste pegou). Corrigido com
ramo explícito `legacySource === 'jwt-claim' => EMPTY` antes de qualquer fallback.
Rerun: 21/21.

## 5. Evidência de validação

```text
jest role-context.test.ts ............ 21/21 passed (exit 0)
regressão WS-04 + WS-15 .............. 10 suites, 208/208 passed (exit 0)
   bridge 24 · port 8 · resolver 30 · probe S5-WS04 11 · auth-claim 25 ·
   tenant C36-ID-04 26 · contract 21 · repository 18 · plug 24 · role-context 21
tsc (membership/index.ts) ............ exit 0
scope scan role.context.ts ............ 0 em código (1 match = comentário I-07)
resolver / auth.middleware / drizzle / schema / requireRole / PropertyUser = INTOCADOS
HEAD ................................. 61040b02
```

## 6. Gate

```text
WS15-S5-ROLE-CONTEXT-PASS
verified NÃO passa a depender de role · default DenyAll inalterado · flag segue TEST-ONLY
DDL / drizzle / migration / DB APPLY = ZERO
C5 / requireRole / auth.middleware / payments / DE-06 = INTOCADOS
C36-DE-05 = PASS/CLOSED (intocado)
S6 (RBAC Enforcement Boundary) = BLOCKED — aguardando CODE GATE do Owner
```

Nota para S6: os guards (`requireRole`/`requirePermission`) devem consumir
`CanonicalRoleContext`, e não `req.user.role`. Migrar `requireRole` global é explicitamente
proibido nesta onda (S9) — S6 deve entregar boundary novo, sem sustituir o legado.
