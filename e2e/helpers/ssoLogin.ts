import { expect, type Browser, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Shared SSO/PKCE browser login helper for TruLoad's live commercial-tenant e2e specs.
 *
 * TruLoad's codevertex-demo-synced demo accounts (commercial.operator@demo.codevertexafrica.com,
 * commercial.finance@demo.codevertexafrica.com) are SSO-ONLY: `AuthDemoSyncService` (truload-
 * backend) assigns each one a random, never-revealed local password, so a direct
 * `POST /api/v1/auth/login` can never authenticate them. The real path is PKCE/OIDC through
 * auth-api, and it only works by driving an actual browser through it:
 *
 *   1. `/{ORG}/auth`                         station picker (truload-frontend)
 *   2. click a station -> `/{ORG}/auth/login?station=...`
 *   3. click "Login with SSO"                -> full-page nav to auth-api `/api/v1/authorize`
 *   4. auth-api redirects (no session yet)   -> auth-ui hosted login form, accounts.codevertexafrica.com
 *   5. fill email/password, submit           -> auth-ui re-hits `/api/v1/authorize` (now authed)
 *   6. auth-api redirects with `?code=&state=` -> back to truload-frontend's `/{ORG}/auth/callback`
 *   7. callback page exchanges the code, stores an SSO exchange token, replaces to `/{ORG}/auth` again
 *   8. click the SAME station again          -> `selectStation()` fires with the SSO exchange token
 *      and returns a full truload JWT, stored in localStorage + redirects to the dashboard.
 *
 * See truload-quarry-offline-billing-bi-audit-2026-09-03.md's Phase 0 status notes for how this
 * was diagnosed (a prior version of this helper posted directly to /api/v1/auth/login, which 401s
 * every time for these accounts).
 */

export const API = process.env.TRULOAD_API_URL || 'https://truloadapi.codevertexafrica.com';
export const FRONTEND_BASE = (process.env.TRULOAD_FRONTEND_URL || 'https://truload.codevertexafrica.com').replace(/\/$/, '');
export const AUTH_UI_HOST = process.env.TRULOAD_AUTH_UI_URL || 'https://accounts.codevertexafrica.com';
export const ORG = process.env.E2E_COMMERCIAL_ORG_SLUG || 'TRULOAD-DEMO';
export const STATION_CODE = process.env.E2E_COMMERCIAL_STATION_CODE || 'DEMO-WB-01';
// The documented, non-secret, platform-wide demo-account password convention (also the ERP/POS
// demo password default). auth-api's own seed script (seed_users.go) defaults to this when
// SEED_DEMO_STAFF_PASSWORD isn't set, and it is NOT overridden anywhere in devops-k8s, so this is
// what's actually live.
export const DEMO_STAFF_PASSWORD = process.env.SEED_DEMO_STAFF_PASSWORD || 'DemoStaff2024!';

export const SCREENSHOT_DIR = path.join(process.cwd(), 'test-results', 'phase0-evidence');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

export function slug(role: string): string {
  return role.replace(/\s+/g, '-').toLowerCase();
}

/** Polls page.url() rather than relying on framework navigation events, since this flow mixes
 * full page loads (cross-origin hops) with Next.js client-side route changes (station picker). */
export async function waitForUrlMatch(page: Page, pattern: RegExp, timeoutMs = 30_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (pattern.test(page.url())) return;
    await page.waitForTimeout(250);
  }
  throw new Error(`Timed out waiting for URL matching ${pattern} (last url: ${page.url()})`);
}

/** The pre-login station-select page (/{ORG}/auth) renders either a single-station "Continue to
 * sign in" shortcut or a list of stations. Handles both, preferring a match on STATION_CODE. */
export async function selectStationOnPicker(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle').catch(() => {});
  const continueBtn = page.getByRole('button', { name: /continue to sign in/i });
  if (await continueBtn.count().then((c) => c > 0).catch(() => false)) {
    await continueBtn.first().click();
    return;
  }
  const stationButtons = page.locator('ul li button');
  const count = await stationButtons.count();
  for (let i = 0; i < count; i++) {
    const text = (await stationButtons.nth(i).innerText().catch(() => '')) || '';
    if (text.toUpperCase().includes(STATION_CODE.toUpperCase())) {
      await stationButtons.nth(i).click();
      return;
    }
  }
  if (count > 0) {
    await stationButtons.first().click();
    return;
  }
  throw new Error('No selectable station found on the station-select page');
}

/** Best-effort dismissal of auth-ui interstitials (one-time terms acceptance, passkey nudge) that
 * can appear after a successful credential submit and before the redirect back to TruLoad fires.
 * Account-state-dependent — not guaranteed to appear for an already-used demo account. */
export async function dismissAuthUiInterstitials(page: Page): Promise<void> {
  for (let i = 0; i < 4; i++) {
    if (!page.url().startsWith(AUTH_UI_HOST)) return;
    const candidates = [
      page.getByRole('button', { name: /^(accept|i agree|agree and continue)$/i }),
      page.getByRole('button', { name: /not now|skip|maybe later|remind me later/i }),
      page.getByRole('button', { name: /^continue$/i }),
    ];
    let clicked = false;
    for (const c of candidates) {
      if (await c.count().then((n) => n > 0).catch(() => false)) {
        const first = c.first();
        if (await first.isVisible().catch(() => false)) {
          await first.click().catch(() => {});
          clicked = true;
          break;
        }
      }
    }
    if (!clicked) return;
    await page.waitForTimeout(500);
  }
}

/**
 * Drives the real commercial-tenant SSO/PKCE login through the browser (see file header for the
 * full hop-by-hop flow) and returns the resulting truload access token plus the live page (left
 * open for further screenshot evidence — caller is responsible for closing it).
 */
export async function ssoLogin(browser: Browser, role: string, email: string, password: string): Promise<{ token: string; page: Page }> {
  const page = await browser.newPage();
  const shot = (name: string) =>
    page.screenshot({ path: path.join(SCREENSHOT_DIR, `${slug(role)}-${name}.png`), fullPage: true }).catch(() => {});

  try {
    await page.goto(`${FRONTEND_BASE}/${ORG}/auth`, { waitUntil: 'domcontentloaded' });
    await shot('01-station-picker');
    await selectStationOnPicker(page);

    // First pass: no SSO exchange token yet, so goToLogin() pushed us to the local login page.
    await waitForUrlMatch(page, new RegExp(`/${ORG}/auth/login`), 20_000);
    await shot('02-login-page');
    const ssoButton = page.getByRole('button', { name: /login with sso/i });
    await expect(ssoButton, `${role}: SSO login option should be offered for this commercial tenant`).toBeVisible({ timeout: 20_000 });
    await ssoButton.click();

    // Cross-origin hop: auth-api /authorize (no session) -> auth-ui's hosted login form.
    await waitForUrlMatch(page, new RegExp(AUTH_UI_HOST.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 30_000);
    await shot('03-sso-login-form');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    // Exact match: the form also has a "Sign in with passkey" button that /sign in/i also matches.
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    await dismissAuthUiInterstitials(page);

    // Redirect chain lands back on our callback page, which auto-exchanges the code and replaces
    // to the station picker again — now WITH an SSO exchange token in sessionStorage.
    await waitForUrlMatch(page, new RegExp(`${FRONTEND_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/${ORG}/auth(?:$|[/?])`), 45_000);
    await shot('04-back-at-station-picker-post-sso');
    await selectStationOnPicker(page);

    // Full session established -> lands on the dashboard (the default sso-return-to).
    await waitForUrlMatch(page, new RegExp(`/${ORG}/dashboard`), 30_000);
    await page.waitForLoadState('networkidle').catch(() => {});
    await shot('05-dashboard-post-login');

    const token = await page.evaluate(() => localStorage.getItem('truload_access_token'));
    expect(token, `${role}: SSO login should leave a truload_access_token in localStorage`).toBeTruthy();

    return { token: token!, page };
  } catch (err) {
    await shot('ERROR-state');
    await page.close().catch(() => {});
    throw err;
  }
}
