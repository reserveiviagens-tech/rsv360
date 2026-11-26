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
    baseURL: process.env.FRONTEND_URL || 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command:
      process.platform === 'win32'
        ? 'cmd /c "set JWT_SECRET=test-secret-key-for-e2e-local-only!!&& npm run start"'
        : 'JWT_SECRET=test-secret-key-for-e2e-local-only!! npm run start',
    url: 'http://127.0.0.1:3000/ingressos',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});