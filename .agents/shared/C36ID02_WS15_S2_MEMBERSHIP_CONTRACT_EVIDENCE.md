# C36-ID-02 / WS-15 — S2 Membership Contract (Implementation + Evidence)

```text
WS-15 PLAN VALIDATION = PASS · S1 = PASS/CLOSED
WS-15 S2 CODE GATE    = OPEN (contrato apenas)
HEAD                  = 61040b02 — inalterado · sem commit/push
```

## 1. As 5 decisões do S2

### 1.1 Taxonomia única (R-3 resolvido)

`owner > admin > manager > viewer` (rank 4/3/2/1), canônicos, **enterprise-level**.
`housekeeper`, `receptionist`, `staff`, `owner`(property) **não** são papéis enterprise.
Nenhum dos 3 vocabulários legados foi promovido: existe **mapa declarativo** legado→canônico.

### 1.2 Status de membership

`active` (único autorizador) · `inactive` · `suspended` · `revoked` · `not_found`.
`lookupFailed`/`status` inválido ⇒ `lookup-error` ⇒ DENY. Reconciliado com o domínio real
(`PropertyUser` só tem `is_active`; os demais estados ampliam sem contradizer).

### 1.3 MembershipVerdict

`{ verified, status, subjectUserId, externalEnterpriseKey, internalEnterpriseId, policy, reason }`
`verified=true` **somente** com `active` + userId válido + `internalEnterpriseId` resolvido.
Não contém `role`, `permissions` nem `propertyId` (testado por shape).

### 1.4 PropertyUser — separação explícita

Não é fonte de membership enterprise (I-04). Não existe parâmetro para ele no contrato.
O mapa marca `housekeeper`/`receptionist` como `null` (property-level, C5).

### 1.5 Permission model — decisão: **B (contrato mínimo)**

Não criar tabela `permissions` agora. Evidência S1: `permissions?: string[]` em `PropertyUser`
é campo órfão e não existe tabela. Criar persistência exigiria justificativa de uso futuro +
MIGRATION GATE. Portanto: 4 capacidades canônicas derivadas de papel, em código, fail-closed
(papel desconhecido ⇒ conjunto vazio).

## 2. Arquivos (F-1/F-3 do plano; F-2 sem alteração)

```text
NOVO server/modules/membership/membership.types.ts      taxonomia + status + capacidades
NOVO server/modules/membership/rbac.mapping.ts         mapa legado→canônico (recusa jwt-claim)
NOVO server/modules/membership/membership.verdict.ts    veredict canônico fail-closed
NOVO server/modules/membership/index.ts                 barrel (sem authority.ts nesta fatia)
NOVO backend/src/__tests__/unit/membership-contract.test.ts
INTOCADO enterprise-membership.port.ts (F-2 — verificado, compatível)
INTOCADO auth.middleware.ts, propostas/rbac.ts, PropertyUser, drizzle, payments
```

## 3. Evidência de validação

```text
jest membership-contract.test.ts ........ 21/21 passed (exit 0)
regressão WS-04 + WS-15 .................. 7 suites, 145/145 passed (exit 0)
  (bridge 24, port 8, resolver 30, probe S5 11, auth-claim S6 25, tenant C36-ID-04 26, contract 21)
tsc (types + mapping + verdict + port) .. exit 0
scope scan membership/*.ts .............. 0 (anti-pattern + drizzle/knex/require)
PropertyUser/propertyId no código ....... 0 ocorrências de código (4 = comentários de separação)
HEAD .................................... 61040b02
```

## 4. Invariantes I-01..I-10

I-01..I-03 (WS-04, preservados pela regressão) · I-04 PropertyUser≠membership (shape sem
propertyId + mapa `null`) · I-05 status desconhecido≠ALLOW · I-06 lookup error≠ALLOW ·
I-07 role spoof≠ALLOW (`jwt-claim` recusado no mapa) · I-08 permission spoof≠ALLOW
(permissão só deriva de papel canônico) · I-09 property=C5 · I-10 financial fora do WS-15.

## 5. Gate

```text
WS15-S2-MEMBERSHIP-CONTRACT-PASS
migration/DB APPLY = ZERO · schema Drizzle = ZERO · requireRole global = INTOCADO
PropertyUser = INTOCADO · C5/WS-07/DE-14/DE-06 = BLOCKED
S3 (Membership Repository/Adapter) = BLOCKED — aguardando CODE GATE do Owner
```
