/**
 * Legacy catalog UI (pre-Onda 4). Default off — data stays in catalog-data for F-023.
 * Enable only for regression compare: NEXT_PUBLIC_INGRESSOS_LEGACY_CATALOG=true
 */
export function isIngressosLegacyCatalogEnabled(): boolean {
  return process.env.NEXT_PUBLIC_INGRESSOS_LEGACY_CATALOG === "true"
}