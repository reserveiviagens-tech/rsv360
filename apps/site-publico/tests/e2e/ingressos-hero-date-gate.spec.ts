import { test, expect } from "@playwright/test"

test.describe("Ingressos hero date gate (F-026)", () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test("data no Hero + item no carrinho não dispara alerta de data obrigatória", async ({ page }) => {
    await page.goto("/ingressos?city=caldas-novas")
    await expect(page.getByTestId("rsv-ingressos-shell")).toBeVisible({ timeout: 30_000 })

    await page.getByTestId("ingressos-hero-date-trigger").click()
    await expect(page.getByTestId("ingressos-hero-demand-calendar")).toBeVisible()

    const selectable = page.locator('[data-testid^="ingressos-hero-demand-day-"]:not([disabled])').first()
    await expect(selectable).toBeVisible()
    await selectable.click()
    await page.keyboard.press("Escape")

    await page.getByRole("button", { name: "Aumentar quantidade" }).first().click()

    await page.getByTestId("ingressos-begin-checkout").click()
    await expect(page.getByTestId("ingressos-checkout-date-required")).toHaveCount(0)

    const upsell = page.getByTestId("ingressos-pre-checkout-upsell-modal")
    if (await upsell.isVisible().catch(() => false)) {
      await page.getByTestId("ingressos-upsell-continue").click()
    }

    await expect(page).toHaveURL(/\/ingressos\/checkout/, { timeout: 15_000 })
  })
})