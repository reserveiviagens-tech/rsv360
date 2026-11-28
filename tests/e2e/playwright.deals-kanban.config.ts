import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const turismoE2e = path.resolve(__dirname, '../../apps/turismo/e2e');

/**
 * Deals Kanban smoke (Fatia B — K1 scaffold).
 * Pré-requisitos: turismo :3005, backend :3002, E2E_AUTH_*.
 */
export default defineConfig({
  testDir: turismoE2e,
  testMatch: 'deals-kanban-smoke.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_TURISMO_URL || 'http://localhost:3005',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    navigationTimeout: 60_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  timeout: 90_000,
});