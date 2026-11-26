const DATE_FMT = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  timeZone: "America/Sao_Paulo",
})

export type IngressosVisitDateChip = {
  iso: string
  label: string
}

export function toVisitDateIso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function buildVisitDateChips(now: Date, count = 5): IngressosVisitDateChip[] {
  const chips: IngressosVisitDateChip[] = []
  for (let offset = 0; offset < count; offset += 1) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() + offset)
    const iso = toVisitDateIso(d)
    const label =
      offset === 0 ? "Hoje" : offset === 1 ? "Amanhã" : DATE_FMT.format(d)
    chips.push({ iso, label })
  }
  return chips
}