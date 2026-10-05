/**
 * C36-DE-08 — Read-only reconciliation probe double (in-process, offline).
 *
 * This double answers "does the provider hold this refund?" WITHOUT ever
 * creating one: it has no `createRefund`, performs no I/O and holds no
 * credential. Modes: confirmed (verifiable external confirmation), denied
 * (provider verifiably does not hold it), unknown (still ambiguous — the
 * reconciler must stay `executing`), throw (probe unreachable — same as
 * unknown, fail-closed).
 */

import type {
  ReconciliationProbe,
  ReconciliationProbeOutcome,
  ReconciliationProbeRequest,
} from '../services/refund-request-reconciliation.service';

export const RECONCILIATION_PROBE_NAME = 'reconciliation-probe-double';

export type ReconciliationProbeBehavior =
  | { mode: 'confirmed'; externalRef?: string; providerStatus?: string }
  | { mode: 'denied'; code?: string; message?: string }
  | { mode: 'unknown'; detail?: string }
  | { mode: 'throw'; message?: string };

export type ReconciliationProbeDouble = ReconciliationProbe & {
  readonly calls: ReconciliationProbeRequest[];
  readonly behavior: ReconciliationProbeBehavior;
  setBehavior(behavior: ReconciliationProbeBehavior): void;
  reset(): void;
};

export function createReconciliationProbeDouble(
  options: { behavior?: ReconciliationProbeBehavior } = {},
): ReconciliationProbeDouble {
  let behavior: ReconciliationProbeBehavior = options.behavior ?? { mode: 'unknown' };
  let calls: ReconciliationProbeRequest[] = [];
  return {
    name: RECONCILIATION_PROBE_NAME,
    get calls() {
      return calls;
    },
    get behavior() {
      return behavior;
    },
    setBehavior(next: ReconciliationProbeBehavior) {
      behavior = next;
    },
    reset() {
      calls = [];
    },
    async queryRefund(request: ReconciliationProbeRequest): Promise<ReconciliationProbeOutcome> {
      calls.push({ ...request });
      switch (behavior.mode) {
        case 'confirmed':
          return {
            kind: 'confirmed',
            externalRef: behavior.externalRef ?? `probe_ref_${request.requestId}`,
            providerStatus: behavior.providerStatus ?? 'refunded',
            confirmedAt: new Date().toISOString(),
          };
        case 'denied':
          return {
            kind: 'denied',
            code: behavior.code ?? 'REFUND_NOT_FOUND',
            message: behavior.message ?? 'provider does not hold this refund',
          };
        case 'throw':
          throw new Error(behavior.message ?? 'probe unreachable');
        case 'unknown':
        default:
          return { kind: 'unknown', detail: behavior.detail ?? 'PROBE_UNKNOWN' };
      }
    },
  };
}
