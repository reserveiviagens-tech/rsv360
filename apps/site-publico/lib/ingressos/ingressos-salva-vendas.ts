import { formatIngressosPrice } from "./catalog-data"
import {
  INGRESSOS_SALVA_VENDAS_WHATSAPP_E164,
  type IngressosCartState,
} from "./ingressos-cart-types"
import { summarizeCart } from "./ingressos-cart-reducer"

export function buildSalvaVendasMessage(state: IngressosCartState): string {
  const { subtotal, totalItems } = summarizeCart(state)
  if (totalItems === 0) {
    return "Olá! Estou montando meu pacote de ingressos na Reservei Viagens e gostaria de ajuda para fechar."
  }

  const lines = Object.values(state.lines)
    .map((line) => `• ${line.qty}× ${line.label.replace(/^Ingresso\s+/i, "")}`)
    .join("\n")

  const visit = state.visitDateIso
    ? `\nData de visita: ${state.visitDateIso}`
    : "\nData de visita: a definir"

  return [
    "Olá! Quero ajuda para fechar meu carrinho de ingressos (Salva-Vendas).",
    visit,
    "",
    lines,
    "",
    `Subtotal: ${formatIngressosPrice(subtotal)}`,
  ].join("\n")
}

export function buildSalvaVendasWhatsAppUrl(state: IngressosCartState): string {
  const text = buildSalvaVendasMessage(state)
  return `https://wa.me/${INGRESSOS_SALVA_VENDAS_WHATSAPP_E164}?text=${encodeURIComponent(text)}`
}