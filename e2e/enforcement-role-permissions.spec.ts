import { test, expect, request as pwRequest, type APIRequestContext, type Page } from '@playwright/test';
import * as path from 'path';
import { API, FRONTEND_BASE, DEMO_STAFF_PASSWORD, SCREENSHOT_DIR, slug, ssoLogin, waitForDashboardReady } from './helpers/ssoLogin';

/**
 * Live-backend verification for the codevertex-demo axle-load-enforcement outlet (CODEVERTEX-DEMO-ENF,
 * station ENF-WB-01), added alongside the commercial QUARRY/WASTE outlets by
 * AuthDemoSyncService.OutletOrgMap["ENF"] (truload-backend). Deliberately out of scope of the task
 * that originally wired up the ENF outlet (which only closed the existing commercial spec's role
 * skips) — see the plan file's "🔴 NOT DONE" table, "Enforcement e2e Playwright test".
 *
 * Scope is intentionally narrower than commercial-role-permissions.spec.ts's full weighing-session
 * test: enforcement weighing is a materially different, higher-stakes flow (axle-by-axle compliance
 * capture feeding case-register/prosecution/tolerance-exception records, not a simple two-pass net
 * weight) — this spec verifies the two ENF demo personas can actually reach the ENF outlet and its
 * core screens (proving the outlet, org routing, role mapping, and permission seeding all work end
 * to end), without attempting to create real case/prosecution data in a demo enforcement station.
 *
 * Uses ssoLogin's org/stationCode overrides (added alongside this spec) since ENF personas belong to
 * a DIFFERENT local Organization/Station than the commercial demo's CODEVERTEX-DEMO/DEMO-WB-01 —
 * every non-primary outlet AuthDemoSyncService creates has its own org+station pair sharing the same
 * codevertex-demo SSO tenant slug.
 *
 * Env overrides: TRULOAD_API_URL, TRULOAD_FRONTEND_URL, TRULOAD_AUTH_UI_URL,
 *   E2E_ENFORCEMENT_ORG_SLUG (default CODEVERTEX-DEMO-ENF), E2E_ENFORCEMENT_STATION_CODE (default
 *   ENF-WB-01), SEED_DEMO_STAFF_PASSWORD — see ./helpers/ssoLogin.ts.
 *   E2E_ENF_OPERATOR_/E2E_ENF_MANAGER_*_EMAIL+PASSWORD — override either demo persona if needed.
 */

const ENF_ORG = process.env.E2E_ENFORCEMENT_ORG_SLUG || 'CODEVERTEX-DEMO-ENF';
const ENF_STATION_CODE = process.env.E2E_ENFORCEMENT_STATION_CODE || 'ENF-WB-01';

interface RoleCreds {
  role: string;
  email?: string;
  password?: string;
}

const ROLES: RoleCreds[] = [
  {
    role: 'Enforcement Weighing Operator',
    email: process.env.E2E_ENF_OPERATOR_EMAIL || 'enforcement.operator@demo.codevertexafrica.com',
    password: process.env.E2E_ENF_OPERATOR_PASSWORD || DEMO_STAFF_PASSWORD,
  },
  {
    role: 'Enforcement Station Manager',
    email: process.env.E2E_ENF_MANAGER_EMAIL || 'enforcement.manager@demo.codevertexafrica.com',
    password: process.env.E2E_ENF_MANAGER_PASSWORD || DEMO_STAFF_PASSWORD,
  },
];

for (const { role, email, password } of ROLES) {
  test.describe(`${role} — enforcement outlet access (live)`, () => {
    test.skip(!email || !password, `no seeded demo persona / E2E_ENF_*_EMAIL+PASSWORD available for ${role}`);
    test.setTimeout(120_000);

    let api: APIRequestContext;
    let browserPage: Page | undefined;

    test.beforeAll(async ({ browser }) => {
      const { token, page } = await ssoLogin(browser, role, email!, password!, ENF_ORG, ENF_STATION_CODE);
      browserPage = page;
      api = await pwRequest.newContext({
        baseURL: API,
        extraHTTPHeaders: { Authorization: `Bearer ${token}`, 'X-Org-Slug': ENF_ORG },
      });
    });

    test.afterAll(async () => {
      await api?.dispose();
      await browserPage?.close();
    });

    test('Stations list is reachable for the ENF outlet', async () => {
      const res = await api.get('/api/v1/Stations');
      expect(res.status(), 'GET /Stations should not 403').not.toBe(403);
      expect(res.ok(), `GET /Stations (got ${res.status()})`).toBeTruthy();
      const body = await res.json();
      const stations = Array.isArray(body) ? body : body.items ?? [];
      expect(
        stations.some((s: { code?: string }) => s.code === ENF_STATION_CODE),
        `Stations list should include the ENF outlet's own station (${ENF_STATION_CODE})`
      ).toBeTruthy();

      await browserPage?.goto(`${FRONTEND_BASE}/${ENF_ORG}/dashboard`, { waitUntil: 'domcontentloaded' }).catch(() => {});
      if (browserPage) await waitForDashboardReady(browserPage);
      await browserPage
        ?.screenshot({ path: path.join(SCREENSHOT_DIR, `${slug(role)}-06-dashboard-stations-check.png`), fullPage: true })
        .catch(() => {});
    });

    test('Reports catalog is reachable', async () => {
      const res = await api.get('/api/v1/reports/catalog');
      expect(res.status(), 'GET /reports/catalog should not 403').not.toBe(403);
      expect(res.ok(), `GET /reports/catalog (got ${res.status()})`).toBeTruthy();
      const body = await res.json();
      expect(Array.isArray(body?.modules), 'catalog should return a modules array').toBeTruthy();

      await browserPage?.goto(`${FRONTEND_BASE}/${ENF_ORG}/reporting`, { waitUntil: 'networkidle' }).catch(() => {});
      await browserPage
        ?.screenshot({ path: path.join(SCREENSHOT_DIR, `${slug(role)}-07-reporting-page.png`), fullPage: true })
        .catch(() => {});
    });
  });
}
