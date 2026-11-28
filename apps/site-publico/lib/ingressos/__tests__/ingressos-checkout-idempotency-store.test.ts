import { buildCheckoutDraft } from "../ingressos-checkout-draft"
import {
  getIdempotentCheckoutDraft,
  resetIngressosCheckoutIdempotencyStoreForTests,
  saveIdempotentCheckoutDraft,
} from "../ingressos-checkout-idempotency-store"
import { setLineQty } from "../ingressos-cart-reducer"
import { initialIngressosCartState } from "../ingressos-cart-types"
import { INGRESSOS_TICKETS } from "../catalog-data"

describe("ingressos-checkout-idempotency-store", () => {
  beforeEach(() => {
    resetIngressosCheckoutIdempotencyStoreForTests()
  })

  it("replays mesmo draft para mesma chave", () => {
    const t = INGRESSOS_TICKETS[0]!
    const cart = setLineQty(initialIngressosCartState, t.id, 1, {
      unitPrice: t.price,
      label: t.name,
    })
    const draft = buildCheckoutDraft(cart)
    expect(draft).not.toBeNull()
    const key = "test-key-replay-12345678"
    saveIdempotentCheckoutDraft(key, { ...draft!, idempotencyKey: key })
    const replay = getIdempotentCheckoutDraft(key)
    expect(replay?.draft.subtotal).toBe(draft!.subtotal)
  })
})