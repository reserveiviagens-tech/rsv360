import type { IngressosCheckoutDraft } from "./ingressos-checkout-draft"
import type { IngressosCheckoutDraftBody } from "./ingressos-checkout-schema"

export type SubmitCheckoutDraftResult =
  | { ok: true; idempotentReplay: boolean; draftId: string }
  | { ok: false; status: number }

export async function submitIngressosCheckoutDraft(
  draft: IngressosCheckoutDraft,
): Promise<SubmitCheckoutDraftResult> {
  const body: IngressosCheckoutDraftBody = {
    visitDateIso: draft.cart.visitDateIso,
    lines: Object.values(draft.cart.lines),
    subtotal: draft.subtotal,
    totalItems: draft.totalItems,
  }

  const res = await fetch("/api/ingressos/checkout-draft", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": draft.idempotencyKey,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    return { ok: false, status: res.status }
  }

  const json = (await res.json()) as {
    idempotentReplay?: boolean
    draftId?: string
  }

  return {
    ok: true,
    idempotentReplay: Boolean(json.idempotentReplay),
    draftId: json.draftId ?? draft.idempotencyKey,
  }
}