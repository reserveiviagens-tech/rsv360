/**
 * C36-DE-06 — SIMULATED refund gateway (in-process, offline, deterministic).
 *
 * This is the provider implementation injected into the execution service by
 * the composition layer of this gate. It exists so the whole execution slice —
 * success, rejection, error, timeout and replay — can be exercised without:
 *
 *   - any network call (the module performs no I/O of any kind),
 *   - any environment variable or external configuration,
 *   - any real charge or refund.
 *
 * It records every call it receives so tests can assert exactly-once
 * semantics, and it derives a deterministic `externalRef` from the request id
 * so a replayed call can never look like a second, distinct refund.
 *
 * Wiring a real payment provider into the execution path is a separate,
 * explicitly gated step and is deliberately NOT provided here.
 */

import type {
  RefundExecutionGateway,
  RefundExecutionGatewayRequest,
  RefundExecutionGatewayResult,
} from '../services/refund-request-execution.service';

export const SIMULATED_REFUND_GATEWAY_NAME = 'simulated-refund-gateway';

export type SimulatedRefundGatewayBehavior =
  /** Provider accepts the refund (default). */
  | { mode: 'accept' }
  /** Provider explicitly refuses it — nothing moves. */
  | { mode: 'reject'; code?: string; message?: string }
  /** Provider blows up — equivalent to an unexpected error. */
  | { mode: 'error'; message?: string }
  /** Provider never answers — equivalent to a timeout. */
  | { mode: 'timeout'; message?: string };

export type SimulatedRefundGateway = RefundExecutionGateway & {
  readonly name: typeof SIMULATED_REFUND_GATEWAY_NAME;
  /** Every request received, in order — the double-execution evidence. */
  readonly calls: RefundExecutionGatewayRequest[];
  readonly behavior: SimulatedRefundGatewayBehavior;
  /** Switch behaviour between attempts without rebuilding the harness. */
  setBehavior(behavior: SimulatedRefundGatewayBehavior): void;
  reset(): void;
};

export function createSimulatedRefundGateway(
  options: { behavior?: SimulatedRefundGatewayBehavior } = {},
): SimulatedRefundGateway {
  let behavior: SimulatedRefundGatewayBehavior = options.behavior ?? { mode: 'accept' };
  let calls: RefundExecutionGatewayRequest[] = [];

  return {
    name: SIMULATED_REFUND_GATEWAY_NAME,
    get calls() {
      return calls;
    },
    get behavior() {
      return behavior;
    },
    setBehavior(next: SimulatedRefundGatewayBehavior) {
      behavior = next;
    },
    reset() {
      calls = [];
    },
    async createRefund(request: RefundExecutionGatewayRequest): Promise<RefundExecutionGatewayResult> {
      calls.push({ ...request });

      switch (behavior.mode) {
        case 'reject':
          return {
            kind: 'rejected',
            code: behavior.code ?? 'REFUND_REJECTED',
            message: behavior.message ?? 'simulated provider refused the refund',
          };
        case 'error':
          throw new Error(behavior.message ?? 'simulated provider internal error');
        case 'timeout':
          throw new Error(behavior.message ?? 'ETIMEDOUT: simulated provider timed out');
        case 'accept':
        default:
          return {
            kind: 'accepted',
            // Deterministic: the same request can only ever map to one refund.
            externalRef: `sim_refund_${request.requestId}`,
            status: 'simulated_accepted',
          };
      }
    },
  };
}
