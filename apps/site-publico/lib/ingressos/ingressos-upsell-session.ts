export const INGRESSOS_UPSELL_SESSION_KEY = "rsv-ingressos-upsell-seen-v1" as const

export function shouldShowIngressosUpsellModal(dismissedInSession: boolean): boolean {
  return !dismissedInSession
}

export function readUpsellDismissedFromSessionStorage(): boolean {
  if (typeof sessionStorage === "undefined") return false
  return sessionStorage.getItem(INGRESSOS_UPSELL_SESSION_KEY) === "1"
}

export function markIngressosUpsellSeenInSession(): void {
  if (typeof sessionStorage === "undefined") return
  sessionStorage.setItem(INGRESSOS_UPSELL_SESSION_KEY, "1")
}