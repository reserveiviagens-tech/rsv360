import {
  buildDemandCalendarDays,
  findFirstSelectableDay,
  getVisitDemandForDate,
  isVisitDateSelectable,
} from "../ingressos-visit-demand"

describe("ingressos-visit-demand", () => {
  it("sold_out days are not selectable", () => {
    const info = getVisitDemandForDate("2026-06-05", "caldas-novas")
    expect(info.level).toBe("sold_out")
    expect(isVisitDateSelectable(info)).toBe(false)
  })

  it("high demand remains selectable", () => {
    const info = getVisitDemandForDate("2026-06-06", "caldas-novas")
    expect(info.level).toBe("high")
    expect(isVisitDateSelectable(info)).toBe(true)
  })

  it("buildDemandCalendarDays marks sold_out as not selectable", () => {
    const days = buildDemandCalendarDays(new Date("2026-06-01T12:00:00.000Z"), "multi-destino", 14)
    for (const day of days) {
      expect(day.selectable).toBe(isVisitDateSelectable(day.demand))
    }
  })

  it("findFirstSelectableDay returns a selectable iso", () => {
    const days = buildDemandCalendarDays(new Date("2026-06-01T12:00:00.000Z"), "rio-quente", 21)
    const first = findFirstSelectableDay(days)
    expect(first).toBeDefined()
    expect(first!.selectable).toBe(true)
  })
})