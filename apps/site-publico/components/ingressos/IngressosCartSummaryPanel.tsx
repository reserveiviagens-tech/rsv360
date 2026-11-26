"use client"

import { Button, rsvColors } from "@rsv360/ui"
import { formatIngressosPrice } from "@/lib/ingressos/catalog-data"
import { IngressosSalvaVendasLink } from "./IngressosSalvaVendasLink"
import { IngressosVisitDateChips } from "./IngressosVisitDateChips"
import { useIngressosCart } from "./IngressosCartProvider"
import { useIngressosBeginCheckout } from "./use-ingressos-begin-checkout"

export function IngressosCartSummaryPanel({ className }: { className?: string }) {
  const { summary, state, clearAll } = useIngressosCart()
  const beginCheckout = useIngressosBeginCheckout()
  const lineEntries = Object.values(state.lines)

  return (
    <div className={className} data-testid="ingressos-cart-summary-panel">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold">Resumo de compra</h4>
        {lineEntries.length > 0 ? (
          <button
            type="button"
            className="text-xs font-medium text-gray-600 underline"
            data-testid="ingressos-cart-clear-all"
            onClick={clearAll}
          >
            Limpar
          </button>
        ) : null}
      </div>
      {lineEntries.length === 0 ? (
        <p className="mt-2 text-sm text-gray-600">Nenhum ingresso selecionado.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm text-gray-700">
          {lineEntries.map((line) => (
            <li key={line.ticketId} className="flex justify-between gap-2">
              <span className="truncate">
                {line.qty}× {line.label.replace(/^Ingresso\s+/i, "")}
              </span>
              <span className="shrink-0 tabular-nums">
                {formatIngressosPrice(line.qty * line.unitPrice)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <IngressosVisitDateChips />
      {summary.totalItems > 0 ? (
        <div
          className="mt-3 rounded-lg border bg-gray-50 p-3 text-sm text-gray-700"
          data-testid="ingressos-pre-checkout-upsell"
        >
          <p className="font-semibold" style={{ color: rsvColors.midnight }}>
            Explore também
          </p>
          <p className="mt-1 text-xs text-gray-600">
            Hospedagem com desconto para quem fecha ingresso hoje — detalhes no checkout.
          </p>
        </div>
      ) : null}
      <p className="mt-3 text-sm font-semibold">
        Total: {formatIngressosPrice(summary.subtotal)}
      </p>
      <IngressosSalvaVendasLink className="mt-3 inline-block text-sm font-medium underline" />
      <Button
        variant="primary"
        className="mt-4 w-full"
        type="button"
        data-testid="ingressos-begin-checkout"
        disabled={summary.totalItems === 0}
        onClick={() => beginCheckout(state)}
      >
        Ir para pagamento →
      </Button>
    </div>
  )
}