/**
 * C36-DE — RefundRequest approval state machine + local RBAC (pure, no I/O).
 *
 * Scope: APPROVAL only. `executing` / `executed` / `failed` / `expired` are terminal
 * here and belong to C36-DF (refund execution). No transition out of them is allowed.
 *
 * Status vocabulary mirrors 0062_refund_requests.sql (the SSOT). A static test asserts
 * equality between this list and the SQL CHECK, so neither side can drift silently.
 */

export const REFUND_REQUEST_STATUSES = [
  'draft',
  'pending',
  'under_review',
  'approved',
  'rejected',
  'cancelled',
  'executing',
  'executed',
  'failed',
  'expired',
] as const;

export type RefundRequestStatus = (typeof REFUND_REQUEST_STATUSES)[number];

/** Statuses a C36-DE decision may move a request into. */
export const REFUND_DECISION_TARGETS = ['under_review', 'approved', 'rejected'] as const;

export type RefundDecisionTarget = (typeof REFUND_DECISION_TARGETS)[number];

/**
 * Allowed transitions for the approval domain.
 * `approved` / `rejected` are terminal for C36-DE — reversing a decision is not a
 * transition, it is a new request.
 */
const TRANSICOES: Record<RefundRequestStatus, readonly RefundRequestStatus[]> = {
  draft: ['pending'],
  pending: ['under_review', 'approved', 'rejected'],
  under_review: ['approved', 'rejected'],
  approved: [],
  rejected: [],
  cancelled: [],
  executing: [],
  executed: [],
  failed: [],
  expired: [],
};

/** True only when `para` is reachable from `de` inside the approval domain. */
export function transicaoPermitida(de: string, para: string): boolean {
  const allowed = TRANSICOES[de as RefundRequestStatus];
  if (!allowed) return false;
  return allowed.includes(para as RefundRequestStatus);
}

/** Statuses reachable from `de` (empty for terminal statuses). */
export function transicoesDe(de: string): readonly RefundRequestStatus[] {
  return TRANSICOES[de as RefundRequestStatus] ?? [];
}

/**
 * Local RBAC for decisions. Kept scoped to this domain on purpose:
 * `supervisor` is NOT granted here, and the module-level gate is left untouched.
 */
export const REFUND_DECISION_ROLES = ['admin', 'manager'] as const;

export type RefundDecisionRole = (typeof REFUND_DECISION_ROLES)[number];

export function canDecideRefundRequest(role: string | null | undefined): boolean {
  if (!role) return false;
  return (REFUND_DECISION_ROLES as readonly string[]).includes(role);
}
