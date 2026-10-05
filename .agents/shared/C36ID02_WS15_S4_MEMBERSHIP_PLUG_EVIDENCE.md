# C36-ID-02 / WS-15 — S4 Membership Authority Plug (Implementation + Evidence)

```text
S1–S3 = PASS/CLOSED · S4 CODE GATE = OPEN
HEAD = 61040b02 · sem commit/push · sem DDL · sem DB write
```

## 1. O que foi implementado

`server/modules/membership/membership.plug.ts` (F-1):

```text
WS15_MEMBERSHIP_FLAG = 'WS15_MEMBERSHIP_AUTHORITY'
isMembershipAuthorityEnabled(env)  → true SOMENTE para a string exata 'true'
                                      (case-insensitive, trim); 1/yes/true(boolean) => false
selectMembershipPort({ adapter, env, enabled })
   flag OFF / ausente / invalida        => DenyAllMembershipPort   (DEFAULT)
   flag ON + adapter presente            => MembershipAuthorityPort (S3)
   flag ON + adapter ausente/nulo       => DenyAllMembershipPort   (degradação segura)
```

O plug **não toca o resolver** (F-6 não foi modificado — a matriz fail-closed do WS-04 fica
literalmente intacta). Ele apenas escolhe *qual* `EnterpriseMembershipPort` o resolver recebe.

## 2. Critério de isolamento exigido pelo Owner

```text
flag OFF + membership ACTIVE existente  => ainda DenyAll  → verified=false        ✓
flag ON  + membership ACTIVE             => MembershipAuthorityPort verifica      ✓
flag ON  + membership inexistente        => verified=false (sem throw)            ✓
flag ON  + adapter que lança             => verified=false (exceção absorvida)     ✓
flag invalida ('sim','1',true booleano)  => DenyAll                                ✓
flag ON  + env ausente/null              => false → DenyAll                        ✓
flag ON mas SEM adapter                  => DenyAll (não lança, não autoriza)     ✓
```

Matriz WS-04 preservada com a flag ligada: `ent_999` ⇒ 403 `unknown-enterprise`;
claim ausente ⇒ 403 `missing-claim`; usuário ≠ membership ⇒ `verified=false`.

## 3. Falhas intermediárias (2, ambas no teste — corrigidas na fatia)

1. `DenyAllMembershipPort` importado do barrel `membership`, onde **não** é re-exportado
   (vive em `multi-property/context`) ⇒ `toBeInstanceOf(undefined)`. Corrigido: import direto
   do módulo de origem.
2. `run(port, undefined)` acionava o *default* do parâmetro (`'ent_42'`), então o teste
   "claim ausente" não exercitava ausência. Corrigido para `null` explícito.

Nenhuma falha de código de produto; ambas eram falhas de escrita do teste.

## 4. Evidência de validação

```text
jest membership-authority-plug ..... 24/24 passed (exit 0)
regressão WS-04 + WS-15 ........... 9 suites, 187/187 passed (exit 0)
   bridge 24 · port 8 · resolver 30 · probe S5 11 · auth-claim S6 25 ·
   tenant C36-ID-04 26 · contract 21 · repository 18 · plug S4 24
tsc (membership/index.ts) ......... exit 0
scope scan membership.plug.ts ..... 0 (sem process.env.*, sem req.*, sem Number, sem infra)
resolver / auth.middleware / rbac.ts / drizzle / schema = INTOCADOS
HEAD .............................. 61040b02
```

## 5. Gate

```text
WS15-S4-MEMBERSHIP-AUTHORITY-PLUG-PASS
default = DenyAllMembershipPort (inalterado) · flag = TEST-ONLY
DDL / drizzle / migration / DB APPLY = ZERO
PropertyUser / requireRole global / auth.middleware / C5 / payments / DE-06 = INTOCADOS
C36-DE-05 = PASS/CLOSED (intocado)
S5 (RBAC Context) = BLOCKED — aguardando CODE GATE do Owner
```

Nota para S5: o plug torna possível injetar roles canônicos no contexto autorizado, mas
`resolveEnterpriseContext` não transporta `role`. S5 deve ampliar o **contexto** (nuevo campo
tipado) sem alterar a decisão de `verified` — que permanece exclusivamente derivada de
membership ACTIVE + identidade + enterprise resolvida.
