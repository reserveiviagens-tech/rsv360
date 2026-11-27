import {
  buildCheckoutDraft,
  checkoutCartFingerprint,
  deriveCheckoutIdempotencyKey,
} from "../ingressos-checkout-draft"
import { setLineQty } from "../ingressos-cart-reducer"
import { initialIngressosCartState } from "../ingressos-cart-types"
import { INGRESSOS_TICKETS } from "../catalog-data"

const metaFor = (id: string) => {
  const t = INGRESSOS_TICKETS.find((x) => x.id === id)!
  return { unitPrice: t.price, label: t.name }
}

describe("ingressos-checkout-draft", () => {
  it("deriveCheckoutIdempotencyKey is stable for same fingerprint", () => {
    const a = deriveCheckoutIdempotencyKey("hot-park:1|visit:2026-06-01")
    const b = deriveCheckoutIdempotencyKey("hot-park:1|visit:2026-06-01")
    expect(a).toBe(b)
    expect(a.startsWith("ing-")).toBe(true)
  })

  it("buildCheckoutDraft returns null for empty cart", () => {
    expect(buildCheckoutDraft(initialIngressosCartState)).toBeNull()
  })

  it("fingerprint changes when qty changes", () => {
    const base = setLineQty(initialIngressosCartState, "hot-park", 1, metaFor("hot-park"))
    const more = setLineQty(base, "hot-park", 2)
    expect(checkoutCartFingerprint(base)).not.toBe(checkoutCartFingerprint(more))
  })
})