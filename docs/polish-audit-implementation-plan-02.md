# Sprint 19: Polish & Integration — Implementation Plan

## Context

Sprint 18 (Production Readiness Audit) is complete — all 10 phases delivered, build passes cleanly. This sprint addresses critical integration mismatches discovered during deep backend audit:

1. **Pesaflow frontend types are completely wrong** — frontend has fabricated types (`checkoutUrl`, `iframeHtml`, `initiateCheckout`) that don't exist on the backend. Backend returns `paymentLink`, `gatewayFee`, `amountNet`, `totalAmount`.
2. **Reporting module needs revamp** — backend has full Superset + Ollama NLQ integration already built, frontend API hooks exist but are unused. Need 2-tab layout (General Reports + BI/AI Custom Reports).
3. **Offline PWA only covers invoices** — needs expansion to weighing, cases, prosecution with read-through cache and proper service worker caching.

### Key Backend Reference (confirmed via source code audit)

**PaymentController.cs** — 3 endpoints only:
- `POST /api/v1/invoices/{invoiceId}/pesaflow` → creates Pesaflow invoice, returns `PesaflowInvoiceResponse`
- `GET /api/v1/invoices/{invoiceId}/payment-status` → queries payment status
- `POST /api/v1/payments/reconcile` → reconciles offline payments

**PesaflowInvoiceResponse** (backend DTO):
```
{ Success, PesaflowInvoiceNumber, PaymentLink, GatewayFee, AmountNet, TotalAmount, Currency, Message }
```

**InvoiceDto** (backend DTO fields):
```
PesaflowPaymentLink, PesaflowGatewayFee, PesaflowAmountNet, PesaflowTotalAmount, PesaflowSyncStatus
```

**NO `initiateCheckout` endpoint exists on backend.**

---

## Phase A: Pesaflow Integration Fix (5 files)

### A1. Fix `src/lib/api/integration.ts`
- **Delete**: `PesaflowCheckoutResponse`, `InitiateCheckoutRequest`, `initiateCheckout()` — none exist on backend
- **Fix** `PesaflowInvoiceResponse` type to match backend:
  ```ts
  interface PesaflowInvoiceResponse {
    success: boolean;
    pesaflowInvoiceNumber: string | null;
    paymentLink: string | null;
    gatewayFee: number | null;
    amountNet: number | null;
    totalAmount: number | null;
    currency: string | null;
    message: string | null;
  }
  ```
- Keep `createPesaflowInvoice()` (maps to `POST /invoices/{id}/pesaflow`)
- Keep `queryPaymentStatus()` (maps to `GET /invoices/{id}/payment-status`)

### A2. Fix `src/lib/api/invoice.ts`
- **Remove** `pesaflowCheckoutUrl` from `InvoiceDto` (column dropped in migration)
- **Add** missing fields: `pesaflowPaymentLink`, `pesaflowGatewayFee`, `pesaflowAmountNet`, `pesaflowTotalAmount`, `pesaflowSyncStatus`

### A3. Fix `src/hooks/queries/useIntegrationQueries.ts`
- **Delete** `useInitiateCheckout()` hook — no backend endpoint
- Ensure `useCreatePesaflowInvoice()` and `useQueryPaymentStatus()` use correct types

### A4. Rewrite `src/components/payments/PesaflowCheckoutDialog.tsx`
- Accept `paymentLink: string` prop (the checkout URL from backend)
- Render iframe with `src={paymentLink}` (NOT `srcDoc` with HTML — backend returns a URL)
- Poll payment status every 10s via `queryPaymentStatus()`
- Show success screen on payment confirmation
- Close button + loading state

### A5. Fix `src/components/case/ProsecutionSection.tsx`
- Remove `initiateCheckoutMutation` usage
- Flow: user clicks "Settle" → call `createPesaflowInvoice(invoiceId)` → get `paymentLink` → open `PesaflowCheckoutDialog` with that URL
- Show "Settle" button on invoices with `status === 'pending'` and `pesaflowPaymentLink` exists
- Show "Request Payment" button for invoices without pesaflow sync (triggers `createPesaflowInvoice` first)

---

## Phase B: Reporting Module Revamp (1 rewrite, 3 new, 1 dependency)

### B0. Install `@superset-ui/embedded-sdk`
```bash
pnpm add @superset-ui/embedded-sdk
```

### B1. Rewrite `src/app/reporting/page.tsx`
- Two-tab layout using shadcn Tabs:
  - **Tab 1: General Reports** — Module selector → predefined report list → export to CSV/PDF
  - **Tab 2: BI & AI Custom Reports** — Superset embedded dashboards + NLQ query interface
- Module selector (dropdown): Weighing, Cases, Financial, Yard, Config
- When module selected, show only reports relevant to that module
- Keep existing `exportArrayToCSV()` integration for General Reports tab

### B2. New: `src/components/reporting/SupersetDashboard.tsx`
- Uses `@superset-ui/embedded-sdk` `embedDashboard()`
- Calls `useGetSupersetGuestToken(dashboardId)` for auth
- Renders embedded Superset dashboard in a container div
- Loading/error states
- Existing hooks: `src/hooks/queries/useAnalyticsQueries.ts` → `useGetSupersetGuestToken()`, `useSupersetDashboards()`
- Existing API: `src/lib/api/analytics.ts` → `getGuestToken()`, `getDashboards()`

### B3. New: `src/components/reporting/NaturalLanguageQuery.tsx`
- Text input for natural language query (e.g., "show me top 10 overloaded vehicles this month")
- Submit → `useNaturalLanguageQuery()` hook → `POST /api/v1/analytics/query`
- Display results in a data table
- Show generated SQL for transparency
- Loading/error states
- Existing hook: `useNaturalLanguageQuery()` in `useAnalyticsQueries.ts`
- Existing API: `executeNaturalLanguageQuery()` in `analytics.ts`

### B4. New: `src/components/reporting/ModuleReportSelector.tsx`
- Dropdown to select module (Weighing, Cases, Financial, Yard, Config)
- Filtered list of predefined reports per module
- Each report row: name, description, date range picker, export button
- Uses existing `exportArrayToCSV()` from `src/lib/utils/export.ts`

---

## Phase C: Full Offline PWA (4 modified, 2 new)

### C1. Expand `src/lib/offline/db.ts` — Dexie schema
Current schema only has `offlineInvoices` + `mutationQueue`. Add:
- `offlineWeighings` — weighing records created offline
- `offlineCases` — case records created offline
- `referenceDataCache` — cached lookup tables (vehicle types, offence codes, stations, officers)
- Bump Dexie version number

### C2. New: `src/hooks/useOfflineCache.ts`
- Read-through cache: check Dexie first → if miss or stale, fetch from API → store in Dexie
- For reference data (vehicle types, stations, offence codes) — cache for 24h
- Returns cached data immediately while revalidating in background (stale-while-revalidate pattern)

### C3. Modify `src/hooks/useOfflineMutation.ts`
- Extend to support weighing and case mutations (not just invoices)
- Generic mutation queue that stores endpoint + payload + timestamp

### C4. Modify `src/lib/offline/sync.ts`
- Handle new mutation types (weighing, case) during queue drain
- Update reference data cache on sync

### C5. New: `public/offline.html`
- Static fallback page shown when app is offline and requested page isn't cached
- Simple message: "You're offline. Cached pages are still available."

### C6. Modify `next.config.js`
- Configure `@ducanh2912/next-pwa` runtime caching rules:
  - API responses: NetworkFirst strategy
  - Static assets: CacheFirst strategy
  - Images: StaleWhileRevalidate strategy

---

## Phase D: Legacy Cleanup

### D1. Delete dead code from `src/lib/api/integration.ts`
- Remove `PesaflowCheckoutResponse` type
- Remove `InitiateCheckoutRequest` type
- Remove `initiateCheckout()` function

### D2. Clean `src/hooks/queries/useIntegrationQueries.ts`
- Remove `useInitiateCheckout()` hook

### D3. Remove `pesaflowCheckoutUrl` from `src/lib/api/invoice.ts`
(Covered in Phase A2)

### D4. Scan for any remaining references to removed types/functions
- Grep for `initiateCheckout`, `checkoutUrl`, `iframeHtml`, `PesaflowCheckoutResponse`
- Remove all dead imports and references

---

## Phase E: Verification & Docs

### E1. Build
```bash
pnpm run build
```
- Zero TypeScript errors, all pages compile

### E2. Functional verification checklist
- [ ] Pesaflow: Create invoice → get paymentLink → render in iframe dialog → poll status → success
- [ ] Reporting Tab 1: Select module → see filtered reports → export CSV
- [ ] Reporting Tab 2: Superset dashboard embeds with guest token auth
- [ ] Reporting Tab 2: NLQ query returns results with SQL shown
- [ ] Offline: App works offline with cached data
- [ ] Offline: Mutations queue to Dexie, drain on reconnect
- [ ] Offline: Reference data available from cache when offline
- [ ] No references to deleted types/functions remain
- [ ] Mobile responsive on all modified pages

### E3. Sprint docs
- Create `docs/sprints/sprint-19-polish-integration.md`
- Update `docs/plan.md` with Sprint 19 completions

---

## Implementation Order

| Step | Phase | Files | Description |
|------|-------|-------|-------------|
| 1 | A1-A3 | 3 | Fix Pesaflow types, delete legacy code |
| 2 | A4 | 1 | Rewrite PesaflowCheckoutDialog |
| 3 | A5 | 1 | Fix ProsecutionSection flow |
| 4 | B0 | 0 | Install @superset-ui/embedded-sdk |
| 5 | B2-B4 | 3 | New reporting components |
| 6 | B1 | 1 | Rewrite reporting page (2-tab layout) |
| 7 | C1-C2 | 2 | Expand offline DB + cache hook |
| 8 | C3-C6 | 4 | Extend offline mutations + SW config |
| 9 | D1-D4 | 0 | Legacy cleanup (grep scan) |
| 10 | E1-E3 | 2 | Build verify + sprint docs |

**Total**: ~17 files (5 new, ~12 modified)
