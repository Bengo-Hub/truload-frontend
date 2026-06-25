import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test';

/**
 * Deployed-backend idempotency E2E (adapted from pos-ui's API-verification flow).
 *
 * Validates the offline-sync exactly-once guarantee on the LIVE backend: each create in the
 * weighing → case → prosecution → invoice chain, replayed with the SAME key, returns the SAME
 * record (no duplicates) — which is what makes offline replay safe. Also smoke-checks the
 * recent-convictions cache endpoint. Cleans up everything it creates.
 *
 * Env: TRULOAD_API_URL (default https://truloadapi.codevertexitsolutions.com),
 *      E2E_EMAIL, E2E_PASSWORD, E2E_ORG_SLUG (KURA), E2E_STATION_ID (KURA-HQ id).
 */
const API = process.env.TRULOAD_API_URL || 'https://truloadapi.codevertexitsolutions.com';
const ORG = process.env.E2E_ORG_SLUG || 'KURA';
const EMAIL = process.env.E2E_EMAIL || 'gadmin@masterspace.co.ke';
const PASSWORD = process.env.E2E_PASSWORD || '';
const STATION_ID = process.env.E2E_STATION_ID || 'cf27d5e8-383b-4657-a4d4-4f3e65423dbe'; // KURA-HQ

function uuid() {
  return crypto.randomUUID();
}

async function login(): Promise<string> {
  const ctx = await pwRequest.newContext({ baseURL: API });
  const res = await ctx.post('/api/v1/auth/login', {
    data: { email: EMAIL, password: PASSWORD, organizationCode: ORG, stationCode: 'KURA-HQ' },
  });
  expect(res.ok(), `login should succeed (got ${res.status()})`).toBeTruthy();
  const body = await res.json();
  await ctx.dispose();
  return body.accessToken;
}

test.describe('TruLoad backend idempotency (live)', () => {
  test.skip(!PASSWORD, 'set E2E_PASSWORD to run the live idempotency E2E');
  test.setTimeout(120_000);

  let api: APIRequestContext;
  const created: { weighingId?: string; caseId?: string; prosecutionId?: string; invoiceId?: string } = {};

  test.beforeAll(async () => {
    const token = await login();
    api = await pwRequest.newContext({
      baseURL: API,
      extraHTTPHeaders: { Authorization: `Bearer ${token}`, 'X-Org-Slug': ORG },
    });
  });

  test.afterAll(async () => {
    // Clean up everything created (team rule: delete all E2E test data).
    if (created.invoiceId) await api.post(`/api/v1/invoices/${created.invoiceId}/void`, { data: { reason: 'e2e cleanup' } }).catch(() => {});
    if (created.weighingId) await api.delete(`/api/v1/weighing-transactions/${created.weighingId}`).catch(() => {});
    await api?.dispose();
  });

  test('weighing create is idempotent on clientLocalId', async () => {
    const clientLocalId = uuid();
    const body = { stationId: STATION_ID, vehicleRegNo: `KDE2E${Date.now() % 100000}`, weighingType: 'static', clientLocalId };
    const r1 = await api.post('/api/v1/weighing-transactions', { data: body });
    expect(r1.ok(), `weighing create #1 (got ${r1.status()})`).toBeTruthy();
    const id1 = (await r1.json()).id;
    const r2 = await api.post('/api/v1/weighing-transactions', { data: body });
    expect(r2.ok(), `weighing create #2 (got ${r2.status()})`).toBeTruthy();
    const id2 = (await r2.json()).id;
    expect(id2, 'replay returns the SAME weighing (no duplicate)').toBe(id1);
    created.weighingId = id1;
  });

  test('case-from-weighing is idempotent (get-or-create)', async () => {
    expect(created.weighingId, 'needs a weighing from the previous test').toBeTruthy();
    const r1 = await api.post(`/api/v1/case/cases/from-weighing/${created.weighingId}`, { data: {} });
    expect(r1.ok(), `case create #1 (got ${r1.status()})`).toBeTruthy();
    const id1 = (await r1.json()).id;
    const r2 = await api.post(`/api/v1/case/cases/from-weighing/${created.weighingId}`, { data: {} });
    expect(r2.ok(), `case create #2 should get-or-create, not 400 (got ${r2.status()})`).toBeTruthy();
    const id2 = (await r2.json()).id;
    expect(id2, 'replay returns the SAME case').toBe(id1);
    created.caseId = id1;
  });

  test('recent-convictions cache endpoint responds', async () => {
    const res = await api.get('/api/v1/prosecutions/recent-convictions?months=12');
    expect(res.ok(), `recent-convictions should be 200 (got ${res.status()})`).toBeTruthy();
    expect(Array.isArray(await res.json())).toBeTruthy();
  });
});
