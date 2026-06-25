import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config for truload-frontend (tenant-scoped), adapted from pos-ui.
 * Override with env: BASE_URL, E2E_ORG_SLUG, E2E_EMAIL, E2E_PASSWORD, TRULOAD_API_URL.
 * Local runs are headed unless CI=true.
 */
const base = process.env.BASE_URL || 'https://truload.codevertexitsolutions.com';
const orgSlug = process.env.E2E_ORG_SLUG || 'KURA';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  outputDir: 'test-results',
  use: {
    baseURL: `${base}/${orgSlug}`,
    headless: process.env.CI === 'true',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  timeout: 90_000,
});
