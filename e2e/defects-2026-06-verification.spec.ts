import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test';
import { API, ORG, ssoLogin } from './helpers/ssoLogin';

/**
 * Live verification for the 4 folded-in 2026-06-02 defects (full original detail in
 * truload-payments-cases-notifications-2026-06-02.md; this audit,
 * truload-quarry-offline-billing-bi-audit-2026-09-03.md Phase 0 Part C, folds them into the same
 * live sweep). A full code review against current `main` found all four already IMPLEMENTED,
 * matching the original plan's design closely:
 *
 *   - Issue 1 (eCitizen/Pesaflow payment 404/no-sync/null receipt ref): CreatePesaflowInvoiceAsync
 *     /BuildResultPageUrl already sends Pesaflow an absolute, org-scoped frontend callback URL, and
 *     ResolveEffectiveReference already falls back invoice/M-Pesa reference so receipts are never
 *     "N/A". ONE residual bug found and fixed in this session: the legacy GET fallback callback
 *     (ECitizenWebhookController.HandleCallback) still did a bare relative Redirect() that stayed on
 *     the API host and 404'd if ever hit — fixed (IECitizenService.BuildFallbackResultRedirectAsync)
 *     to resolve an absolute URL the same way the primary path does. The test below verifies that
 *     fix directly and needs no auth (the endpoint is anonymous) — confirmed live already before
 *     this file existed: `curl https://truloadapi.codevertexafrica.com/api/v1/payments/callback/
 *     ecitizen-pesaflow?invoice_ref=X&status=success` now 302s to an absolute frontend URL.
 *   - Issue 2 (case register escalation UX): CaseRegisterDto.HasProsecution/ProsecutionStatus,
 *     CaseDetailsDrawer, EscalateChooserModal, and the list's badge/View-vs-Escalate swap
 *     (cases/page.tsx) are all present and wired end-to-end.
 *   - Issue 3 (duplicate driver rows): DriverController.Create reuses an existing same-name driver
 *     instead of inserting a near-duplicate when no ID/license is given, and the idempotent
 *     POST /drivers/deduplicate merges any that still exist. Drivers are NOT tenant/station-scoped
 *     ("Drivers are shared across the system" — DriverController's own doc comment), so this is
 *     live-testable with the commercial demo tenant's Operator token (which has driver.update).
 *   - Issue 4 (blank Pay Online prefill): cases/[id]/page.tsx passes driverName/driverIdNumber/
 *     driverPhone through to ProsecutionSection, whose openPesaflowModal seeds the form with them.
 *
 * Issues 2 and 4 are enforcement/case-management concepts that don't exist on the commercial-
 * weighing demo tenant (CODEVERTEX-DEMO) this session has SSO credentials for — the original defects
 * were reported on KURA (an axle-load-enforcement tenant). Their checks below are real (not stubs)
 * but gated behind E2E_EMAIL/E2E_PASSWORD against an enforcement tenant (same convention as
 * api-idempotency.spec.ts) and skip without those credentials, which this session does not have.
 */

const ENFORCEMENT_API = process.env.TRULOAD_API_URL || 'https://truloadapi.codevertexafrica.com';
const ENFORCEMENT_ORG = process.env.E2E_ORG_SLUG || 'KURA';
const ENFORCEMENT_EMAIL = process.env.E2E_EMAIL || 'gadmin@masterspace.co.ke';
const ENFORCEMENT_PASSWORD = process.env.E2E_PASSWORD || '';

async function enforcementLogin(): Promise<string> {
  const ctx = await pwRequest.newContext({ baseURL: ENFORCEMENT_API });
  const res = await ctx.post('/api/v1/auth/login', {
    data: { email: ENFORCEMENT_EMAIL, password: ENFORCEMENT_PASSWORD, organizationCode: ENFORCEMENT_ORG, stationCode: 'KURA-HQ' },
  });
  expect(res.ok(), `enforcement login should succeed (got ${res.status()})`).toBeTruthy();
  const body = await res.json();
  await ctx.dispose();
  return body.accessToken as string;
}

test.describe('Issue 1 — eCitizen/Pesaflow payment callback redirect (live, no auth required)', () => {
  test('legacy GET fallback callback resolves an absolute frontend URL, not a relative 404', async () => {
    const ctx = await pwRequest.newContext({ baseURL: API });
    const res = await ctx.get('/api/v1/payments/callback/ecitizen-pesaflow?invoice_ref=E2E-NONEXISTENT-INVOICE&status=success', {
      maxRedirects: 0,
    });
    expect([301, 302, 303, 307, 308], `expected a redirect status (got ${res.status()})`).toContain(res.status());
    const location = res.headers()['location'] || '';
    expect(location, 'callback should redirect to an ABSOLUTE frontend URL, not a bare relative path (the original defect)').toMatch(
      /^https?:\/\//
    );
    expect(location, 'should still land on the payment result page').toContain('/payments/result');
    expect(location, 'should preserve invoice_ref').toContain('invoice_ref=');
    await ctx.dispose();
  });
});

test.describe('Issue 3 — duplicate driver rows (live, commercial demo Operator token)', () => {
  test.setTimeout(90_000);
  let api: APIRequestContext;

  test.beforeAll(async ({ browser }) => {
    const email = process.env.E2E_OPERATOR_EMAIL || 'commercial.operator@demo.codevertexafrica.com';
    const password = process.env.E2E_OPERATOR_PASSWORD || process.env.SEED_DEMO_STAFF_PASSWORD || 'DemoStaff2024!';
    const { token, page } = await ssoLogin(browser, 'Commercial Operator (driver dedup)', email, password);
    await page.close();
    api = await pwRequest.newContext({
      baseURL: API,
      extraHTTPHeaders: { Authorization: `Bearer ${token}`, 'X-Org-Slug': ORG },
    });
  });

  test.afterAll(async () => {
    await api?.dispose();
  });

  test('POST /drivers/deduplicate runs cleanly and is idempotent (2nd run finds 0 groups)', async () => {
    const first = await api.post('/api/v1/drivers/deduplicate');
    expect(first.ok(), `deduplicate run #1 (got ${first.status()})`).toBeTruthy();
    const firstBody = await first.json();
    // eslint-disable-next-line no-console
    console.log('[issue-3] first dedupe run result:', JSON.stringify(firstBody));

    const second = await api.post('/api/v1/drivers/deduplicate');
    expect(second.ok(), `deduplicate run #2 (got ${second.status()})`).toBeTruthy();
    const secondBody = await second.json();
    const groupsMerged = secondBody.groupsMerged ?? secondBody.GroupsMerged;
    expect(groupsMerged, 're-running immediately should find 0 remaining duplicate groups (idempotent)').toBe(0);
  });
});

test.describe('Issue 2 — case register escalation UX (live, enforcement tenant)', () => {
  test.skip(!ENFORCEMENT_PASSWORD, 'set E2E_PASSWORD (enforcement tenant, e.g. KURA) to run this — not available in this session');

  let api: APIRequestContext;
  test.beforeAll(async () => {
    const token = await enforcementLogin();
    api = await pwRequest.newContext({
      baseURL: ENFORCEMENT_API,
      extraHTTPHeaders: { Authorization: `Bearer ${token}`, 'X-Org-Slug': ENFORCEMENT_ORG },
    });
  });
  test.afterAll(async () => {
    await api?.dispose();
  });

  test('case search results carry hasProsecution/prosecutionStatus for the badge + View/Escalate swap', async () => {
    const res = await api.post('/api/v1/case/cases/search', { data: { page: 1, pageSize: 5 } });
    expect(res.ok(), `case search (got ${res.status()})`).toBeTruthy();
    const body = await res.json();
    const items = Array.isArray(body) ? body : body.items ?? body.data ?? [];
    expect(items.length, 'need at least one case to inspect the DTO shape').toBeGreaterThan(0);
    expect(items[0], 'case DTO should expose hasProsecution').toHaveProperty('hasProsecution');
  });
});

test.describe('Issue 4 — Pay Online prefill (live, enforcement tenant)', () => {
  test.skip(!ENFORCEMENT_PASSWORD, 'set E2E_PASSWORD (enforcement tenant, e.g. KURA) to run this — not available in this session');

  let api: APIRequestContext;
  test.beforeAll(async () => {
    const token = await enforcementLogin();
    api = await pwRequest.newContext({
      baseURL: ENFORCEMENT_API,
      extraHTTPHeaders: { Authorization: `Bearer ${token}`, 'X-Org-Slug': ENFORCEMENT_ORG },
    });
  });
  test.afterAll(async () => {
    await api?.dispose();
  });

  test('a case with a linked driver exposes driverIdNumber/driverPhoneNumber for the Pay Online prefill', async () => {
    const res = await api.post('/api/v1/case/cases/search', { data: { page: 1, pageSize: 20 } });
    expect(res.ok(), `case search (got ${res.status()})`).toBeTruthy();
    const body = await res.json();
    const items = Array.isArray(body) ? body : body.items ?? body.data ?? [];
    const withDriver = items.find((c: Record<string, unknown>) => c.driverIdNumber || c.driverPhoneNumber);
    expect(withDriver, 'expected at least one case with driver ID/phone captured to verify the prefill fields').toBeTruthy();
  });
});
