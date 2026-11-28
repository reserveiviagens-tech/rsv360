import type { IngressosCartState } from "./ingressos-cart-types"
import { summarizeCart } from "./ingressos-cart-reducer"

export const INGRESSOS_CHECKOUT_DRAFT_STORAGE_KEY = "rsv-ingressos-checkout-draft-v1" as const

export type IngressosCheckoutDraft = {
  cart: IngressosCartState
  subtotal: number
  totalItems: number
  idempotencyKey: string
  createdAtIso: string
}

export function checkoutCartFingerprint(cart: IngressosCartState): string {
  const linePart = Object.keys(cart.lines)
    .sort()
    .map((id) => `${id}:${cart.lines[id]?.qty ?? 0}`)
    .join("|")
  return `${cart.visitDateIso ?? ""}#${linePart}`
}

export function deriveCheckoutIdempotencyKey(fingerprint: string): string {
  let hash = 2166136261
  for (let i = 0; i < fingerprint.length; i += 1) {
    hash ^= fingerprint.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `ing-${(hash >>> 0).toString(16).padStart(8, "0")}`
}

export function buildCheckoutDraft(cart: IngressosCartState): IngressosCheckoutDraft | null {
  const summary = summarizeCart(cart)
  if (summary.totalItems === 0) return null

  const fingerprint = checkoutCartFingerprint(cart)
  return {
    cart,
    subtotal: summary.subtotal,
    totalItems: summary.totalItems,
    idempotencyKey: deriveCheckoutIdempotencyKey(fingerprint),
    createdAtIso: new Date().toISOString(),
  }
}

export type PersistedCheckoutDraft = IngressosCheckoutDraft

export function parseCheckoutDraftJson(raw: string): PersistedCheckoutDraft | null {
  try {
    const parsed = JSON.parse(raw) as PersistedCheckoutDraft
    if (!parsed || typeof parsed.idempotencyKey !== "string") return null
    if (!parsed.cart || typeof parsed.cart !== "object") return null
    return parsed
  } catch {
    return null
  }
}