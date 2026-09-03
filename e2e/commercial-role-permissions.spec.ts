import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test';

/**
 * Live-backend verification for the commercial-mode permission-seeding fix
 * (truload-backend commit 09e0413, RolePermissionSeeder.cs): Commercial Supervisor/Operator/
 * Finance/Auditor were missing station.read (Stations list/dropdowns 403), and Operator was also
 * missing analytics.read (Reports/Custom Reports 403) and weighing.read (could capture a weighing
 * but not fetch its result or print its ticket).
 *
 * Uses the existing seeded commercial demo tenant (TRULOAD-DEMO, org code likely "TRULOAD-DEMO" or
 * similar — confirm via E2E_COMMERCIAL_ORG_SLUG) and its seeded demo personas
 * (commercial.operator@demo.codevertexafrica.com / commercial.finance@demo.codevertexafrica.com)
 * rather than creating new test users, per [[project_demo_tenant]] (never touch real tenant data).
 *
 * Env required to run (all skipped otherwise — see test.skip below):
 *   TRULOAD_API_URL (default https://truloadapi.codevertexafrica.com)
 *   E2E_COMMERCIAL_ORG_SLUG (default TRULOAD-DEMO)
 *   E2E_COMMERCIAL_STATION_CODE (default DEMO-WB-01)
 *   E2E_OPERATOR_EMAIL / E2E_OPERATOR_PASSWORD
 *   E2E_FINANCE_EMAIL / E2E_FINANCE_PASSWORD
 * Supervisor/Auditor/Manager checks are included but individually skipped if their
 * E2E_SUPERVISOR_..., E2E_AUDITOR_..., E2E_MANAGER_... env vars aren't set — the demo tenant only
 * seeds Operator + Finance today, so those three need their own env-provided test accounts (or the
 * demo seed extended) to actually run.
 */
const API = process.env.TRULOAD_API_URL || 'https://truloadapi.codevertexafrica.com';
const ORG = process.env.E2E_COMMERCIAL_ORG_SLUG || 'TRULOAD-DEMO';
const STATION_CODE = process.env.E2E_COMMERCIAL_STATION_CODE || 'DEMO-WB-01';

interface RoleCreds {
  role: string;
  email?: string;
  password?: string;
}

const ROLES: RoleCreds[] = [
  { role: 'Commercial Operator', email: process.env.E2E_OPERATOR_EMAIL, password: process.env.E2E_OPERATOR_PASSWORD },
  { role: 'Commercial Finance', email: process.env.E2E_FINANCE_EMAIL, password: process.env.E2E_FINANCE_PASSWORD },
  { role: 'Commercial Supervisor', email: process.env.E2E_SUPERVISOR_EMAIL, password: process.env.E2E_SUPERVISOR_PASSWORD },
  { role: 'Commercial Auditor', email: process.env.E2E_AUDITOR_EMAIL, password: process.env.E2E_AUDITOR_PASSWORD },
];

async function login(email: string, password: string): Promise<string> {
  const ctx = await pwRequest.newContext({ baseURL: API });
  const res = await ctx.post('/api/v1/auth/login', {
    data: { email, password, organizationCode: ORG, stationCode: STATION_CODE },
  });
  expect(res.ok(), `login for ${email} should succeed (got ${res.status()})`).toBeTruthy();
  const body = await res.json();
  await ctx.dispose();
  return body.accessToken;
}

for (const { role, email, password } of ROLES) {
  test.describe(`${role} — commercial-mode access (live)`, () => {
    test.skip(!email || !password, `set the E2E_*_EMAIL/PASSWORD env vars for ${role} to run this`);

    let api: APIRequestContext;

    test.beforeAll(async () => {
      const token = await login(email!, password!);
      api = await pwRequest.newContext({
        baseURL: API,
        extraHTTPHeaders: { Authorization: `Bearer ${token}`, 'X-Org-Slug': ORG },
      });
    });

    test.afterAll(async () => {
      await api?.dispose();
    });

    test('Stations list is reachable (was 403 before the fix)', async () => {
      const res = await api.get('/api/v1/Stations');
      expect(res.status(), 'GET /Stations should not 403').not.toBe(403);
      expect(res.ok(), `GET /Stations (got ${res.status()})`).toBeTruthy();
    });

    test('Reports catalog is reachable', async () => {
      const res = await api.get('/api/v1/reports/catalog');
      expect(res.status(), 'GET /reports/catalog should not 403').not.toBe(403);
      expect(res.ok(), `GET /reports/catalog (got ${res.status()})`).toBeTruthy();
      const body = await res.json();
      expect(Array.isArray(body?.modules), 'catalog should return a modules array').toBeTruthy();
    });
  });
}

test.describe('Commercial Operator — full weighing session end-to-end (live)', () => {
  const operator = ROLES[0];
  test.skip(!operator.email || !operator.password, 'set E2E_OPERATOR_EMAIL/PASSWORD to run this');
  test.setTimeout(120_000);

  let api: APIRequestContext;
  const created: { weighingId?: string } = {};

  test.beforeAll(async () => {
    const token = await login(operator.email!, operator.password!);
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

    // 6. Print the ticket — also 403'd before the fix.
    const ticketRes = await api.get(`/api/v1/commercial-weighing/${created.weighingId}/ticket/pdf`);
    expect(ticketRes.status(), 'ticket/pdf should not 403 for an Operator on their own weighing').not.toBe(403);
    expect(ticketRes.ok(), `ticket/pdf (got ${ticketRes.status()})`).toBeTruthy();
  });
});
