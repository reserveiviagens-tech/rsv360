# C36-ID-02 — ENTERPRISE / TENANT SECURITY CONTRACT

> **Proveniência:** texto normativo fornecido pelo Owner (Gatekeeper) e persistido neste repositório para eliminar o achado **F-0** (contrato não localizável na árvore). Conteúdo normativo reproduzido fielmente. Este arquivo **não autoriza** nenhuma implementação.
>
> **Persistido em:** `.agents/shared/C36ID02_SECURITY_CONTRACT.md`
> **Base git:** `61040b0` · branch `feat/c36dd-refund-request-domain`

Status: ACTIVE / PENDING_NAMESPACE_AND_AUTHORIZATION_TREE_RESOLUTION
Natureza: Security Architecture Contract
Gate: Documentary / Read-Only
CODE: NOT AUTHORIZED
MIGRATION: NOT AUTHORIZED
DATABASE WRITE: NOT AUTHORIZED
STAGING / DEPLOY / PRODUCTION: BLOCKED
REAL GATEWAY / REAL REFUND / PAYOUT: BLOCKED

---

## 1. Objetivo

Este contrato define as invariantes de segurança para o modelo SaaS multiempresa do RSV360.

O contrato estabelece:

Enterprise como limite primário de isolamento;
relacionamento N entre User e Enterprise;
membership contextual;
autorização baseada em identidade, contexto, papel, permissão e escopo do recurso;
Property como segundo nível de escopo quando aplicável;
contexto Enterprise determinado pelo servidor;
comportamento fail-closed;
separação entre autorização de Enterprise, autorização de plataforma e autenticação reforçada;
requisitos para PLATFORM_SUPER_ADMIN;
Step-Up Authentication;
Device Security;
Critical Approval;
auditoria privilegiada;
segregação de funções financeiras;
requisitos de reconciliação arquitetural.

Este documento não implementa nenhuma dessas capacidades.

---

## 2. Princípio fundamental

### 2.1 Enterprise é o Tenant Boundary

Uma Enterprise representa a raiz de isolamento lógico de uma família empresarial.

Um usuário somente poderá acessar recursos de uma Enterprise quando existir uma relação autorizada entre:

```
Authenticated User → Enterprise Membership → Authorized Enterprise Context
```

O fato de o usuário possuir um papel administrativo não concede automaticamente acesso a outra Enterprise.

**Invariante**

Nenhuma autorização de recurso pode atravessar o Enterprise Boundary sem uma autoridade de plataforma explicitamente definida e auditada.

---

## 3. User ↔ Enterprise

### 3.1 Cardinalidade

O modelo canônico é:

```
User N:N Enterprise
```

Um usuário pode possuir memberships em múltiplas Enterprises.

Uma Enterprise pode possuir múltiplos usuários.

A relação de pertencimento não deve ser inferida exclusivamente a partir de um campo global `user.enterpriseId`.

### 3.2 Membership contextual

A autoridade efetiva deve ser derivada do contexto:

```
User + Enterprise + Role + Permissions + Resource Scope
```

O papel do usuário é contextual à Enterprise.

Portanto:

```
Role(User, Enterprise=A)  não implica  Role(User, Enterprise=B)
```

Uma futura implementação de RBAC deve preservar essa propriedade.

---

## 4. Authorization Chain

A cadeia normativa de autorização é:

```
Authenticated Identity
        ↓
Enterprise Membership
        ↓
Authorized Enterprise Context
        ↓
Effective Permission
        ↓
Resource Scope
        ↓
Resource → Enterprise relation
        ↓
Caller Enterprise === Resource Enterprise
        ↓
ALLOW / DENY
```

A ausência de qualquer elemento necessário para autorização deve resultar em **DENY / FAIL-CLOSED**.

---

## 5. Identity

A identidade utilizada para autorização deve ser derivada da autenticação confiável do servidor.

Não é permitido utilizar dados fornecidos pelo cliente como substituto da identidade autenticada.

São proibidos como fallback de segurança:

```
userId = 1
enterpriseId = 'ent_1'
propertyId = 1
```

Também é proibido utilizar:

```
req.body.userId
req.body.user_id
req.body.enterpriseId
req.query.enterpriseId
```

como autoridade final sobre quem o usuário é ou a qual tenant ele pertence.

Dados fornecidos pelo cliente podem representar contexto solicitado, mas nunca constituem autorização por si próprios.

---

## 6. Enterprise Context

### 6.1 Fonte server-authoritative

O sistema deve possuir uma única autoridade efetiva para o Enterprise Context.

A arquitetura atual possui carriers divergentes:

```
req.enterpriseId        — influenciado por path/query/header
req.user.enterpriseId   — derivado da identidade autenticada
```

Essa duplicidade é um problema de arquitetura a ser resolvido por **WS-04**.

### 6.2 Regra normativa

O Enterprise Context efetivo deverá ser:

- derivado de identidade autenticada;
- validado contra memberships autorizados;
- explicitamente selecionado quando o usuário possuir múltiplas Enterprises;
- validado antes do acesso ao recurso;
- rejeitado quando não puder ser comprovado.

O cliente não poderá transformar um identificador arbitrário em autoridade de tenant.

---

## 7. Resource Isolation

Todo recurso protegido deverá possuir uma relação determinística com uma Enterprise.

Exemplos conceituais:

```
Enterprise
 ├── Users / Memberships
 ├── Properties
 │    └── Accommodations
 ├── Bookings
 ├── Payments
 ├── Refund Requests
 ├── Earnings
 ├── Notifications
 └── outros recursos empresariais
```

Quando a relação Enterprise do recurso não puder ser determinada com segurança:

```
DENY
```

Não é permitido escolher automaticamente o primeiro recurso, primeiro tenant ou primeiro proprietário como fallback.

---

## 8. Property Scope

Property pode constituir um segundo nível de isolamento.

A cadeia poderá assumir:

```
Enterprise
    ↓
Property
    ↓
Resource
```

A autorização deverá respeitar:

```
Enterprise membership
        +
Property scope
        +
Effective permission
```

A existência de uma Enterprise válida não implica automaticamente acesso a todas as Properties daquela Enterprise.

A regra final de Property Authorization será definida no **WS-15 / WS-05** e não deve ser inventada durante implementação de WS-04.

---

## 9. RBAC / Permissions

**WS-15** é responsável pela reconciliação de:

- vocabulários de roles existentes;
- permissões existentes;
- equivalências;
- conflitos;
- estratégia de compatibilidade;
- autoridade server-side.

Foram identificados múltiplos vocabulários existentes, incluindo:

```
admin / manager / user
admin / staff
user / agent / client
```

e uma matriz frontend de permissões.

Essa matriz frontend **não constitui autoridade de segurança**.

A autorização definitiva deverá ocorrer server-side.

**ADD-1** permanece requisito obrigatório de reconciliação.

---

## 10. PLATFORM_SUPER_ADMIN

PLATFORM_SUPER_ADMIN é uma autoridade de plataforma distinta dos papéis empresariais.

Não deve ser tratado simplesmente como:

```
role === 'admin'
```

nem como extensão automática de um papel Enterprise.

### 10.1 Princípios

PLATFORM_SUPER_ADMIN:

- é único conforme decisão arquitetural registrada;
- possui autoridade de plataforma;
- deve possuir contexto explícito ao acessar dados de uma Enterprise;
- deve gerar auditoria privilegiada;
- **não** recebe bypass automático das regras financeiras;
- **não** elimina SoD;
- **não** transforma acesso de plataforma em pertencimento à Enterprise.

---

## 11. Platform Access × Enterprise Access

São conceitos diferentes:

```
Enterprise Authorization
    =
    "O que este usuário pode fazer nesta Enterprise?"

Platform Authorization
    =
    "O que esta autoridade pode fazer na plataforma?"
```

Uma autoridade de plataforma que acessa dados empresariais deve possuir contexto explícito e auditável.

O acesso de plataforma não deve criar implicitamente:

```
User → Enterprise Membership
```

---

## 12. MFA

O sistema já possui uma fundação de MFA identificada.

**WS-17** deve reutilizar a fundação existente quando possível.

Não deve ser criada uma segunda implementação de login MFA apenas para satisfazer Step-Up.

MFA responde à pergunta:

> "O usuário conseguiu provar um fator adicional de autenticação?"

---

## 13. Step-Up Authentication

Step-Up é distinto do login MFA.

Step-Up responde à pergunta:

> "A autorização do usuário foi fortalecida suficientemente para executar esta operação crítica neste momento?"

Operações críticas poderão exigir autenticação reforçada imediatamente antes da operação.

Step-Up deve ser:

- contextual;
- temporalmente limitado;
- auditável;
- associado à operação;
- independente da simples presença de uma sessão autenticada.

A definição exata das operações que exigem Step-Up pertence ao **WS-17**.

---

## 14. Device Security

O dispositivo constitui camada adicional de confiança.

O modelo conceitual é:

```
User
  +
Device Identity
  +
Device Credential / Binding
  +
Device State
```

Estados previstos:

```
UNKNOWN_DEVICE
PENDING_REGISTRATION
APPROVED
REVOKED
SUSPENDED
```

MAC address pode ser utilizado como sinal complementar, mas **não constitui sozinho uma identidade criptograficamente confiável do dispositivo**.

A autorização de dispositivo deve utilizar mecanismos mais fortes, como identidade de dispositivo e credencial/binding apropriado.

**WS-18** é responsável pelo desenho detalhado.

---

## 15. New Device Registration

Um novo dispositivo não deve adquirir automaticamente a autoridade do usuário apenas porque possui credenciais válidas.

O fluxo conceitual é:

```
Unknown Device
      ↓
Registration Request
      ↓
Additional Verification
      ↓
Approval
      ↓
Device Credential / Binding
      ↓
Approved Device
```

Revogação deve invalidar a confiança daquele dispositivo.

---

## 16. Critical Approval

Operações críticas poderão exigir confirmação reforçada através dos canais definidos no modelo de segurança:

- e-mail;
- SMS;
- WhatsApp;
- e-mail secundário.

A arquitetura deverá tratar esses canais explicitamente.

Não se deve presumir automaticamente que dois canais pertencentes à mesma infraestrutura são fatores independentes.

Cada challenge deverá ser:

- single-use;
- time-limited;
- associado à operação;
- associado ao contexto correto;
- auditável.

Critical Approval **não substitui SoD financeiro**.

---

## 17. Financial Segregation of Duties

As regras financeiras permanecem independentes da autoridade administrativa geral.

Em particular:

```
PLATFORM_SUPER_ADMIN
        ≠
automatic financial bypass
```

O sistema deve preservar separação entre:

```
requester
approver
executor
financial accounting
```

quando exigido pelo domínio.

Nenhuma implementação de Platform Admin, Step-Up ou Critical Approval poderá remover silenciosamente uma regra financeira existente.

---

## 18. Fail-Closed

Fail-Closed é uma invariante transversal.

Quando qualquer requisito obrigatório de segurança estiver ausente, inválido, ambíguo ou não comprovado:

```
DENY
```

Não são permitidos fallbacks silenciosos para:

```
ent_1
userId = 1
propertyId = 1
first enterprise
first property
first active property
```

Ausência de contexto **não** significa contexto global.

---

## 19. Namespace

O mecanismo de namespace permanece uma decisão arquitetural independente.

**ID da decisão**

```
D-ID02-NS
```

**Status**

```
PENDING OWNER DECISION
```

As alternativas atualmente estudadas permanecem:

```
A — INTEGER
B — UUID
C — Transitional Dual-Key / Bridge
```

Este contrato **não escolhe** nenhuma delas.

A escolha deverá ser feita posteriormente pelo Owner.

---

## 20. Namespace ≠ Authorization

Mesmo que UUID seja posteriormente escolhido, UUID **não** será considerado mecanismo de autorização.

UUID pode reduzir previsibilidade/enumerabilidade de identificadores, mas não substitui:

```
Identity
+
Membership
+
Permission
+
Enterprise Context
+
Resource Authorization
```

A autorização continuará sendo determinada pelo servidor.

---

## 21. Dual Migration Systems

Foi identificada a existência de dois conjuntos de migrations:

```
backend/drizzle/**
database/migrations/**
```

O contrato reconhece:

- `backend/drizzle` como **candidato a registro ativo**;
- `database/migrations` como **legado/histórico**.

A definição operacional definitiva do registry deverá ser reconciliada antes de qualquer nova alteração de schema.

Nenhuma migration é autorizada por este documento.

---

## 22. Authorization Tree

**ADD-3** permanece:

```
PENDING ARCHITECTURAL DECISION
```

Existem atualmente duas árvores relevantes:

```
server/modules/**
backend/server/modules/**
```

Não deverá ser criada uma **terceira** árvore `authorization/**` apenas para satisfazer este gate.

A localização canônica da futura autoridade transversal de autorização deverá ser definida como decisão arquitetural independente.

---

## 23. Separation of Responsibilities

Os seguintes workstreams possuem responsabilidades distintas:

**WS-04 — Enterprise Context**

Determina:

> "Qual Enterprise é o contexto autorizado desta requisição?"

**WS-15 — RBAC / Membership**

Determina:

> "Quais papéis e permissões este usuário possui nesse contexto?"

**WS-16 — Platform Super Admin**

Determina:

> "Esta identidade possui autoridade de plataforma?"

**WS-17 — Step-Up**

Determina:

> "Esta operação exige autenticação reforçada neste momento?"

**WS-18 — Device Security**

Determina:

> "Este dispositivo está autorizado?"

**WS-19 — Critical Approval**

Determina:

> "As confirmações críticas exigidas foram concluídas?"

Essas responsabilidades **não devem ser colapsadas** em um único middleware ou em uma simples verificação de role.

---

## 24. Reconciliation Requirements

Os seguintes requisitos permanecem obrigatórios:

**ADD-1**

WS-15 deve reconciliar os três vocabulários de roles e as permissões existentes, definindo equivalências, conflitos, canonicalização e compatibilidade.

**ADD-2**

WS-04 deve eliminar a dupla autoridade entre `req.enterpriseId` e `req.user.enterpriseId`.

**ADD-3**

A árvore canônica de autorização permanece pendente de decisão arquitetural.

**ADD-4**

O registro de migrations deve ser formalizado antes de novas alterações de schema.

---

## 25. Security Invariants

As seguintes invariantes são normativas:

```
I-01 — Enterprise é Tenant Boundary.
I-02 — User ↔ Enterprise é N.
I-03 — Role é contextual à Enterprise.
I-04 — Cliente não é autoridade final sobre identidade ou tenant.
I-05 — Recursos devem possuir relação determinística com Enterprise.
I-06 — Ausência de contexto obrigatório resulta em DENY.
I-07 — ent_1, userId=1 e propertyId=1 não podem ser fallbacks de segurança.
I-08 — UUID não substitui autorização.
I-09 — PLATFORM_SUPER_ADMIN não possui bypass financeiro automático.
I-10 — Step-Up não substitui autorização.
I-11 — Device approval não substitui autorização.
I-12 — Critical Approval não substitui SoD.
I-13 — Frontend permissions não constituem autoridade de segurança.
I-14 — Não será criada uma terceira árvore de autorização apenas para resolver este gate.
I-15 — Nenhuma decisão deste contrato autoriza migration APPLY ou DB write.
```

---

## 26. Dependency Graph

```
C36-ID-02 A/B
     │
     ├── Enterprise Boundary
     │
     ├── N:N Membership
     │
     └── Security Invariants
             │
             ├── D-ID02-NS
             │      └── OWNER DECISION PENDING
             │
             ├── ADD-3
             │      └── AUTHORIZATION TREE DECISION PENDING
             │
             ↓
          WS-04
             │
             ↓
          WS-15
             │
             ↓
            C5
             │
             ↓
          DE-14
             │
             ↓
        Implementation Plan
             │
             ↓
          CODE GATE
```

WS-16 depende adicionalmente da definição de autoridade de plataforma.

WS-17, WS-18 e WS-19 permanecem clusters próprios e não devem ser implementados incidentalmente em WS-04.

---

## 27. Current Gate State

```
C36-ID-02 A   — DECIDED
C36-ID-02 B   — DECIDED
D-ID02-NS     — PENDING OWNER DECISION

Security Contract
ACTIVE / PENDING_NAMESPACE_AND_AUTHORIZATION_TREE_RESOLUTION

WS-15 — MAPPED
WS-16 — MAPPED
WS-17 — MAPPED
WS-18 — MAPPED
WS-19 — MAPPED

WS-04  — BLOCKED
C5     — BLOCKED
DE-14  — BLOCKED

ADD-3  — PENDING ARCHITECTURAL DECISION

CODE              — NOT AUTHORIZED
MIGRATION APPLY   — BLOCKED
DATABASE WRITE    — BLOCKED
STAGING           — BLOCKED
DEPLOY            — BLOCKED
PRODUCTION        — BLOCKED
REAL GATEWAY      — BLOCKED
REAL REFUND       — BLOCKED
PAYOUT            — BLOCKED
COMMIT            — BLOCKED
PUSH              — BLOCKED
```

---

## 28. Gate Closure Criteria

Este contrato poderá ser considerado reconciliado quando:

1. D-ID02-NS receber decisão do Owner;
2. ADD-3 receber decisão arquitetural;
3. a localização/estado normativo do contrato estiver formalmente reconhecida pelos agentes;
4. WS-04 puder produzir seu Implementation Plan sem redefinir as invariantes deste documento;
5. WS-15 puder produzir seu contrato de Membership/RBAC sem redefinir o Tenant Boundary;
6. DE-14 puder ser replanejado contra o contrato consolidado.

Até lá:

```
Security Contract = ACTIVE, porém implementação bloqueada.
```

---

## 29. Non-Authorization Statement

Este documento é uma especificação de segurança e arquitetura.

Sua existência **não autoriza**:

```
criação de tabelas;
alteração de schema;
criação de migration;
aplicação de migration;
alteração de banco;
implementação de RBAC;
implementação de Platform Admin;
implementação de Device Security;
implementação de Step-Up;
implementação de Critical Approval;
alteração de pagamentos;
execução de refunds;
staging;
deploy;
produção;
commit;
push.
```

Qualquer uma dessas ações requer seu próprio Implementation Plan e respectivo Gate.

---

**Resultado do gate:** `C36-ID-02 SECURITY CONTRACT — DOCUMENT READY / CODE CLOSED.`

**Próximo ponto decisório:** `D-ID02-NS` (namespace) e `ADD-3` (árvore canônica de autorização). Até essas duas decisões, `WS-04` e `C5` permanecem bloqueados.

*Fim do contrato normativo.*