import {
  INGRESSOS_CART_STORAGE_KEY,
  initialIngressosCartState,
  type IngressosCartState,
} from "./ingressos-cart-types"

export function serializeCartState(state: IngressosCartState): string {
  return JSON.stringify(state)
}

export function parseCartStateJson(raw: string): IngressosCartState | null {
  try {
    const parsed = JSON.parse(raw) as Partial<IngressosCartState>
    if (!parsed || typeof parsed !== "object" || !parsed.lines) return null
    return {
      lines: parsed.lines,
      visitDateIso: parsed.visitDateIso ?? null,
    }
  } catch {
    return null
  }
}

export function readCartFromSessionStorage(): IngressosCartState | null {
  if (typeof sessionStorage === "undefined") return null
  const raw = sessionStorage.getItem(INGRESSOS_CART_STORAGE_KEY)
  if (!raw) return null
  return parseCartStateJson(raw)
}

export function writeCartToSessionStorage(state: IngressosCartState): void {
  if (typeof sessionStorage === "undefined") return
  sessionStorage.setItem(INGRESSOS_CART_STORAGE_KEY, serializeCartState(state))
}

export function mergeHydratedCart(stored: IngressosCartState | null): IngressosCartState {
  if (!stored) return initialIngressosCartState
  return {
    lines: stored.lines ?? {},
    visitDateIso: stored.visitDateIso ?? null,
  }
}