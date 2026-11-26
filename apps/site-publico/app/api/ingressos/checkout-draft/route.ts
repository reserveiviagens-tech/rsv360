import { NextRequest, NextResponse } from "next/server"
import {
  buildCheckoutDraft,
  checkoutCartFingerprint,
  type IngressosCheckoutDraft,
} from "@/lib/ingressos/ingressos-checkout-draft"
import {
  ingressosCheckoutDraftBodySchema,
  type IngressosCheckoutDraftBody,
} from "@/lib/ingressos/ingressos-checkout-schema"
import {
  getIdempotentCheckoutDraft,
  saveIdempotentCheckoutDraft,
} from "@/lib/ingressos/ingressos-checkout-idempotency-store"
import type { IngressosCartState } from "@/lib/ingressos/ingressos-cart-types"

const IDEMPOTENCY_HEADER = "idempotency-key"

function cartFromBody(body: IngressosCheckoutDraftBody): IngressosCartState {
  const lines = Object.fromEntries(body.lines.map((line) => [line.ticketId, line]))
  return { lines, visitDateIso: body.visitDateIso }
}

export async function POST(request: NextRequest) {
  const idempotencyKey = request.headers.get(IDEMPOTENCY_HEADER)?.trim()
  if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 128) {
    return NextResponse.json(
      { success: false, error: "Idempotency-Key obrigatório (8–128 caracteres)." },
      { status: 400 },
    )
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "JSON inválido." }, { status: 400 })
  }

  const parsed = ingressosCheckoutDraftBodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Payload de checkout inválido." },
      { status: 400 },
    )
  }

  const body = parsed.data
  const cart = cartFromBody({
    visitDateIso: body.visitDateIso,
    lines: body.lines,
  })

  const fingerprint = checkoutCartFingerprint(cart)
  const draft = buildCheckoutDraft(cart)
  if (!draft) {
    return NextResponse.json({ success: false, error: "Carrinho vazio." }, { status: 400 })
  }

  if (Math.abs(draft.subtotal - body.subtotal) > 0.01) {
    return NextResponse.json({ success: false, error: "Subtotal divergente do servidor." }, { status: 400 })
  }

  const existing = getIdempotentCheckoutDraft(idempotencyKey)
  if (existing) {
    const sameFingerprint =
      checkoutCartFingerprint(existing.draft.cart) === fingerprint &&
      existing.draft.subtotal === body.subtotal
    if (!sameFingerprint) {
      return NextResponse.json(
        { success: false, error: "Chave idempotente já utilizada com outro carrinho." },
        { status: 409 },
      )
    }
    return NextResponse.json(
      {
        success: true,
        data: existing.draft,
        idempotentReplay: true,
        draftId: idempotencyKey,
      },
      { status: 200 },
    )
  }

  const toStore: IngressosCheckoutDraft = {
    ...draft,
    idempotencyKey,
  }
  saveIdempotentCheckoutDraft(idempotencyKey, toStore)

  return NextResponse.json(
    {
      success: true,
      data: toStore,
      idempotentReplay: false,
      draftId: idempotencyKey,
    },
    { status: 201 },
  )
}