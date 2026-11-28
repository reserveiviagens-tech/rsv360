"use client"

import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"
import { Button, rsvColors, rsvLayout } from "@rsv360/ui"
import { formatIngressosPrice } from "@/lib/ingressos/catalog-data"
import {
  INGRESSOS_CHECKOUT_DRAFT_STORAGE_KEY,
  parseCheckoutDraftJson,
  type PersistedCheckoutDraft,
} from "@/lib/ingressos/ingressos-checkout-draft"
import { submitIngressosCheckoutDraft } from "@/lib/ingressos/ingressos-checkout-client"

export function IngressosCheckoutClient() {
  const [draft, setDraft] = useState<PersistedCheckoutDraft | null>(null)
  const [submitState, setSubmitState] = useState<"idle" | "ok" | "replay" | "error">("idle")

  useEffect(() => {
    const raw = sessionStorage.getItem(INGRESSOS_CHECKOUT_DRAFT_STORAGE_KEY)
    if (!raw) {
      setDraft(null)
      return
    }
    setDraft(parseCheckoutDraftJson(raw))
  }, [])

  useEffect(() => {
    if (!draft) return
    let cancelled = false
    void (async () => {
      const result = await submitIngressosCheckoutDraft(draft)
      if (cancelled) return
      if (!result.ok) {
        setSubmitState("error")
        return
      }
      setSubmitState(result.idempotentReplay ? "replay" : "ok")
    })()
    return () => {
      cancelled = true
    }
  }, [draft])

  if (!draft) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-gray-700">Seu carrinho está vazio ou expirou.</p>
        <Link href="/ingressos" className="mt-4 inline-block font-medium underline">
          Voltar ao catálogo
        </Link>
      </div>
    )
  }

  const lines = Object.values(draft.cart.lines)

  return (
    <motionShell>
      <main
        className={`mx-auto w-full ${rsvLayout.containerMaxClass} ${rsvLayout.containerPaddingClasses} py-10`}
        data-testid="ingressos-checkout-page"
      >
        <h1 className="text-2xl font-bold" style={{ color: rsvColors.midnight }}>
          Checkout de ingressos
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Revisão segura — pagamento online em breve. Rascunho idempotente:{" "}
          <span className="font-mono text-xs">{draft.idempotencyKey.slice(0, 12)}…</span>
        </p>

        <ul className="mt-6 space-y-2 rounded-xl border bg-white p-4 text-sm">
          {lines.map((line) => (
            <li key={line.ticketId} className="flex justify-between gap-2">
              <span>
                {line.qty}× {line.label.replace(/^Ingresso\s+/i, "")}
              </span>
              <span className="tabular-nums">{formatIngressosPrice(line.qty * line.unitPrice)}</span>
            </li>
          ))}
        </ul>

        {draft.cart.visitDateIso ? (
          <p className="mt-4 text-sm text-gray-700">
            Data da visita: <strong>{draft.cart.visitDateIso}</strong>
          </p>
        ) : null}

        <p className="mt-4 text-lg font-semibold">
          Total: {formatIngressosPrice(draft.subtotal)}
        </p>

        {submitState === "replay" ? (
          <p className="mt-2 text-sm text-amber-700" data-testid="ingressos-checkout-idempotent">
            Rascunho já registrado (idempotente).
          </p>
        ) : null}

        {submitState === "error" ? (
          <p className="mt-2 text-sm text-red-700">Não foi possível salvar o rascunho agora.</p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="primary" type="button" disabled>
            Finalizar pagamento (em breve)
          </Button>
          <Link href="/ingressos" className="text-sm font-medium underline self-center">
            Editar carrinho
          </Link>
        </div>
      </main>
    </motionShell>
  )
}

function motionShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: rsvColors.canvas }}>
      {children}
    </div>
  )
}