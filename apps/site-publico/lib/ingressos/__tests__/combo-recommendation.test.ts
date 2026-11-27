import { INGRESSOS_TICKETS } from "../catalog-data"
import { buildComboIaRecommendation } from "../combo-recommendation"

describe("buildComboIaRecommendation", () => {
  it("returns 15% savings on bundled tickets", () => {
    const rec = buildComboIaRecommendation(INGRESSOS_TICKETS, "multi-destino")
    expect(rec).not.toBeNull()
    expect(rec!.discountPercent).toBe(15)
    expect(rec!.savings).toBeGreaterThan(0)
    expect(rec!.discountedTotal).toBeLessThan(rec!.subtotal)
  })

  it("includes at least one ticket id", () => {
    const rec = buildComboIaRecommendation(INGRESSOS_TICKETS, "caldas-novas")
    expect(rec?.ticketIds.length).toBeGreaterThanOrEqual(1)
  })
})