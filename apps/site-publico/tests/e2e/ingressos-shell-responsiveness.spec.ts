import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'ultrawide', width: 1920, height: 1080 },
] as const;

test.describe('Ingressos Onda 4 shell — horizontal overflow', () => {
  for (const vp of viewports) {
    test(`sem overflow horizontal em ${vp.name} (${vp.width}×${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/ingressos');

      await expect(page.getByTestId('rsv-ingressos-shell')).toBeVisible({ timeout: 30_000 });

      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        const body = document.body;
        return {
          docScrollGtClient: doc.scrollWidth > doc.clientWidth,
          bodyScrollGtClient: body.scrollWidth > body.clientWidth,
          docScrollWidth: doc.scrollWidth,
          docClientWidth: doc.clientWidth,
          bodyScrollWidth: body.scrollWidth,
          bodyClientWidth: body.clientWidth,
        };
      });

      expect(
        overflow.docScrollGtClient,
        `documentElement scrollWidth (${overflow.docScrollWidth}) > clientWidth (${overflow.docClientWidth})`,
      ).toBe(false);
      expect(
        overflow.bodyScrollGtClient,
        `body scrollWidth (${overflow.bodyScrollWidth}) > clientWidth (${overflow.bodyClientWidth})`,
      ).toBe(false);
    });
  }
});