Design a comprehensive implementation plan for the TruLoad Sprint 19 "Polish & Integration" sprint. This plan must be written to a file at `d:\Projects\BengoBox\Truload\truload-frontend\docs\polish-plan-01.md` — but since we're in plan mode, just return the complete plan content as text output.

## Context from Exploration

### 1. PESAFLOW INVOICE FLOW (Critical Fix)

**Current Backend (CORRECT):**
- `POST /api/v1/invoices/{invoiceId}/pesaflow` → calls Pesaflow iframe endpoint `https://test.pesaflow.com/PaymentAPI/iframev2.1.php`
- Returns `PesaflowInvoiceResponse`: `{ success, pesaflowInvoiceNumber, paymentLink, gatewayFee, amountNet, totalAmount, currency, message }`
- Backend stores: `PesaflowPaymentLink`, `PesaflowGatewayFee`, `PesaflowAmountNet`, `PesaflowTotalAmount`, `PesaflowSyncStatus`
- Backend InvoiceDto includes all pesaflow fields: `pesaflowPaymentLink`, `pesaflowGatewayFee`, `pesaflowAmountNet`, `pesaflowTotalAmount`, `pesaflowSyncStatus`
- Migration already dropped `pesaflow_checkout_url` column

**Current Frontend (BROKEN - Out of sync with backend):**
- `src/lib/api/integration.ts` has WRONG types:
  - `PesaflowInvoiceResponse` has `checkoutUrl` instead of `paymentLink`, missing `gatewayFee`/`amountNet`/`totalAmount`
  - `PesaflowCheckoutResponse` has `checkoutUrl`/`iframeHtml` — these don't exist on backend
  - `InitiateCheckoutRequest` / `initiateCheckout()` function — NO SUCH ENDPOINT on backend
- `src/lib/api/invoice.ts` has WRONG InvoiceDto — missing `pesaflowPaymentLink`, `pesaflowGatewayFee`, `pesaflowAmountNet`, `pesaflowTotalAmount`, `pesaflowSyncStatus`. Still has old `pesaflowCheckoutUrl`
- `PesaflowCheckoutDialog.tsx` tries to use `checkout.checkoutUrl` / `checkout.iframeHtml`
- `ProsecutionSection.tsx` calls `useInitiateCheckout()` which doesn't exist on backend

**Required Changes:**
- Remove: `PesaflowCheckoutResponse`, `InitiateCheckoutRequest`, `initiateCheckout()` — these are legacy
- Fix: `PesaflowInvoiceResponse` to match backend: `{ success, pesaflowInvoiceNumber, paymentLink, gatewayFee, amountNet, totalAmount, currency, message }`
- Fix: `InvoiceDto` to match backend: add `pesaflowPaymentLink`, `pesaflowGatewayFee`, `pesaflowAmountNet`, `pesaflowTotalAmount`, `pesaflowSyncStatus`; remove `pesaflowCheckoutUrl`
- Rewrite: `PesaflowCheckoutDialog.tsx` → use `paymentLink` from invoice or Pesaflow response
- Rewrite: `ProsecutionSection.tsx` payment flow → create Pesaflow invoice → open iframe at `paymentLink`
- Remove: `useInitiateCheckout()` from `useIntegrationQueries.ts`

**Correct Flow:**
1. Officer clicks "Pay Online" on pending invoice
2. If no `pesaflowInvoiceNumber`: show client details form → POST to `/invoices/{id}/pesaflow` → get `paymentLink`
3. If already has `pesaflowPaymentLink`: use it directly
4. Open `PesaflowCheckoutDialog` rendering `paymentLink` in iframe (URL is like `https://test.pesaflow.com/checkout?request_id=xxx`)
5. Poll payment status every 10s → when paid, update UI + refetch

### 2. REPORTING MODULE REVAMP

**Current Frontend (`src/app/reporting/page.tsx`):**
- 3 tabs: Dashboard (metrics), Reports (6 templates with CSV export), Charts (8 charts)
- Uses TanStack Query hooks for data
- CSV export via `exportArrayToCSV()`

**KenloadV2 Patterns (from exploration):**
- Module-based reports: Daily Summary, Hourly Statistics, Case Status, Overloaded, Prohibited, Prosecution, Police Report, etc.
- Per-module filtering (select module → see only that module's reports)
- jsPDF + Excel exports (client-side)
- Date range + multi-dimension filters

**Backend Infrastructure (Already Built):**
- QuestPdf service generates: WeightTicket, ProhibitionOrder, LoadCorrectionMemo, ComplianceCertificate, ChargeSheet, CourtMinutes, Invoice, Receipt (10 types)
- But NO backend report generation API (individual documents only, not aggregate reports)
- Superset integration: `SupersetController` with guest-token, dashboards, NLQ query endpoints
- Ollama NLQ: `POST /api/v1/analytics/query` — converts natural language → SQL → Superset SQL Lab
- Superset deployed at `https://superset.codevertexitsolutions.com` (K8s, admin/Vertex2020!)

**Required: Two-tab Reporting Page:**

**Tab 1: General Reports (Predefined)**
- Module selector (Weighing, Cases, Prosecution, Financial, Yard, Tags, Shifts)
- Per-module report list (e.g., Weighing → Daily Summary, Hourly Stats, Compliance Report, etc.)
- Date range + station + other dimension filters
- Backend generates PDFs/CSVs (new modular report service needed)
- Reports: WeighingSummary, ComplianceReport, CaseRegister, ProsecutionSummary, RevenueReport, StationPerformance, RepeatOffenders, YardSummary

**Tab 2: BI & AI-Powered Custom Reports**
- Superset embedded dashboards (via `@superset-ui/embedded-sdk`, guest tokens)
- Natural language query interface (Ollama-backed)
- Interactive charts, cross-filtering
- Superset URL: `https://superset.codevertexitsolutions.com`

### 3. FULL OFFLINE PWA

**Current Implementation (95%):**
- PWA enabled via `@ducanh2912/next-pwa`
- Dexie/IndexedDB for offline invoices + mutation queue
- `useOnlineStatus`, `useOfflineMutation` hooks
- `OfflineIndicator` component
- `ReconcileDialog` for invoice reconciliation

**FRD Requirements (From docs/plan.md):**
- Local-first forms: weighing screens, prosecution intake, case register — all stored in IndexedDB
- Background sync with deduplication via idempotency keys
- Read-through cache for station config, axle limits, vehicle catalog
- Offline indicators with queue size badge
- Middleware (TruConnect) connects locally via `ws://localhost:3030` — works offline!

**What's Missing for Full Production PWA:**
- Dexie schema only has `offlineInvoices` and `mutationQueue` — needs tables for weighing transactions, case register forms, station config cache
- No offline.html fallback page
- No read-through cache for reference data (station config, axle limits, vehicle makes)
- Queue size badge not shown anywhere
- `useOfflineMutation` only used for invoice scenario — needs to wrap weighing + case + prosecution mutations
- Service worker caching strategies not configured (next-pwa defaults only)

### 4. MODERN RESPONSIVE DESIGN
- Already mostly implemented (Tailwind responsive classes throughout)
- Mobile-first approach used on all pages
- Needs audit pass to ensure consistency

## Design Requirements

Create a plan with these sections:
1. **Phase A: Pesaflow Integration Fix** — align frontend types with backend, rewrite checkout dialog, remove legacy code
2. **Phase B: Reporting Module Revamp** — two-tab layout, modular backend report generation, Superset embedding, NLQ interface
3. **Phase C: Full Offline PWA** — expand Dexie schema, offline forms for all modules, read-through cache, queue badges, offline.html fallback
4. **Phase D: Legacy Cleanup** — remove all dead code, unused types, placeholder logic
5. **Phase E: Verification** — build checks, integration testing

For each phase, list:
- Exact files to create/modify/delete
- What changes in each file
- Dependencies between phases
- Verification steps

The plan should be detailed enough that another developer (or AI) can continue from it if the session context is lost.