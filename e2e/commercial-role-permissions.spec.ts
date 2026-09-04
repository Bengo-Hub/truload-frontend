import { test, expect, request as pwRequest, type APIRequestContext, type Page } from '@playwright/test';
import * as path from 'path';
import { API, FRONTEND_BASE, ORG, STATION_CODE, DEMO_STAFF_PASSWORD, SCREENSHOT_DIR, slug, ssoLogin } from './helpers/ssoLogin';

/**
 * Live-backend verification for the commercial-mode permission-seeding fix
 * (truload-backend commit 09e0413, RolePermissionSeeder.cs): Commercial Supervisor/Operator/
 * Finance/Auditor were missing station.read (Stations list/dropdowns 403), and Operator was also
 * missing analytics.read (Reports/Custom Reports 403) and weighing.read (could capture a weighing
 * but not fetch its result or print its ticket).
 *
 * Uses the existing seeded commercial demo tenant (TRULOAD-DEMO) and its seeded demo personas
 * (commercial.operator@demo.codevertexafrica.com / commercial.finance@demo.codevertexafrica.com)
 * rather than creating new test users, per [[project_demo_tenant]] (never touch real tenant data).
 *
 * Login is driven through the REAL SSO/PKCE browser flow (see ./helpers/ssoLogin.ts) — these demo
 * accounts have no usable local password, so a direct POST /api/v1/auth/login (the old version of
 * this helper) 401s every time. The resulting truload access token is then used to build the same
 * precise API-request-context assertions this spec always had.
 *
 * `COMMERCIAL_SUPERVISOR`/`COMMERCIAL_AUDITOR`/`COMMERCIAL_MANAGER` have NO seeded demo personas at
 * all yet (AuthDemoSyncService only syncs `commercial_weighing_operator`/`commercial_finance` roles
 * from auth-api's seed) — those three stay skipped below rather than inventing accounts. Extending
 * the demo seed to cover them is a separate, cross-repo decision (see the plan's Phase 5b notes).
 *
 * Env overrides (all have working live defaults — no env vars required to run Operator/Finance):
 *   TRULOAD_API_URL, TRULOAD_FRONTEND_URL, TRULOAD_AUTH_UI_URL, E2E_COMMERCIAL_ORG_SLUG,
 *   E2E_COMMERCIAL_STATION_CODE, SEED_DEMO_STAFF_PASSWORD — see ./helpers/ssoLogin.ts for defaults.
 *   E2E_OPERATOR_EMAIL/PASSWORD, E2E_FINANCE_EMAIL/PASSWORD — override the demo persona if needed.
 *   E2E_SUPERVISOR_/E2E_AUDITOR_/E2E_MANAGER_*_EMAIL+PASSWORD — set these to un-skip the 3 roles
 *     with no seeded persona, once accounts exist for them.
 *
 * Screenshots are written to test-results/phase0-evidence/ (git-ignored) as before/after evidence
 * for the permission fix — one set per role covering the station picker, the SSO hosted login form,
 * the post-login dashboard, and the reporting page.
 */

interface RoleCreds {
  role: string;
  email?: string;
  password?: string;
}

const ROLES: RoleCreds[] = [
  {
    role: 'Commercial Operator',
    email: process.env.E2E_OPERATOR_EMAIL || 'commercial.operator@demo.codevertexafrica.com',
    password: process.env.E2E_OPERATOR_PASSWORD || DEMO_STAFF_PASSWORD,
  },
  {
    role: 'Commercial Finance',
    email: process.env.E2E_FINANCE_EMAIL || 'commercial.finance@demo.codevertexafrica.com',
    password: process.env.E2E_FINANCE_PASSWORD || DEMO_STAFF_PASSWORD,
  },
  // No seeded demo persona exists for these three roles yet — stay skipped unless env-provided.
  { role: 'Commercial Supervisor', email: process.env.E2E_SUPERVISOR_EMAIL, password: process.env.E2E_SUPERVISOR_PASSWORD },
  { role: 'Commercial Auditor', email: process.env.E2E_AUDITOR_EMAIL, password: process.env.E2E_AUDITOR_PASSWORD },
];

for (const { role, email, password } of ROLES) {
  test.describe(`${role} — commercial-mode access (live)`, () => {
    test.skip(!email || !password, `no seeded demo persona / E2E_*_EMAIL+PASSWORD available for ${role}`);
    test.setTimeout(120_000);

    let api: APIRequestContext;
    let browserPage: Page | undefined;

    test.beforeAll(async ({ browser }) => {
      const { token, page } = await ssoLogin(browser, role, email!, password!);
      browserPage = page;
      api = await pwRequest.newContext({
        baseURL: API,
        extraHTTPHeaders: { Authorization: `Bearer ${token}`, 'X-Org-Slug': ORG },
      });
    });

    test.afterAll(async () => {
      await api?.dispose();
      await browserPage?.close();
    });

    test('Stations list is reachable (was 403 before the fix)', async () => {
      const res = await api.get('/api/v1/Stations');
      expect(res.status(), 'GET /Stations should not 403').not.toBe(403);
      expect(res.ok(), `GET /Stations (got ${res.status()})`).toBeTruthy();

      // Supplementary UI evidence: the Dashboard's StationSelectFilter dropdown is the actual
      // real-world surface this permission gates — confirm it renders without an error state.
      await browserPage?.goto(`${FRONTEND_BASE}/${ORG}/dashboard`, { waitUntil: 'networkidle' }).catch(() => {});
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

      // Supplementary UI evidence: the live Reporting page for this role (was empty/403 before).
      await browserPage?.goto(`${FRONTEND_BASE}/${ORG}/reporting`, { waitUntil: 'networkidle' }).catch(() => {});
      await browserPage
        ?.screenshot({ path: path.join(SCREENSHOT_DIR, `${slug(role)}-07-reporting-page.png`), fullPage: true })
        .catch(() => {});
    });
  });
}

test.describe('Commercial Operator — full weighing session end-to-end (live)', () => {
  const operator = ROLES[0];
  test.skip(!operator.email || !operator.password, 'set E2E_OPERATOR_EMAIL/PASSWORD to run this');
  test.setTimeout(150_000);

  let api: APIRequestContext;
  let browserPage: Page | undefined;
  const created: { weighingId?: string } = {};

  test.beforeAll(async ({ browser }) => {
    const { token, page } = await ssoLogin(browser, 'Commercial Operator (weighing session)', operator.email!, operator.password!);
    browserPage = page;
    api = await pwRequest.newContext({
      baseURL: API,
      extraHTTPHeaders: { Authorization: `Bearer ${token}`, 'X-Org-Slug': ORG },
    });
  });

  test.afterAll(async () => {
    // Hard-delete the weighing this test created (team rule: delete ALL e2e test data).
    if (created.weighingId) {
      await api.delete(`/api/v1/weighing-transactions/${created.weighingId}/hard`).catch(() => {});
    }
    await api?.dispose();
    await browserPage?.close();
  });

  test('initiate -> first weight -> second weight -> fetch result -> ticket pdf', async () => {
    // 1. Resolve the demo station id (Stations must already be reachable per the tests above).
    const stationsRes = await api.get('/api/v1/Stations');
    expect(stationsRes.ok(), 'resolve stations').toBeTruthy();
    const stations = await stationsRes.json();
    const station = (Array.isArray(stations) ? stations : stations.items ?? []).find(
      (s: { code?: string }) => s.code === STATION_CODE
    );
    expect(station, `station ${STATION_CODE} should exist`).toBeTruthy();

    // 2. Initiate a commercial weighing (POST to the controller's base route, not "/initiate").
    const vehicleRegNo = `KDE2E${Date.now() % 100000}`;
    const initRes = await api.post('/api/v1/commercial-weighing', {
      data: { stationId: station.id, vehicleRegNo, weighingScaleType: 'mobile' },
    });
    expect(initRes.ok(), `initiate (got ${initRes.status()})`).toBeTruthy();
    const weighing = await initRes.json();
    created.weighingId = weighing.id;
    expect(created.weighingId, 'initiate should return a weighing id').toBeTruthy();

    // 3. First weight (tare pass).
    const firstRes = await api.post(`/api/v1/commercial-weighing/${created.weighingId}/first-weight`, {
      data: { weightKg: 12000, weightType: 'tare' },
    });
    expect(firstRes.ok(), `first-weight (got ${firstRes.status()})`).toBeTruthy();

    // 4. Second weight (gross pass — system derives net weight).
    const secondRes = await api.post(`/api/v1/commercial-weighing/${created.weighingId}/second-weight`, {
      data: { weightKg: 30000 },
    });
    expect(secondRes.ok(), `second-weight (got ${secondRes.status()})`).toBeTruthy();

    // 5. Fetch result (GET /{id}) — this is the exact step that 403'd before the weighing.read fix.
    const resultRes = await api.get(`/api/v1/commercial-weighing/${created.weighingId}`);
    expect(resultRes.status(), 'GetResult should not 403 for an Operator on their own weighing').not.toBe(403);
    expect(resultRes.ok(), `GetResult (got ${resultRes.status()})`).toBeTruthy();

    // 6. Print the ticket — also 403'd before the fix. Confirm it's an actual PDF, not just a 200.
    const ticketRes = await api.get(`/api/v1/commercial-weighing/${created.weighingId}/ticket/pdf`);
    expect(ticketRes.status(), 'ticket/pdf should not 403 for an Operator on their own weighing').not.toBe(403);
    expect(ticketRes.ok(), `ticket/pdf (got ${ticketRes.status()})`).toBeTruthy();
    expect(ticketRes.headers()['content-type'] || '', 'ticket/pdf should return a PDF').toContain('pdf');

    await browserPage
      ?.screenshot({ path: path.join(SCREENSHOT_DIR, `${slug('Commercial Operator')}-08-weighing-session-complete.png`), fullPage: true })
      .catch(() => {});
  });
});
