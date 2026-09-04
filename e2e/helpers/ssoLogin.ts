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
export const ORG = process.env.E2E_COMMERCIAL_ORG_SLUG || 'CODEVERTEX-DEMO';
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

/**
 * "Think time" before a raw APIRequestContext call (api.get/post/etc.) — these bypass the browser
 * entirely, so playwright.config.ts's launchOptions.slowMo (which paces real click/fill/goto actions)
 * never touches them. Without an explicit pause here, a test can fire several backend requests back
 * to back in milliseconds, which is exactly the automation-speed pattern that tripped the live rate
 * limiter hard enough to restart a backend pod (2026-09-05 — kubelet liveness-probe failures, not
 * just a theoretical risk). Call this immediately before every direct api.* call in a live-backend
 * spec. Randomized (not a fixed sleep) so a whole suite run doesn't fall into its own predictable,
 * still-inhuman rhythm. Override the range with E2E_HUMAN_DELAY_MIN_MS/E2E_HUMAN_DELAY_MAX_MS.
 */
export async function humanDelay(minMs?: number, maxMs?: number): Promise<void> {
  const min = minMs ?? (process.env.E2E_HUMAN_DELAY_MIN_MS ? parseInt(process.env.E2E_HUMAN_DELAY_MIN_MS, 10) : 400);
  const max = maxMs ?? (process.env.E2E_HUMAN_DELAY_MAX_MS ? parseInt(process.env.E2E_HUMAN_DELAY_MAX_MS, 10) : 1200);
  const delay = min + Math.random() * (max - min);
  await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Waits for the dashboard to be MEANINGFULLY loaded, not just navigated-to. `waitUntil:
 * 'networkidle'` on its own is not sufficient (confirmed via live screenshots, 2026-09-04) - a
 * Next.js page can finish its initial network-idle window before its client-side data queries
 * (station list, stats) have actually resolved and rendered, especially over a real network to a
 * live backend rather than a local dev server. Waits for the Station filter's placeholder text
 * ("All stations", `StationSelectFilter.tsx`'s default) to actually appear in the DOM - a real
 * signal that the stations query settled, not just that requests briefly went quiet.
 */
export async function waitForDashboardReady(page: Page, timeoutMs = 20_000): Promise<void> {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByText('All stations', { exact: false }).first().waitFor({ state: 'visible', timeout: timeoutMs }).catch(() => {
    // Not fatal on its own - some roles/pages may not render this exact filter - but the caller's
    // own assertions (e.g. a real Stations API call) are what actually prove correctness. This is
    // purely about giving the UI evidence screenshot a fair chance to show real content.
  });
  // A brief settle after the marker appears - React can still be painting dependent widgets
  // (charts, stat cards) for a moment after the first visible station-filter text shows up.
  await page.waitForTimeout(750);
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
 * sign in" shortcut or a list of stations. Handles both, preferring a match on stationCode (default
 * STATION_CODE — pass a different outlet's code, e.g. ENF-WB-01, for a non-commercial-primary
 * persona sharing the same codevertex-demo tenant). */
export async function selectStationOnPicker(page: Page, stationCode: string = STATION_CODE): Promise<void> {
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
    if (text.toUpperCase().includes(stationCode.toUpperCase())) {
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

/** One dismissal pass: checks for a currently-visible auth-ui interstitial (one-time terms
 * acceptance, passkey setup nudge) and clicks past it if found. Returns true if it acted on
 * something, false if nothing was found this pass. Never throws. */
async function dismissOneInterstitial(page: Page): Promise<boolean> {
  if (!page.url().startsWith(AUTH_UI_HOST)) return false;

  // The real "Terms & Privacy" interstitial (confirmed via live screenshot, 2026-09-04) requires
  // checking a "I have read and agree..." checkbox BEFORE "Accept & Continue" does anything - the
  // button text doesn't match any of the generic patterns below (it's neither an exact "Accept"
  // nor an exact "Continue"), so this must be handled explicitly, first.
  const termsCheckbox = page.getByRole('checkbox');
  if (await termsCheckbox.count().then((n) => n > 0).catch(() => false)) {
    const first = termsCheckbox.first();
    if (await first.isVisible().catch(() => false) && !(await first.isChecked().catch(() => true))) {
      await first.check().catch(() => {});
    }
  }
  const acceptAndContinue = page.getByRole('button', { name: /accept\s*&?\s*continue/i });
  if (await acceptAndContinue.count().then((n) => n > 0).catch(() => false)) {
    const first = acceptAndContinue.first();
    if (await first.isVisible().catch(() => false)) {
      await first.click().catch(() => {});
      return true;
    }
  }

  // The passkey setup nudge (PasskeySetupNudge.tsx, confirmed via source read 2026-09-04) is
  // triggered by an ASYNC server round-trip (GET /webauthn/credentials) AFTER the Sign In click,
  // so it can render well after an early one-shot dismissal pass would already have given up -
  // this is why dismissal must be interleaved with the redirect wait, not run once beforehand.
  // Its "Set up passkey"/"Set up fingerprint login" title has no exact-match "Continue"/"Accept"
  // button, only "Maybe later" (dismiss) and "Set up now" (do NOT click - would start a real
  // WebAuthn ceremony with no authenticator attached, hanging the test).
  const maybeLater = page.getByRole('button', { name: /^maybe later$/i });
  if (await maybeLater.count().then((n) => n > 0).catch(() => false)) {
    const first = maybeLater.first();
    if (await first.isVisible().catch(() => false)) {
      await first.click().catch(() => {});
      return true;
    }
  }

  const candidates = [
    page.getByRole('button', { name: /^(accept|i agree|agree and continue)$/i }),
    page.getByRole('button', { name: /not now|skip|remind me later/i }),
    page.getByRole('button', { name: /^continue$/i }),
  ];
  for (const c of candidates) {
    if (await c.count().then((n) => n > 0).catch(() => false)) {
      const first = c.first();
      if (await first.isVisible().catch(() => false)) {
        await first.click().catch(() => {});
        return true;
      }
    }
  }
  return false;
}

/** Polls page.url() exactly like waitForUrlMatch, but ALSO dismisses any auth-ui interstitial
 * (terms acceptance, passkey nudge) that appears during the wait - both are account-state- and
 * timing-dependent (the passkey nudge in particular only shows up after an async credentials
 * check completes), so a single dismissal pass before this wait is not reliable. */
export async function waitForRedirectDismissingInterstitials(
  page: Page,
  pattern: RegExp,
  timeoutMs = 45_000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (pattern.test(page.url())) return;
    const acted = await dismissOneInterstitial(page);
    await page.waitForTimeout(acted ? 500 : 250);
  }
  throw new Error(`Timed out waiting for URL matching ${pattern} (last url: ${page.url()})`);
}

/**
 * Drives the real commercial-tenant SSO/PKCE login through the browser (see file header for the
 * full hop-by-hop flow) and returns the resulting truload access token plus the live page (left
 * open for further screenshot evidence — caller is responsible for closing it).
 */
export async function ssoLogin(
  browser: Browser,
  role: string,
  email: string,
  password: string,
  orgSlug: string = ORG,
  stationCode: string = STATION_CODE,
): Promise<{ token: string; page: Page }> {
  const page = await browser.newPage();
  const shot = (name: string) =>
    page.screenshot({ path: path.join(SCREENSHOT_DIR, `${slug(role)}-${name}.png`), fullPage: true }).catch(() => {});

  try {
    await page.goto(`${FRONTEND_BASE}/${orgSlug}/auth`, { waitUntil: 'domcontentloaded' });
    await shot('01-station-picker');
    await selectStationOnPicker(page, stationCode);

    // First pass: no SSO exchange token yet, so goToLogin() pushed us to the local login page.
    await waitForUrlMatch(page, new RegExp(`/${orgSlug}/auth/login`), 20_000);
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

    // Redirect chain lands back on our callback page, which auto-exchanges the code and replaces
    // to the station picker again — now WITH an SSO exchange token in sessionStorage. Interstitials
    // (terms acceptance, passkey nudge) are dismissed inline as they appear during this wait, not
    // in a separate pass beforehand - see waitForRedirectDismissingInterstitials's doc comment.
    await waitForRedirectDismissingInterstitials(page, new RegExp(`${FRONTEND_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/${orgSlug}/auth(?:$|[/?])`), 45_000);
    await shot('04-back-at-station-picker-post-sso');
    await selectStationOnPicker(page, stationCode);

    // Full session established -> lands on the dashboard (the default sso-return-to).
    await waitForUrlMatch(page, new RegExp(`/${orgSlug}/dashboard`), 30_000);
    await waitForDashboardReady(page);
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
