# C36-ID-02 / WS-15 — S7 Legacy Isolation / Non-Invasive Boundary (Evidence)

```text
S1–S6 = PASS/CLOSED · S7 CODE GATE = OPEN
HEAD = 61040b02 · NENHUM arquivo de produto alterado nesta fatia
```

## 1. O que S7 entregou

**Somente um arquivo de teste**: `backend/src/__tests__/integration/legacy-isolation.integration.test.ts`.
Nenhuma linha de código de produção foi escrita. Nenhuma migração, nenhum consumer tocado.

## 2. Prova de não-invasão (comportamento)

Rota legada montada exatamente como no repositório (`requireRole` lendo `req.user.role`),
sem nenhum middleware WS-15 montado:

```text
JWT role 'manager'                      => 200  (legado)              ✓
JWT role 'viewer'                       => 403  (legado)              ✓
sem role                                => 403  (legado)              ✓
'manager ' (com espaco) / 'Manager'     => 403  (legado, cas-sensitive)✓
flag WS15 ON  + membership ACTIVE        => 200/403 idênticos         ✓
flag WS15 OFF                           => 200/403 idênticos         ✓
CanonicalRoleContext owner no processo  => rota legada inalterada     ✓
membership ACTIVE e membership vazio    => rota legada inalterada     ✓
```

`role` canônico `owner` presente no processo **não** concede acesso à rota legada: ela
continua exigindo `requireRole('manager')` via JWT.

## 3. Prova estática de isolamento (código de produto)

Varredura de `server/modules`, `server/middleware`, `backend/src` — excluindo `__tests__`
(testes por definição exercitam o WS-15) e o próprio módulo `membership`:

```text
I-S7-01 nenhum consumidor legado importa modules/membership ...... offenders = []  ✓
       role.guards nunca importado fora do módulo .................. offenders = []  ✓
I-S7-02 requireRole legado original intacto:
         contem 'export function requireRole(...roles: string[])'
         contem 'const role = req.user?.role;'
         NAO contem 'requireEnterpriseRole' .................................       ✓
I-S7-08 PropertyUser presente no schema e sem import de membership ............       ✓
I-S7-09 nenhum import de drizzle/knex/pg/fs em server/modules/membership ........   ✓
       nenhum pgTable / SQL literal / CREATE TABLE na onda WS-15 .............     ✓
I-S7-03/04/05/06/07 provados pelos cenarios da secao 2 .........................    ✓
```

`auth.middleware.ts` aparece como `M` apenas pela herança do **WS-04/S6** (normalização do
claim) — S7 não o tocou. `propostas/rbac.ts` está limpo.

## 4. Falhas intermediárias (2, ambas no harness do teste)

1. `REPO_ROOT` com um `..` a mais ⇒ `ENOENT` ao varrer `server/modules`. Corrigido (4 níveis).
2. A varredura inicial contava os **próprios arquivos de teste do WS-15** como "consumidores
   legados", apontando 9 e 3 falsos positivos. Corrigido filtrando `__tests__` e `.test.ts` —
   a asserção agora é sobre **código de produto**, que é a propriedade que importa.

Nenhuma falha de código de produto nesta fatia.

## 5. Evidência

```text
jest legacy-isolation ................. 14/14 passed (exit 0)
regressão WS-04 + WS-15 ................ 12 suites, 247/247 passed (exit 0)
   bridge 24 · port 8 · resolver 30 · probe WS-04 11 · auth-claim 25 ·
   tenant C36-ID-04 26 · contract 21 · repository 18 · plug 24 ·
   role-context 21 · role-guards 25 · legacy-isolation 14
código de produto alterado em S7 ...... ZERO arquivos
HEAD .................................. 61040b02
```

## 6. Gate

```text
WS15-S7-LEGACY-ISOLATION-PASS
nenhuma migração disfarçada · nenhuma conexão a enterprise_users · nenhum property scope
default DenyAll inalterado · flag TEST-ONLY · C5 / drizzle / schema / pagamentos = INTOCADOS
S8 (integracao/migracao controlada dos consumidores) = BLOCKED — aguardando CODE GATE do Owner
```

Nota para S8: a varredura estática criada aqui é o detector de regressão de migração — qualquer
consumidor que passe a importar `modules/membership` reprovará o suite até que a migração
seja explícita e registrada (que é exatamente o objetivo de S8).
