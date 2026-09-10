import { defineConfig } from '@playwright/test';

const backendBase =
  process.env.RSV_AUTH_V1_BACKEND_URL || 'http://localhost:3002';

export default defineConfig({
  testDir: './auth-v1',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: backendBase,
    extraHTTPHeaders: {
      Accept: 'application/json',
    },
  },
  reporter: [['list']],
});
