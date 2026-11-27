import type { IngressosCartState, IngressosCartSummary } from "./ingressos-cart-types"

export type IngressosCheckoutGateResult =
  | { ok: true }
  | { ok: false; reason: "empty" | "missing-visit-date" }

export function evaluateIngressosCheckoutGate(
  state: IngressosCartState,
  summary: IngressosCartSummary,
): IngressosCheckoutGateResult {
  if (summary.totalItems === 0) {
    return { ok: false, reason: "empty" }
  }
  if (!state.visitDateIso) {
    return { ok: false, reason: "missing-visit-date" }
  }
  return { ok: true }
}