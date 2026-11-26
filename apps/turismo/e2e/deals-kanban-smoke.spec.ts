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
 * Fatia B — smoke deals Kanban (K1, K3).
 * K4 backend restart: `npm run smoke:crm-deals-persistence:k4` (fora do Playwright).
 */
test.describe('Deals Kanban (Fatia B)', () => {
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

  test('K3 — deal API: Negociação persiste após reload (2.3.3)', async ({
    page,
  }) => {
    await page.goto(`${turismoBase()}/overview?tab=deals`, {
      waitUntil: 'domcontentloaded',
    });

    const apiBase =
      process.env.E2E_API_URL?.replace(/\/$/, '') || 'http://localhost:3002';
    const token = await page.evaluate(() =>
      localStorage.getItem('access_token') || localStorage.getItem('token'),
    );
    expect(token).toBeTruthy();

    const propertyName = `E2E Kanban ${Date.now()}`;
    const createRes = await page.request.post(`${apiBase}/api/v1/deals`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        propertyName,
        price: 1_600_000,
        stage: 'viewing',
        location: 'E2E',
      },
    });
    expect(createRes.ok(), `POST /deals: HTTP ${createRes.status()}`).toBeTruthy();
    const created = (await createRes.json()) as { data?: { id: string } };
    const dealId = created.data?.id;
    expect(dealId).toBeTruthy();

    await page.goto(`${turismoBase()}/overview?tab=deals&deal=${dealId}`, {
      waitUntil: 'domcontentloaded',
    });

    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { level: 2, name: propertyName }),
    ).toBeVisible({ timeout: 45_000 });

    const negotiationBtn = dialog.getByRole('button', {
      name: 'Negociação',
      exact: true,
    });
    await expect(negotiationBtn).toBeEnabled();

    const patchWait = page.waitForResponse(
      (res) =>
        res.request().method() === 'PATCH' &&
        /\/api\/v1\/deals\/[^/]+\/stage/.test(res.url()),
      { timeout: 30_000 },
    );
    await negotiationBtn.click();
    const patchRes = await patchWait;
    expect(patchRes.ok(), `PATCH stage: HTTP ${patchRes.status()}`).toBeTruthy();
    await expect(negotiationBtn).toBeDisabled({ timeout: 15_000 });

    await page.reload({ waitUntil: 'domcontentloaded' });
    const dialogAfter = page.getByRole('dialog');
    await expect(
      dialogAfter.getByRole('heading', { level: 2, name: propertyName }),
    ).toBeVisible({ timeout: 45_000 });
    await expect(
      dialogAfter.getByRole('button', { name: 'Negociação', exact: true }),
    ).toBeDisabled();

    await expect(
      page.locator('[data-stage="negotiation"]').getByText(propertyName).first(),
    ).toBeVisible({ timeout: 30_000 });
  });
});