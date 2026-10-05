/**
 * C36-DE-06 — RefundRequest EXECUTION state machine + local RBAC (pure, no I/O).
 *
 * Scope: EXECUTION of an already APPROVED request. This module is deliberately
 * separate from `refund-request-state.ts` (the APPROVAL domain) because the
 * C36-DE-05 tests assert that execution states are never reachable from there.
 *
 * Status vocabulary mirrors 0062_refund_requests.sql (the SSOT):
 *
 *     approved --claim(CAS)--> executing --+--> executed   (provider accepted
 *                                           |               + finance applied)
 *                                           +--> failed     (provider refused /
 *                                                            errored — no money
 *                                                            moved)
 *
 * Notes that are part of the contract:
 *
 * 1. Direct `approved -> executed` / `approved -> failed` are NOT transitions
 *    here. The claim step is what serialises concurrent executors; allowing a
 *    direct jump would reopen the double-execution window.
 * 2. `failed` is the SSOT spelling of "execution failed". The SSOT has no
 *    `failed_execution` value and adding one would require a DB migration,
 *    which is out of scope for this gate (see the C36-DE-06 artifact).
 * 3. `executed` and `failed` are terminal. A failed execution is never retried
 *    automatically — a new RefundRequest is the way forward.
 *
 * A static test asserts this file stays pure: no I/O, no DB, no provider.
 */

export const REFUND_EXECUTION_SOURCES = [
  'approved',
  'executing',
  'executed',
  'failed',
] as const;
export type RefundExecutionSource = (typeof REFUND_EXECUTION_SOURCES)[number];

export const REFUND_EXECUTION_TARGETS = ['executing', 'executed', 'failed'] as const;
export type RefundExecutionTarget = (typeof REFUND_EXECUTION_TARGETS)[number];

/**
 * Allowed transitions for the execution domain.
 * Unknown statuses (draft / pending / under_review / rejected / cancelled /
 * expired) are absent on purpose: they are refused, never thrown on.
 */
const TRANSICOES: Record<string, readonly RefundExecutionTarget[]> = {
  approved: ['executing'],
  executing: ['executed', 'failed'],
  executed: [],
  failed: [],
};

/** True only when `para` is reachable from `de` inside the execution domain. */
export function execucaoPermitida(de: string, para: string): boolean {
  const allowed = TRANSICOES[de];
  if (!allowed) return false;
  return allowed.includes(para as RefundExecutionTarget);
}

/** Statuses reachable from `de` (empty for unknown / terminal statuses). */
export function execucoesDe(de: string): readonly RefundExecutionTarget[] {
  return TRANSICOES[de] ?? [];
}

/** True only when `de` may start a new execution attempt (the claim step). */
export function podeIniciarExecucao(de: string): boolean {
  return execucaoPermitida(de, 'executing');
}

/**
 * Local RBAC for execution. Mirrors `REFUND_DECISION_ROLES` on purpose: this
 * gate does not widen who may act on a refund request — a unit test asserts the
 * two lists stay identical, so a future role change must be made consciously.
 */
export const REFUND_EXECUTION_ROLES = ['admin', 'manager'] as const;

export type RefundExecutionRole = (typeof REFUND_EXECUTION_ROLES)[number];

export function canExecuteRefundRequest(role: string | null | undefined): boolean {
  if (!role) return false;
  return (REFUND_EXECUTION_ROLES as readonly string[]).includes(role);
}
