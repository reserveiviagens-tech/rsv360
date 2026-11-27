import type { IngressosCitySlug } from "./query-intent"
import { toVisitDateIso } from "./ingressos-visit-dates"

export type VisitDemandLevel = "available" | "high" | "sold_out"

export type VisitDemandInfo = {
  level: VisitDemandLevel
  maintenance: boolean
}

export function getVisitDemandForDate(iso: string, city: IngressosCitySlug): VisitDemandInfo {
  const day = Number.parseInt(iso.slice(8, 10), 10)
  if (Number.isNaN(day)) {
    return { level: "available", maintenance: false }
  }

  const cityBias = city === "rio-quente" ? 1 : city === "caldas-novas" ? 2 : 0
  const bucket = (day + cityBias) % 7

  if (bucket === 0) {
    return { level: "sold_out", maintenance: day % 2 === 0 }
  }
  if (bucket === 1 || bucket === 2) {
    return { level: "high", maintenance: false }
  }
  return { level: "available", maintenance: false }
}

export function isVisitDateSelectable(info: VisitDemandInfo): boolean {
  return info.level !== "sold_out"
}

export type VisitDemandCalendarDay = {
  iso: string
  demand: VisitDemandInfo
  selectable: boolean
}

export function buildDemandCalendarDays(
  now: Date,
  city: IngressosCitySlug,
  count = 35,
): VisitDemandCalendarDay[] {
  const days: VisitDemandCalendarDay[] = []
  for (let offset = 0; offset < count; offset += 1) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() + offset)
    const iso = toVisitDateIso(d)
    const demand = getVisitDemandForDate(iso, city)
    days.push({
      iso,
      demand,
      selectable: isVisitDateSelectable(demand),
    })
  }
  return days
}

export function findFirstSelectableDay(
  days: VisitDemandCalendarDay[],
): VisitDemandCalendarDay | undefined {
  return days.find((day) => day.selectable)
}