import { test, expect, type Page } from '@playwright/test';
import { ORG, DEMO_STAFF_PASSWORD, ssoLogin, humanDelay } from './helpers/ssoLogin';
import { startMockScaleServer, type MockScaleServer } from './helpers/mockScaleServer';

/**
 * Real UI-driven e2e coverage for TruLoad's commercial two-pass weighing capture flow.
 *
 * Prior to this spec, the only weighing e2e coverage (commercial-role-permissions.spec.ts's
 * "full weighing session end-to-end" test) drove the raw REST endpoints directly
 * (POST /commercial-weighing, /first-weight, /second-weight) and never touched the actual
 * stepper UI an operator clicks through. This spec instead:
 *
 *   1. Logs in via the real SSO flow as the Commercial Operator persona (ssoLogin helper).
 *   2. Navigates the same way a real operator would: dashboard -> "Weighing" sidebar link ->
 *      Operations tab -> "Mobile Weighing - commercial" card (NOT a direct deep-link), proving
 *      the navigation path itself works.
 *   3. Drives the actual CommercialWeighingStepper (mode="mobile") component: enters a vehicle
 *      plate, captures a first (tare) weight axle-by-axle, captures a second (gross) weight
 *      axle-by-axle, and confirms the ticket/result screen renders with a net weight and a
 *      ticket number.
 *
 * Why "mobile" and not "multideck": OperationsTab.tsx lists "Mobile Weighing" as the first/left
 * option for this commercial tenant and it's the route explicitly named first in this spec's
 * brief; the two routes render meaningfully different capture UIs (axle-by-axle vs. single-shot
 * platform reading) via the same shared <CommercialWeighingStepper mode=.../> component
 * (src/components/weighing/CommercialWeighingStepper.tsx).
 *
 * The hard part: CommercialFirstWeightStep/CommercialSecondWeightStep
 * (src/components/weighing/steps/) disable their real capture buttons whenever the live scale
 * reading is <= 0 or the TruConnect middleware isn't connected — by design, you can't capture a
 * weight that isn't on the scale. useMiddleware (src/hooks/useMiddleware.ts) ONLY ever tries
 * ws://localhost:3030 (or the local HTTP polling fallback) — its own comment says there is no
 * backend WebSocket relay for weight data. Against the live site with no physical scale
 * attached, those buttons would stay disabled forever. ./helpers/mockScaleServer.ts stands up a
 * minimal local stand-in for that middleware on the SAME machine the Playwright browser runs on
 * (ws://localhost is a "potentially trustworthy" origin, so the https live site is allowed to
 * open a plain ws:// connection to it) — this lets the test drive the real UI buttons instead of
 * bypassing them.
 */

test.describe('Commercial Operator — weighing capture UI (live)', () => {
  test.setTimeout(180_000);

  const operatorEmail = process.env.E2E_OPERATOR_EMAIL || 'commercial.operator@demo.codevertexafrica.com';
  const operatorPassword = process.env.E2E_OPERATOR_PASSWORD || DEMO_STAFF_PASSWORD;

  let page: Page;
  let scale: MockScaleServer;

  test.beforeAll(async ({ browser }) => {
    await humanDelay(800, 2000);
    // Start the mock scale bridge before login/navigation so useMiddleware's first connection
    // attempt (fired on component mount) succeeds immediately instead of waiting on a retry.
    scale = startMockScaleServer(3030);
    const result = await ssoLogin(browser, 'Commercial Operator (weighing capture UI)', operatorEmail, operatorPassword);
    page = result.page;
  });

  test.afterAll(async () => {
    await page?.close();
    await scale?.close();
  });

  test('navigate to Mobile Weighing and drive the full two-pass capture stepper', async () => {
    // ── 1. Navigate the way a real operator does: dashboard -> sidebar "Weighing" link ──────
    await expect(page.getByRole('link', { name: 'Weighing', exact: true })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('link', { name: 'Weighing', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${ORG}/weighing$`), { timeout: 20_000 });

    // ── 2. Operations tab (default) -> "Mobile Weighing - commercial" card ──────────────────
    const mobileCard = page.getByRole('button', { name: /Mobile Weighing/i });
    await expect(mobileCard).toBeVisible({ timeout: 20_000 });
    await mobileCard.click();
    await expect(page).toHaveURL(new RegExp(`/${ORG}/weighing/mobile`), { timeout: 20_000 });

    // ── 3. This org has "Scale test required before weighing" enabled (WeighingSettingsTab.tsx)
    // — Next stays disabled with a "Complete scale test" warning until one passes today. Run a
    // calibration-weight test via the mock scale before touching the plate/Next flow at all.
    // useMiddleware derives scaleA/scaleB as currentWeight/2 each when the mock only sends a single
    // combined `weight` field, and ScaleTestModal sums them back — so the combined total the modal
    // sees equals whatever we set here directly (not double it), matching its default 5,000kg test.
    scale.setWeight(5_000);
    const startTestButton = page.getByRole('button', { name: /Start Test/i }).first();
    await expect(startTestButton).toBeVisible({ timeout: 30_000 });
    await startTestButton.click();

    const calibrationIdInput = page.getByPlaceholder(/TW-5000-A/i);
    await expect(calibrationIdInput).toBeVisible({ timeout: 10_000 });
    await calibrationIdInput.fill('E2E-TEST-WEIGHT');
    await page.getByRole('button', { name: 'Start Test', exact: true }).click();

    await expect(page.getByText(/PASSED|FAILED/)).toBeVisible({ timeout: 15_000 });
    const confirmScaleTestButton = page.getByRole('button', { name: /Confirm & Enable Weighing|Record Failed Test/i });
    await confirmScaleTestButton.click();
    // Dialog closes once the scale-test POST resolves — wait on the button itself rather than the
    // PASSED/FAILED text, which can briefly persist during the closing transition.
    await expect(confirmScaleTestButton).not.toBeVisible({ timeout: 15_000 });

    // ── 4. Capture step: enter a fresh vehicle plate and proceed ────────────────────────────
    const plateInput = page.getByPlaceholder('KAA 123A');
    await expect(plateInput).toBeVisible({ timeout: 30_000 });
    const vehicleReg = `KDEUI${Date.now() % 100000}`;
    await plateInput.fill(vehicleReg);

    // Defensive: a previous run's leftover open (first-weight-only) transaction for this exact
    // plate would pop a "resume" dialog — shouldn't happen given the plate is time-based/unique,
    // but start fresh if it ever does.
    const startNewButton = page.getByRole('button', { name: /Start New Transaction/i });
    if (await startNewButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await startNewButton.click();
    }

    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // ── 5. First weight (tare) — axle-by-axle capture using the mock scale ──────────────────
    const assignAxleButton = page.getByRole('button', { name: /ASSIGN AXLE/i });
    await expect(assignAxleButton).toBeVisible({ timeout: 30_000 });

    const TARE_PER_AXLE_KG = 6_000; // 2 axles (default) -> 12,000 kg tare, matching the existing REST spec's convention
    scale.setWeight(TARE_PER_AXLE_KG);
    await expect(page.getByText('6,000', { exact: false }).first()).toBeVisible({ timeout: 10_000 });
    await assignAxleButton.click();
    await expect(page.getByRole('button', { name: /ASSIGN AXLE/i })).toBeVisible({ timeout: 10_000 });
    await humanDelay(500, 1000); // two real axle captures a human would space out, not fire back to back
    await page.getByRole('button', { name: /ASSIGN AXLE/i }).click();

    // All axles captured -> choose "Tare Weight" for this first pass
    const tareButton = page.getByRole('button', { name: /Tare Weight/i });
    await expect(tareButton).toBeVisible({ timeout: 10_000 });
    await tareButton.click();

    // ── 6. Second weight (gross) — axle-by-axle capture using the mock scale ────────────────
    const GROSS_PER_AXLE_KG = 15_000; // -> 30,000 kg gross, net = 18,000 kg
    await expect(page.getByText(/Capture Gross Weight/i)).toBeVisible({ timeout: 20_000 });

    scale.setWeight(GROSS_PER_AXLE_KG);
    const assignAxleButton2 = page.getByRole('button', { name: /ASSIGN AXLE/i });
    await expect(assignAxleButton2).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('15,000', { exact: false }).first()).toBeVisible({ timeout: 10_000 });
    await assignAxleButton2.click();
    await expect(page.getByRole('button', { name: /ASSIGN AXLE/i })).toBeVisible({ timeout: 10_000 });
    await humanDelay(500, 1000);
    await page.getByRole('button', { name: /ASSIGN AXLE/i }).click();

    // All axles captured -> capture the second weight from the (mock) scale
    const captureFromScaleButton = page.getByRole('button', { name: /Capture from Scale/i });
    await expect(captureFromScaleButton).toBeEnabled({ timeout: 10_000 });
    await captureFromScaleButton.click();

    // A tolerance exception (if the backend flags one) shouldn't block reaching the ticket step,
    // but dismiss the dialog if it appears so it doesn't obscure the ticket screen assertions.
    const toleranceDialogClose = page.getByRole('button', { name: 'Close', exact: true });
    if (await toleranceDialogClose.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await toleranceDialogClose.click();
    }

    // ── 7. Ticket/result screen ──────────────────────────────────────────────────────────────
    await expect(page.getByText(/^#\S+/).first()).toBeVisible({ timeout: 20_000 }); // ticket number
    await expect(page.getByText('18,000', { exact: false }).first()).toBeVisible({ timeout: 10_000 }); // net weight
    await expect(page.getByRole('button', { name: /Print Ticket/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Complete$/i })).toBeVisible();

    await page.screenshot({ path: 'test-results/weighing-capture-ui-ticket-screen.png', fullPage: true }).catch(() => {});
  });
});
