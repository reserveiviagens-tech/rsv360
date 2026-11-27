import { shouldShowIngressosUpsellModal } from "../ingressos-upsell-session"

describe("ingressos-upsell-session", () => {
  it("shows modal when not dismissed", () => {
    expect(shouldShowIngressosUpsellModal(false)).toBe(true)
  })

  it("skips modal after session dismiss", () => {
    expect(shouldShowIngressosUpsellModal(true)).toBe(false)
  })
})