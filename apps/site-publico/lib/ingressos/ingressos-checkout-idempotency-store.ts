import type { IngressosCheckoutDraft } from "./ingressos-checkout-draft"

type StoredCheckout = {
  draft: IngressosCheckoutDraft
  storedAtIso: string
}

const checkoutDraftByKey = new Map<string, StoredCheckout>()

export function getIdempotentCheckoutDraft(key: string): StoredCheckout | undefined {
  return checkoutDraftByKey.get(key)
}

export function saveIdempotentCheckoutDraft(key: string, draft: IngressosCheckoutDraft): void {
  checkoutDraftByKey.set(key, { draft, storedAtIso: new Date().toISOString() })
}

export function resetIngressosCheckoutIdempotencyStoreForTests(): void {
  checkoutDraftByKey.clear()
}