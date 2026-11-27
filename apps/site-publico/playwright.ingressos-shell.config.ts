import { defineConfig, devices } from '@playwright/test';

/**
 * E2E ingressos shell — sem webServer (use `npm run start` ou Docker com JWT_SECRET).
 * Evita `next dev` quando há drift CSS ou porta ocupada.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.FRONTEND_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});