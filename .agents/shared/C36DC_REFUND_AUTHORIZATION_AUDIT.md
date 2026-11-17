# C36-DC — Refund Authorization Audit

## 1. Gate Metadata

| Field | Value |
|-------|-------|
| Gate | `C36-DC` |
| Name | Refund Authorization Audit |
| Mode | **AUDIT-ONLY** |
| Date | 2026-09-28 (America/Sao_Paulo) |
| Repo | `reserveiviagens-tech/rsv360` |

## 2. Authorization Token

```text
GO → C36-DC
```

Present in owner message authorizing this gate only.

## 3. Execution Identity

| Role | Actor |
|------|-------|
| Executor | Cursor Agent — Agent Mode |
| Orchestrator | Antigravity |
| Governance | ChatGPT / C36 Autonomous Financial Governance Protocol |

## 4. Repository Reconciliation

| Item | Value |
|------|-------|
| Branch at audit start | `main` |
| HEAD | `95cccf10d87d9de84712d9e5f947e1bbad80b769` |
| Remote | `origin/main` aligned |
| Working tree | **DIRTY** with unrelated untracked files (not part of this gate) |
| Financial tip | C36-DB wiring #420 |
| Migrations 0058→0061 | unchanged; 0059 no `booking_payment` |
| Plan | `.agents/shared/C36_NEXT_30_GATES_PLAN_DC_TO_EF.md` |

## 5. GitHub / CI Reconciliation

| Item | Status |
|------|--------|
| #420 C36-DB | MERGED |
| #419 / #421 evidence docs | OPEN (docs only; not blocking audit) |
| Auth regression suite | `pr01-crit-auth.routes.test.ts` **PASS** (11 tests) locally during DC |

No merge performed by this gate. No production deploy.

## 6. Existing Refund Architecture

### Canonical backend money path (Express)

```text
ENTRYPOINT: POST/GET /api/v1/payments/refunds*
   ↓
ROUTER: backend/server/modules/payments/routes/index.ts
   AUTH: authenticateJwt + requireRole('admin','manager')  [EXISTE]
   ↓
CONTROLLER: refund.routes.ts  [EXISTE — thin handlers]
   AUTHORIZATION beyond role: NÃO EXISTE
   HUMAN APPROVAL: NÃO EXISTE
   ↓
SERVICE: RefundService.createRefund / processRefund / list / get / stats
   ↓
PROVIDER: getPaymentProvider().createRefund  (MP: throws not implemented)
   ↓
DB: insert refunds + update payments.status='refunded'
   ↓
C36-DB HOOK: reverseEarningForPaymentRefund(paymentId)  [EXISTE]
   ↓
EARNING REVERSED + LEDGER DEBIT  [EXISTE — proven in C36-DB]
```

### Parallel / legacy path (site-publico Next.js)

```text
ENTRYPOINT: POST|GET /api/payments/refund
   FILE: apps/site-publico/app/api/payments/refund/route.ts
   AUTHENTICATION in route: NÃO EXISTE
   AUTHORIZATION: NÃO EXISTE
   ↓
processRefund() in mercadopago-boleto-refund-reports.ts
   ↓
MercadoPago refundPayment + SQL UPDATE payments/bookings
   (legacy column names; NOT the C36 earning/ledger path)
```

### Staging-only local orchestrator (no gateway)

```text
applyEarningReversalOnPaymentRefund(paymentId)
   → mark payment refunded locally
   → reverseEarningForPaymentRefund
Used by: c36db probe + unit tests
NOT an HTTP authorization layer
```

### Architecture markers

| Stage | Status |
|-------|--------|
| ENTRYPOINT | EXISTE (multiple) |
| CONTROLLER / ROUTE | EXISTE |
| AUTHENTICATION (backend staff) | EXISTE (JWT) |
| AUTHORIZATION granular | NÃO EXISTE |
| HUMAN APPROVAL | NÃO EXISTE |
| SERVICE | EXISTE |
| PAYMENT status update | EXISTE |
| EARNING REVERSAL | EXISTE (C36-DB) |
| LEDGER DEBIT | EXISTE (C36-DB) |
| EXTERNAL GATEWAY (MP createRefund) | NÃO IMPLEMENTADO (throws) |
| EXTERNAL GATEWAY (site-publico MP) | EXISTE (separate stack) |

## 7. Refund Endpoint Map

| Method | Path | Auth | Permission | Service | Financial effect |
|--------|------|------|------------|---------|------------------|
| POST | `/api/v1/payments/refunds` | JWT + role admin\|manager | none granular | `RefundService.createRefund` | Provider refund attempt + DB refund row + payment→refunded + earning reverse |
| GET | `/api/v1/payments/refunds` | same | none | `listRefunds` | read |
| GET | `/api/v1/payments/refunds/:id` | same | none | `getRefund` | read |
| POST | `/api/v1/payments/refunds/:id/process` | same | none | `processRefund` | sets refund status approved (no provider call in code) |
| GET | `/api/v1/payments/refunds/stats` | same | none | `getRefundStats` | read (**route order risk**: declared after `/:id`) |
| POST | `/api/payments/refund` (site-publico) | **none in handler** | none | `processRefund` | MP refund + SQL updates (legacy) |
| GET | `/api/payments/refund` | **none in handler** | none | `getRefundHistory` | read |

Mount evidence:

- `backend/app.js` → `app.use('/api/v1/payments', paymentsRoutes)`
- Fail-closed staff gate: `routes/index.ts` L28–29

## 8. User / Role / Permission Map

### Users model

`backend/src/db/schema/existing.ts` — `users.role` varchar(50).  
No permissions table joined to refund in this path.

JWT payload carries: `userId`, `email`, `name`, `role`, `enterpriseId`  
(`server/middleware/auth.middleware.ts`).

### Observed roles in money router

Staff refund API allows only:

```text
admin | manager
```

Other roles (e.g. `user`, `anfitriao`) → **403** via `requireRole` (pattern proven in PR-01 tests).

### Permissions

```text
refund.request / refund.approve / refund.execute / ... = NÃO EXISTE
```

No `permission` check on refund routes — only coarse role.

### Map found

```text
USER
 ↓
ROLE (JWT claim)
 ↓
requireRole('admin','manager')   ← only gate for /api/v1/payments/refunds*
 ↓
RefundService (no actor/permission/scope re-check)
 ↓
financial effects
```

## 9. RBAC Analysis

| Mechanism | Present for refund? |
|-----------|---------------------|
| JWT authenticate | YES (backend payments staff) |
| Role allowlist admin/manager | YES |
| Granular permission | NO |
| Scope by enterprise/property/booking | NO in RefundService |
| Segregation requester≠approver | NO |
| Approval before execute | NO |

Classification of backend staff refund gate: **B — role-based, insufficient granularity**.

## 10. isAdmin Analysis

Refund routes do **not** use `isAdmin === true` literally.

They use:

```text
requireRole('admin', 'manager')
```

Equivalent breadth: any `admin` or `manager` JWT can create/list/process refunds for **any** paymentId supplied in body (no ownership check found).

Class: **C-like breadth via role**, not isAdmin flag; still **wide financial power**.

UI hooks (`apps/turismo` `useAuth.isAdmin`) exist for other screens; RefundManager uses **mock data**, not proven wired to `/api/v1/payments/refunds`.

## 11. RefundService Analysis

File: `backend/server/modules/payments/services/refund.service.ts`

| Check | Result |
|-------|--------|
| Caller | `refund.routes.ts` only (plus tests/mocks) |
| Auth inside service | **NONE** (relies on router) |
| Approval | **NONE** |
| Actor recording | **NONE** |
| Permission | **NONE** |
| Tenant/enterprise scope | **NONE** |
| Amount validation | **NONE** beyond DTO passthrough |
| Booking/payment binding validation | **NONE** (uses `data.paymentId` as given) |
| Idempotency on createRefund | **NOT EVIDENT** |
| Audit trail table | **NOT EVIDENT** in this service |
| Gateway | `provider.createRefund` — MP throws `Refund not implemented` |
| Reversal | `reverseEarningForPaymentRefund` after status update (C36-DB) |
| Ledger debit | via reversal TX |

**Confirmed:** execution path = **ADMIN/MANAGER → EXECUTION** (no REQUEST/REVIEW/APPROVAL domain).

## 12. Controller Analysis

`refund.routes.ts`:

- No input schema (Zod) observed on create body.
- No `req.user` passed into service.
- Errors → 500 with message.
- No tenant isolation.
- `GET /stats` registered **after** `GET /:id` → path `/stats` may be captured as id (**FINDING** routing).

## 13. Job Analysis

| Job | Refund create/execute? |
|-----|------------------------|
| Dedicated refund job | **NÃO EXISTE** (search: no job calling RefundService) |
| Webhook retry job | `WebhookService.retryFailedEvents` — payment confirm path, not refund create |

```text
JOB → TRIGGER → ACTOR → AUTHORIZATION → SERVICE → FINANCIAL EFFECT
= NÃO APLICÁVEL for refund execution jobs (none found)
```

## 14. Webhook Analysis

Public: `/api/v1/payments/webhooks/stripe|mercadopago`  
Auth: signature/HMAC (not human).

MP webhook earning hook (`webhook.service.ts` ~L185–200):

- Only acts when `status === 'approved'` → `confirmByExternalId` → earning create.
- **Does not** call `createRefund` / `reverseEarningForPaymentRefund` on refunded events.

```text
EXTERNAL EVENT (approved) ≠ HUMAN AUTHORIZATION
EXTERNAL EVENT (refunded) → no reversal wiring found in this webhook
```

## 15. Admin / Support Analysis

| Surface | Finding |
|---------|---------|
| Turismo nav `/refunds` | `requiresAuth: true` in route config |
| `RefundManager.tsx` | **Mock** UI with approve/reject states — **not** proven bound to live RefundService |
| `paymentService.refundPayment` | posts `/api/payments/${id}/refund` (turismo client) — parallel client path; backend target not the same as `/api/v1/payments/refunds` without further adapter evidence |
| site-publico refund API | No auth in route handler |

Human approval UI concepts exist only as **mock UX**, not as backend authorization domain.

## 16. Tenant / Organization Isolation

| Layer | Evidence |
|-------|----------|
| JWT may carry `enterpriseId` | populated on `req.user` |
| RefundService uses enterpriseId | **NO** |
| listRefunds filters by tenant | **NO** (global select) |
| createRefund checks payment.enterpriseId vs user | **NO** |

**FINDING:** staff refund API lacks tenant isolation in service layer → **POTENTIAL** cross-tenant refund if staff JWT is compromised or multi-tenant admins share roles.

## 17. IDOR Analysis

| Path | Finding |
|------|---------|
| `POST /refunds` with arbitrary `paymentId` | Any admin/manager can target any payment UUID — **CONFIRMED** absence of ownership check (code review) |
| `GET /refunds/:id` | No scope check — **CONFIRMED** |
| site-publico `POST /api/payments/refund` | Caller-supplied `payment_id`/`booking_id` + optional `refunded_by` — **CONFIRMED** no auth → **HIGH** unauthenticated call surface (if route reachable) |

Classification: not a full exploit PoC in this gate (audit-only, no live attack). Code-level **CONFIRMED control absence**.

## 18. Privilege Escalation Analysis

| Vector | Class |
|--------|-------|
| Spoof `x-user-role` on JWT routes | Mitigated by JWT role (PR-01 HK tests pattern) |
| Client-supplied `refunded_by` on site-publico | **POTENTIAL** actor forgery on legacy path |
| Alter amount/paymentId in POST body after “approval” | N/A — no approval object exists |
| Self-promote role via refund API | **NOT_REPRODUCED** / not in refund path |

## 19. Replay / Idempotency Analysis

| Path | State |
|------|-------|
| `RefundService.createRefund` | No idempotency key observed |
| `processRefund` | Status flip to approved; re-call behavior not uniquely constrained in code |
| `reverseEarningForPaymentRefund` | **Idempotent** (C36-DB / unit) |
| `applyEarningReversalOnPaymentRefund` | Idempotent payment + reversal |
| Webhook approved | Payment confirm + earning idempotent (prior gates) |

Duplicate `createRefund` may insert multiple refund rows / re-hit provider — **GAP** (document only).

## 20. Human Authorization — Current State

**Backend staff refund model found:**

```text
ADMIN|MANAGER
   ↓
EXECUTION
```

**NOT found:**

```text
REQUEST → REVIEW → HUMAN APPROVAL → EXECUTION
```

| Capability | State |
|------------|-------|
| RefundRequest domain | AUSENTE |
| Separate approve vs execute | AUSENTE |
| Human approval persistence | AUSENTE |
| Segregation of duties | AUSENTE |
| Amount-based approval limits | AUSENTE |
| Mock UI approval states | EXISTENTE (UI mock only) |

## 21. Authorization Gaps

| Gap | Evidence | Impact | Severity | Future gate |
|-----|----------|--------|----------|-------------|
| No RefundRequest domain | search + RefundService | Cannot separate request from execution | HIGH | C36-DD |
| No granular permissions | routes use role only | Coarse money control | HIGH | C36-DE |
| No human approval workflow | RefundService | Immediate execution by role | HIGH | C36-DF |
| No SoD | N/A | Same actor can request+execute | MEDIUM | C36-DG |
| No amount limits | N/A | Unlimited by policy | MEDIUM | C36-DH |
| No auth persistence | N/A | No historical authorized_by | HIGH | C36-DJ |
| No tenant scope on refund | RefundService | Cross-tenant risk | HIGH | C36-DI / later |
| site-publico refund unauthenticated | route.ts | Unauth financial surface | CRITICAL | harden before enabling |
| MP provider createRefund unimplemented | mercadopago.provider.ts L98–99 | Staff API fails at provider | INFO | product |
| Dual refund stacks | Express vs site-publico | Divergent auth/ledger behavior | HIGH | architecture |
| createRefund not idempotent | service | Duplicate refunds | HIGH | C36-DL area |
| Route `/stats` after `/:id` | refund.routes.ts | Stats may 404/wrong | LOW | fix later |

## 22. Security Findings

| ID | Title | Severity | Class |
|----|-------|----------|-------|
| DC-S1 | site-publico `/api/payments/refund` lacks auth in handler | CRITICAL | CONFIRMED control absence |
| DC-S2 | Staff refund = role-only, any paymentId | HIGH | CONFIRMED |
| DC-S3 | No tenant isolation on list/create refund | HIGH | CONFIRMED |
| DC-S4 | Actor spoofable via body on legacy path | HIGH | POTENTIAL |
| DC-S5 | No approval binding before execution | HIGH | CONFIRMED |
| DC-S6 | Dual stacks (ledger path vs legacy MP) | HIGH | CONFIRMED |
| DC-S7 | Webhook does not auto-refund (good) | INFO | CONFIRMED |

## 23. POLICY_REQUIRED Items

Do **not** invent values. Business must define:

1. Which roles may **request** vs **approve** vs **execute** refunds?
2. Is SoD mandatory for all amounts or only above threshold?
3. Amount thresholds / dual approval rules?
4. Tenant/enterprise scope rules for multi-property staff?
5. Is site-publico refund API still in product scope or deprecated?
6. Should gateway refund and ledger reversal always be single atomic product flow?
7. Retention/audit requirements for authorized_by evidence?

## 24. HARD_BLOCKS

```text
NONE during C36-DC execution
```

No production, gateway real call, financial mutation, migration, or 0059 edit performed by this gate.

## 25. Evidence Index

| Evidence | Location |
|----------|----------|
| Staff fail-closed | `backend/server/modules/payments/routes/index.ts` L24–35 |
| Refund handlers | `.../routes/refund.routes.ts` |
| RefundService + C36-DB hook | `.../services/refund.service.ts` |
| Auth middleware | `server/middleware/auth.middleware.ts` |
| Users.role | `backend/src/db/schema/existing.ts` |
| MP refund stub | `mercadopago.provider.ts` L98–99 |
| Webhook approved-only | `webhook.service.ts` ~185–200 |
| Legacy unauth refund | `apps/site-publico/app/api/payments/refund/route.ts` |
| Legacy processRefund | `mercadopago-boleto-refund-reports.ts` L161+ |
| Mock UI | `apps/turismo/src/components/payments/RefundManager.tsx` |
| PR-01 auth tests | PASS locally |
| C36-DB financial path | prior artifacts; not re-executed |

## 26. Final Gate Result

```text
C36-DC STATUS: PASS

AUDIT: PASS
REFUND AUTHORIZATION: ROLE-BASED ONLY (admin|manager) — no human approval domain
HUMAN APPROVAL: DOES_NOT_EXIST (backend); MOCK_ONLY (turismo UI)
RBAC: COARSE ROLE — no refund.* permissions
TENANT ISOLATION: FINDING (absent in RefundService)
IDOR: FINDING (control absence confirmed)
PRIVILEGE ESCALATION: FINDING (legacy actor fields) / PARTIAL
REFUND EXECUTION: ADMIN|MANAGER → EXECUTION (+ optional earning reverse)
FINANCIAL MUTATION: NONE (this gate)
REAL GATEWAY: NOT CALLED
REAL REFUND: NOT EXECUTED
PAYOUT: BLOCKED
PRODUCTION: UNTOUCHED
0059: UNCHANGED
IMPLEMENTATION: NONE
```

## 27. Recommended Next Gate

```text
C36-DD — Refund Request Domain
```

**Only after explicit `GO → C36-DD`.**

Do **not** start DE–DJ, DR, or EA from this PASS.

```text
C36-DC = PASS
PASS ≠ GO
C36-DD = BLOCKED / AGUARDA GO
```
