# C36-ID-02 / WS-15 — S3 Membership Repository/Adapter (Implementation + Evidence)

```text
S1 = PASS/CLOSED · S2 = PASS/CLOSED · S3 CODE GATE = OPEN (adapter, sem persistencia)
HEAD = 61040b02 · sem commit/push · sem DDL · sem DB write
```

## 1. O que foi implementado

`server/modules/membership/membership.repository.ts`:

- `MembershipRecord` — registro de membership enterprise-level (sujeito a `enterprise_users` [MIGRATION GATE]).
- `MembershipRepositoryAdapter` — interface de lookup por `(subjectUserId, internalEnterpriseId)`.
- `InMemoryMembershipRepository` — **TEST DOUBLE** (snapshot congelado, filtra entradas inválidas, sem mutação).
- `MembershipAuthorityPort implements EnterpriseMembershipPort` — compõe S2 (veredict canônico) sobre o adapter.

Nenhum "adapter temporário": a única implementação executável é o InMemory, rotulado como
test double. O adapter persistente não existe e não é simulado.

## 2. Garantias verificadas

```text
I-S3-01 ausencia            => DENY (hasMembership com repo vazio)
I-S3-02/03/04 inactive/
         suspended/revoked  => DENY (4 estados parametrizados)
I-S3-05 lookup exception    => DENY (adapter que lança; exceção NUNCA propagada)
I-S3-06 outro subject       => DENY
I-S3-07 outra enterprise    => DENY
I-S3-08 Number(externalKey) => NUNCA; teste prova que o adapter recebe internalId=99
                              quando a key é 'ent_42' (spy captura o argumento)
I-S3-09 PropertyUser        => ausente do veredict (assert not.toHaveProperty)
I-S3-10 fake ≠ persistência=> sem fallback; dados voláteis; sem API de escrita
I-S3-11/12 adapter concede
         role/permission?   => NÃO (assert not.toHaveProperty role/permissions)
I-S3-13 verified=true       => SÓ via ACTIVE + usuário correto + enterprise correta
```

Extras: `internalId null` e `subject.userId` inválido ⇒ negação **sem consultar o adapter**
(spy prova `called === 0`); adapter que resolve `undefined` (violação de contrato) ⇒ tratado
como ausência, sem throw.

## 3. Bug encontrado e corrigido dentro da fatia

Primeira execução: **17/18, 1 falha**. Causa raiz: `record` podia ser `undefined` (adapter
violando contrato) e o código acessava `record.status` sem guarda — um `TypeError` escapava,
violando totalidade/fail-closed. Correção: normalização `found = record ?? (typeof record === 'object' ? record : null)`.
Rerun: 18/18. Classificado como falha intermediária de implementação, não TEST_FAILURE final.

## 4. Evidência de validação

```text
jest membership-repository.test.ts ..... 18/18 passed (exit 0)
regressão WS-04 + WS-15 ............... 8 suites, 163/163 passed (exit 0)
   bridge 24 · port 8 · resolver 30 · probe S5 11 · auth-claim S6 25 ·
   tenant C36-ID-04 26 · contract S2 21 · repository S3 18
tsc (membership/index.ts) ............. exit 0
scope scan membership/*.ts ............ 0 ocorrências em código
   (1 match = comentário de proibição "Nunca Number(externalKey)")
git: drizzle/schema/auth.middleware/propostas-rbac/PropertyUser = INTOCADOS
   (mtimes 09-29 e 10-02, anteriores ao S3 em 10-03 21:34)
```

## 5. Gate

```text
WS15-S3-MEMBERSHIP-ADAPTER-PASS
DDL / drizzle / migration / DB APPLY = ZERO
PropertyUser / requireRole / auth.middleware / C5 / payments / DE-06 = INTOCADOS
C36-DE-05 = PASS/CLOSED (intocado)
S4 (Membership Authority + plug no resolver) = BLOCKED — aguardando CODE GATE do Owner
```

Nota para S4: o plug deve injetar `MembershipAuthorityPort` no resolver **atrás de flag
TEST-ONLY** (`enforce`), preservando `DenyAllMembershipPort` como default — exatamente o
padrão já validado no WS-04, para que nenhuma rota passe a negar em produção sem autorização.
