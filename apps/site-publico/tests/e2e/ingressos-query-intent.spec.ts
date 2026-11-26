import { test, expect } from '@playwright/test';

test.describe('Ingressos query intent (F-022)', () => {
  test('?city= e ?rapido= exibem shell e combo IA', async ({ page }) => {
    await page.goto('/ingressos?city=caldas-novas&rapido=popular&utm_source=test');
    await expect(page.getByTestId('rsv-ingressos-shell')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('ingressos-combo-ia-card')).toBeVisible();
    await expect(page.getByTestId('ingressos-city-caldas-novas')).toBeVisible();
  });
});