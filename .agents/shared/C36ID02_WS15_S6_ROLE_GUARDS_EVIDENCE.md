# C36-ID-02 / WS-15 — S6 Enterprise Role Guards (Implementation + Evidence)

```text
S1–S5 = PASS/CLOSED · S6 CODE GATE = OPEN
HEAD = 61040b02 · sem commit/push · sem DDL · sem DB write · zero falhas intermediárias
```

## 1. O que foi implementado

`server/modules/membership/role.guards.ts` (F-1):

```text
requireEnterpriseRole(minimum)(context: CanonicalRoleContext|null|undefined) => RoleGuardOutcome
requireEnterprisePermission(permission)(context)                            => RoleGuardOutcome
isAllowed(guard, context)                                                   => boolean
RoleGuardOutcome { allowed, reason, role }
```

**Prova estrutural de I-S6-01/02/03:** a assinatura do guard aceita **um único parâmetro —
o contexto canônico**. Não existe parâmetro para `Request`, `req.user`, `req.body`, `req.query`,
headers ou `PropertyUser`. O guard *não pode* ler `req.user.role` porque nada lhe dá acesso a
um request. O teste confirma (`guard.length === 1`) e confirma com um objeto forjado
`{ role:'owner', roleVerified:false, permissions:[...] }` que o guard **ignora campos alheios**
e nega por `unverified-role`.

## 2. Bloqueadores I-S6-01..12

```text
I-S6-01 guard nunca lê req.user.role ....... ✓ (sem parametro de request; grep limpo em código)
I-S6-02 guard nunca lê PropertyUser.role ... ✓ (sem import; PropertyUser só em comentário)
I-S6-03 consome só CanonicalRoleContext ... ✓
I-S6-04 role desconhecido → DENY ........... ✓ 'root' ⇒ unknown-role
I-S6-05 contexto ausente → DENY ............ ✓ null/undefined/string/{} /[] ⇒ missing-context
I-S6-06 roleVerified=false → DENY .......... ✓
I-S6-07 viewer não satisfaz manager ........ ✓
I-S6-08 manager não satisfaz admin ......... ✓
I-S6-09 admin não satisfaz owner ........... ✓
I-S6-10 owner satisfaz níveis inferiores ... ✓ (matriz 13 combinações)
I-S6-11 membershipVerified=false → nada .... ✓ (contexto fica sem papel ⇒ DENY)
I-S6-12 permission não vem do cliente ...... ✓ permission é argumento do código chamador
```

## 3. `permissions` não virou segunda autoridade

`roleContextAllows` / `permissions` continuam **derivados** do papel canônico (contrato S2,
contexto S5). Dois testes forjam contextos com `permissions` infladas e provam negação:

```text
{ role:'owner', roleVerified:true, permissions: undefined } ⇒ missing-permission
{ role: null,  roleVerified:true, permissions:['enterprise.manage'] } ⇒ DENY
```

O guard de capacidade exige papel válido (`requireEnterpriseRole('viewer')` como pré-condição)
**e** a capacidade derivada. Não há caminho em que permissões isoladas autorizem.

## 4. Legado intocado

`auth.middleware.requireRole`, `propostas/rbac.ts` (`rankRole`/`requireRoleMin`),
`PropertyUser`, `auth.middleware.ts` e os 24 consumidores de S1: **não importados, não
substituídos, não alterados**. Migração é S9. Ambos aparecem apenas em comentários de
documentação no arquivo novo (grep confirmou: 2 matches, ambos em comentário).

## 5. Evidência

```text
jest role-guards ....................... 25/25 passed (exit 0, 1ª tentativa)
regressão WS-04 + WS-15 ................ 11 suites, 233/233 passed (exit 0)
tsc (membership/index.ts) .............. exit 0
scope scan role.guards ................. 0 em código
resolver / middleware WS-04 / drizzle / schema = INTOCADOS
HEAD ................................... 61040b02
```

## 6. Gate

```text
WS15-S6-ROLE-GUARDS-BOUNDARY-PASS
fronteira NOVA · legado preservado (S9) · default DenyAll inalterado · flag TEST-ONLY
DDL / drizzle / migration / DB APPLY = ZERO
C5 / payments / DE-06 / staging / produção = INTOCADOS
S7 (Negative Security Suite) = BLOCKED — aguardando CODE GATE do Owner
```

Nota para S7: a suíte negativa deve incluir um teste de **tentativa de uso do guard novo como
substituto do legado** — isto é, provar que uma rota que ainda usa `requireRole` continua com o
comportamento antigo (nenhuma rota deve mudar de comportamento só por S6 existir).
