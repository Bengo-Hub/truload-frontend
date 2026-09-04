import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config for truload-frontend (tenant-scoped), adapted from pos-ui.
 * Override with env: BASE_URL, E2E_ORG_SLUG, E2E_EMAIL, E2E_PASSWORD, TRULOAD_API_URL.
 * Local runs are headed unless CI=true.
 */
const base = process.env.BASE_URL || 'https://truload.codevertexafrica.com';
const orgSlug = process.env.E2E_ORG_SLUG || 'KURA';

// These specs run against the LIVE production backend, not a local/staging instance — a tight,
// automation-speed request cadence is what tripped the live rate limiter hard enough to actually
// restart a backend pod (kubelet liveness-probe failures), not just theoretically risk it. slowMo
// paces every browser-driven action (click/fill/goto) the way a real operator would move through the
// UI; raw APIRequestContext calls (api.get/post, which bypass the browser entirely) still need their
// own explicit pacing — see e2e/helpers/ssoLogin.ts's humanDelay(), used before each one.
// Override with E2E_SLOW_MO_MS if a specific run needs different pacing (e.g. 0 for a fast local dev
// loop against a non-production backend).
const slowMo = process.env.E2E_SLOW_MO_MS ? parseInt(process.env.E2E_SLOW_MO_MS, 10) : 250;

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
    launchOptions: { slowMo },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  timeout: 120_000,
});
