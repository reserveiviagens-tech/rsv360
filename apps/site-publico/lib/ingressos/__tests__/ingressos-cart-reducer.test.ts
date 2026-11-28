import { INGRESSOS_TICKETS } from "../catalog-data"
import {
  addComboTicketIds,
  clearAll,
  clearLine,
  getLineQty,
  setLineQty,
  setVisitDate,
  summarizeCart,
} from "../ingressos-cart-reducer"
import { initialIngressosCartState } from "../ingressos-cart-types"

const metaFor = (id: string) => {
  const t = INGRESSOS_TICKETS.find((x) => x.id === id)!
  return { unitPrice: t.price, label: t.name }
}

const catalog = Object.fromEntries(
  INGRESSOS_TICKETS.map((t) => [t.id, { unitPrice: t.price, label: t.name }]),
)

describe("ingressos-cart-reducer", () => {
  it("setLineQty clamps to 0–20 and removes line at 0", () => {
    let state = setLineQty(initialIngressosCartState, "hot-park", 2, metaFor("hot-park"))
    expect(getLineQty(state, "hot-park")).toBe(2)
    state = setLineQty(state, "hot-park", 0)
    expect(getLineQty(state, "hot-park")).toBe(0)
    expect(state.lines["hot-park"]).toBeUndefined()
  })

  it("rejects qty above max via clamp", () => {
    const state = setLineQty(initialIngressosCartState, "hot-park", 99, metaFor("hot-park"))
    expect(getLineQty(state, "hot-park")).toBe(20)
  })

  it("summarizeCart totals items and subtotal", () => {
    let state = setLineQty(initialIngressosCartState, "hot-park", 2, metaFor("hot-park"))
    state = setLineQty(state, "kawana-park", 1, metaFor("kawana-park"))
    const summary = summarizeCart(state)
    expect(summary.totalItems).toBe(3)
    expect(summary.subtotal).toBe(189 * 2 + 85)
  })

  it("clearAll and clearLine work", () => {
    let state = setLineQty(initialIngressosCartState, "hot-park", 1, metaFor("hot-park"))
    state = clearLine(state, "hot-park")
    expect(Object.keys(state.lines)).toHaveLength(0)
    state = setLineQty(state, "hot-park", 1, metaFor("hot-park"))
    state = clearAll(state)
    expect(state.lines).toEqual({})
  })

  it("setVisitDate preserves lines", () => {
    let state = setLineQty(initialIngressosCartState, "hot-park", 1, metaFor("hot-park"))
    state = setVisitDate(state, "2026-06-01")
    expect(state.visitDateIso).toBe("2026-06-01")
    expect(getLineQty(state, "hot-park")).toBe(1)
  })

  it("addComboTicketIds increments each combo ticket by 1", () => {
    const ids = ["hot-park", "kawana-park"]
    const state = addComboTicketIds(initialIngressosCartState, ids, catalog)
    expect(getLineQty(state, "hot-park")).toBe(1)
    expect(getLineQty(state, "kawana-park")).toBe(1)
    const again = addComboTicketIds(state, ids, catalog)
    expect(getLineQty(again, "hot-park")).toBe(2)
  })
})