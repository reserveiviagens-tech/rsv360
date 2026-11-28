import { buildSalvaVendasMessage, buildSalvaVendasWhatsAppUrl } from "../ingressos-salva-vendas"
import { setLineQty } from "../ingressos-cart-reducer"
import { initialIngressosCartState, INGRESSOS_SALVA_VENDAS_WHATSAPP_E164 } from "../ingressos-cart-types"
import { INGRESSOS_TICKETS } from "../catalog-data"

describe("ingressos-salva-vendas", () => {
  it("wa.me usa número Salva-Vendas e mensagem sem PII", () => {
    const t = INGRESSOS_TICKETS[0]!
    const state = setLineQty(initialIngressosCartState, t.id, 1, {
      unitPrice: t.price,
      label: t.name,
    })
    const url = buildSalvaVendasWhatsAppUrl({ ...state, visitDateIso: "2026-06-15" })
    expect(url).toContain(`wa.me/${INGRESSOS_SALVA_VENDAS_WHATSAPP_E164}`)
    expect(url).toContain(encodeURIComponent("2026-06-15"))
    const msg = buildSalvaVendasMessage({ ...state, visitDateIso: "2026-06-15" })
    expect(msg).not.toMatch(/@|cpf|senha/i)
  })
})