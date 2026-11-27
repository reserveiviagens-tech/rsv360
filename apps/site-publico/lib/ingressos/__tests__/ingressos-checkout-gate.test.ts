import { evaluateIngressosCheckoutGate } from "../ingressos-checkout-gate"
import { setLineQty, setVisitDate } from "../ingressos-cart-reducer"
import { initialIngressosCartState } from "../ingressos-cart-types"
import { INGRESSOS_TICKETS } from "../catalog-data"

describe("ingressos-checkout-gate", () => {
  const meta = {
    unitPrice: INGRESSOS_TICKETS[0]!.price,
    label: INGRESSOS_TICKETS[0]!.name,
  }

  it("blocks empty cart", () => {
    const result = evaluateIngressosCheckoutGate(initialIngressosCartState, {
      totalItems: 0,
      subtotal: 0,
    })
    expect(result).toEqual({ ok: false, reason: "empty" })
  })

  it("blocks missing visit date", () => {
    const cart = setLineQty(initialIngressosCartState, INGRESSOS_TICKETS[0]!.id, 1, meta)
    const result = evaluateIngressosCheckoutGate(cart, { totalItems: 1, subtotal: meta.unitPrice })
    expect(result).toEqual({ ok: false, reason: "missing-visit-date" })
  })

  it("allows checkout when date and items present", () => {
    let cart = setLineQty(initialIngressosCartState, INGRESSOS_TICKETS[0]!.id, 1, meta)
    cart = setVisitDate(cart, "2026-06-15")
    const result = evaluateIngressosCheckoutGate(cart, { totalItems: 1, subtotal: meta.unitPrice })
    expect(result).toEqual({ ok: true })
  })
})