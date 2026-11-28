export const INGRESSOS_CITY_SLUGS = [
  "rio-quente",
  "caldas-novas",
  "multi-destino",
] as const

export type IngressosCitySlug = (typeof INGRESSOS_CITY_SLUGS)[number]

export const INGRESSOS_RAPIDO_SLUGS = [
  "hot-park",
  "combo",
  "criancas",
  "popular",
  "custo-beneficio",
] as const

export type IngressosRapidoSlug = (typeof INGRESSOS_RAPIDO_SLUGS)[number]

export type IngressosUrlIntent = {
  city: IngressosCitySlug
  rapido: IngressosRapidoSlug | null
}

const CITY_LABEL: Record<IngressosCitySlug, string> = {
  "rio-quente": "Rio Quente",
  "caldas-novas": "Caldas Novas",
  "multi-destino": "Multi-Destino",
}

export function citySlugToLabel(slug: IngressosCitySlug): string {
  return CITY_LABEL[slug]
}

export function isIngressosCitySlug(value: string | null | undefined): value is IngressosCitySlug {
  return INGRESSOS_CITY_SLUGS.includes(value as IngressosCitySlug)
}

export function isIngressosRapidoSlug(value: string | null | undefined): value is IngressosRapidoSlug {
  return INGRESSOS_RAPIDO_SLUGS.includes(value as IngressosRapidoSlug)
}

export function parseIngressosSearchParams(
  params: URLSearchParams | Readonly<URLSearchParams>,
): IngressosUrlIntent {
  const cityParam = params.get("city")
  const rapidoParam = params.get("rapido")

  const city: IngressosCitySlug = isIngressosCitySlug(cityParam) ? cityParam : "multi-destino"
  const rapido = isIngressosRapidoSlug(rapidoParam) ? rapidoParam : null

  return { city, rapido }
}

/** Remove only `rapido`; preserve city, utm_*, and other campaign params. */
export function stripRapidoFromSearchParams(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params.toString())
  next.delete("rapido")
  return next
}

export function buildIngressosPath(pathname: string, params: URLSearchParams): string {
  const q = params.toString()
  return q ? `${pathname}?${q}` : pathname
}