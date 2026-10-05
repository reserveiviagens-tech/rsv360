/**
 * C36-DE-06 — Composition root for the RefundRequest execution slice.
 *
 * This is the ONLY place where the execution use case meets real infrastructure,
 * and it wires exactly three collaborators:
 *
 *   1. ports      — Drizzle compare-and-set writers (existing tables, no DDL);
 *   2. gateway    — the SIMULATED provider (offline, credential-free);
 *   3. financial  — the existing local orchestrator that marks the payment
 *                   refunded and reverses the partner earning + ledger debit
 *                   (`applyEarningReversalOnPaymentRefund`, C36-DB/C36-CR,
 *                   idempotent, never touches payout).
 *
 * Deliberately absent: any resolution of a real payment provider. This gate
 * ships simulated execution only — wiring a real provider is a separate,
 * explicitly gated step.
 */

import { applyEarningReversalOnPaymentRefund } from '../../../../../server/modules/partners/services/partner-earning-on-refund.service';
import { createSimulatedRefundGateway } from '../lib/simulated-refund.gateway';
import { createDrizzleRefundExecutionPorts } from './refund-request-execution.ports';
import type {
  ApplyFinancialUpdate,
  FinancialUpdateOutcome,
  RefundExecutionDeps,
} from './refund-request-execution.service';

/**
 * Maps the local earning/ledger reversal result onto the execution vocabulary.
 * `reversed` / `idempotent` / `skipped` are all non-throwing outcomes: the
 * financial step completed (there may simply be nothing to reverse). Only a
 * thrown error signals that the step must be resumed later.
 */
const applyFinancialUpdate: ApplyFinancialUpdate = async ({ paymentId }) => {
  const result = await applyEarningReversalOnPaymentRefund(paymentId);
  const reversal = result.reversal;

  let outcome: FinancialUpdateOutcome;
  switch (reversal.kind) {
    case 'reversed':
      outcome = { kind: 'applied', detail: 'earning_reversed_and_debited' };
      break;
    case 'idempotent':
      outcome = { kind: 'idempotent', detail: 'reversal_already_applied' };
      break;
    default:
      outcome = { kind: 'skipped', detail: reversal.reason };
      break;
  }

  return {
    ...outcome,
    detail: `${outcome.detail ?? 'ok'}|payment_status=${result.paymentStatus}`,
  };
};

export function createProductionExecutionDeps(): RefundExecutionDeps {
  return {
    ports: createDrizzleRefundExecutionPorts(),
    gateway: createSimulatedRefundGateway(),
    applyFinancialUpdate,
  };
}
