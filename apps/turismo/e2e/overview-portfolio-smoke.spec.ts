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

test.describe('Overview — Rentals/Sales portfolio (H8 / H9)', () => {
  test.beforeEach(async ({ page }) => {
    const creds = requireE2EAuthCredentials(test);
    await loginPartner(page, creds);
  });

  test('H8 — aba rentals: badge API ou aviso demo', async ({ page }) => {
    await page.goto(`${turismoBase()}/overview?tab=rentals`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page).toHaveURL(/tab=rentals/);
    const apiBadge = page.getByText('API', { exact: true }).first();
    const demoBanner = page
      .getByRole('status')
      .filter({ hasText: /Portfólio em modo demonstração/i });
    await expect(apiBadge.or(demoBanner)).toBeVisible({ timeout: 45_000 });
  });

  test('H9 — aba sales: badge API ou aviso demo', async ({ page }) => {
    await page.goto(`${turismoBase()}/overview?tab=sales`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page).toHaveURL(/tab=sales/);
    const apiBadge = page.getByText('API', { exact: true }).first();
    const demoBanner = page
      .getByRole('status')
      .filter({ hasText: /Vendas em modo demonstração/i });
    await expect(apiBadge.or(demoBanner)).toBeVisible({ timeout: 45_000 });
  });

  test('H8c — deep link rentals preserva rental=unit-*', async ({ page }) => {
    await page.goto(`${turismoBase()}/overview?tab=rentals&rental=unit-1`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page).toHaveURL(/tab=rentals/);
    await expect(page).toHaveURL(/rental=unit-1/);
  });

  test('H9b — deep link sales preserva property=unit-*', async ({ page }) => {
    await page.goto(`${turismoBase()}/overview?tab=sales&property=unit-1`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page).toHaveURL(/tab=sales/);
    await expect(page).toHaveURL(/property=unit-1/);
  });
});