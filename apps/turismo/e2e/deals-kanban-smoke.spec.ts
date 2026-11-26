import { test, expect } from '@playwright/test';
import { requireE2EAuthCredentials } from './auth-credentials';

const turismoBase = () =>
  (process.env.E2E_TURISMO_URL || 'http://localhost:3005').replace(/\/$/, '');

async function loginPartner(
  page: import('@playwright/test').Page,
  creds: { email: string; password: string },
) {
  await page.goto(`${turismoBase()}/login`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await page.locator('input[type="email"]').first().fill(creds.email);
  await page.locator('input[type="password"]').first().fill(creds.password);
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL(/\/(overview|dashboard)/, { timeout: 60_000 });
}

/**
 * Fatia B — Fase 3 scaffold (K1).
 * K3/K4 persistência: requer DnD + reload — próximo PR após repro estável.
 */
test.describe('Deals Kanban (K1 / Fatia B)', () => {
  test.beforeEach(async ({ page }) => {
    const creds = requireE2EAuthCredentials(test);
    await loginPartner(page, creds);
  });

  test('K1 — overview tab deals: colunas Kanban visíveis', async ({ page }) => {
    await page.goto(`${turismoBase()}/overview?tab=deals`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page).toHaveURL(/tab=deals/);
    await expect(page.locator('[data-stage]').first()).toBeVisible({
      timeout: 45_000,
    });
    const stages = await page.locator('[data-stage]').count();
    expect(stages).toBeGreaterThanOrEqual(3);
  });
});