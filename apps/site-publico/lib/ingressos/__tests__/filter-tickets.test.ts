import { INGRESSOS_TICKETS } from "../catalog-data"
import { filterTicketsByIntent } from "../filter-tickets"

describe("filterTicketsByIntent", () => {
  it("filters hot-park intent in rio quente", () => {
    const result = filterTicketsByIntent(INGRESSOS_TICKETS, "rio-quente", "hot-park")
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe("hot-park")
  })

  it("returns empty when custo-beneficio has no ticket >=18% in rio quente", () => {
    const result = filterTicketsByIntent(INGRESSOS_TICKETS, "rio-quente", "custo-beneficio")
    expect(result).toHaveLength(0)
  })

  it("filters caldas parks for caldas-novas city", () => {
    const result = filterTicketsByIntent(INGRESSOS_TICKETS, "caldas-novas", null)
    expect(result.every((t) => t.location.toLowerCase().includes("caldas"))).toBe(true)
  })
})