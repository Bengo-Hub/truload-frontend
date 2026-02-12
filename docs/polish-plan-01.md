# Sprint 19: Polish & Integration Plan

**Created:** February 12, 2026
**Priority:** P0 - Critical
**Status:** PLANNED (pending approval)

---

## Context

Sprint 18 (Production Readiness Audit) is complete — all 10 phases delivered, `pnpm run build` passes cleanly with 0 errors and 21 pages compiled. This sprint addresses critical integration mismatches discovered during deep backend audit, plus reporting revamp and full offline PWA support.

### Problems Found

1. **Pesaflow frontend types are completely wrong** — frontend has fabricated types (`checkoutUrl`, `iframeHtml`, `initiateCheckout`) that don't match backend. Backend returns `paymentLink`, `gatewayFee`, `amountNet`, `totalAmount`. There is NO `initiateCheckout` endpoint.
2. **Reporting module is underutilized** — backend has full Superset + Ollama NLQ integration already built (`SupersetController`, `SupersetService`), frontend API hooks exist (`analytics.ts`, `useAnalyticsQueries.ts`) but are completely unused by the reporting page.
3. **Offline PWA only covers invoices** — Dexie schema only has `offlineInvoices` + `mutationQueue`. Needs expansion to weighing, cases, prosecution with read-through cache for reference data.

---

## Backend Reference (verified via source audit)

### Payment Endpoints (`PaymentController.cs`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/invoices/{invoiceId}/pesaflow` | Create Pesaflow invoice |
| GET | `/api/v1/invoices/{invoiceId}/payment-status` | Query payment status |
| POST | `/api/v1/payments/reconcile` | Reconcile offline payments |

**NO `initiateCheckout` endpoint exists.**

### PesaflowInvoiceResponse (backend DTO — `ECitizenDtos.cs`)
```csharp
public class PesaflowInvoiceResponse {
    public bool Success { get; set; }
    public string? PesaflowInvoiceNumber { get; set; }
    public string? PaymentLink { get; set; }        // checkout URL
    public decimal? GatewayFee { get; set; }
    public decimal? AmountNet { get; set; }
    public decimal? TotalAmount { get; set; }
    public string? Currency { get; set; }
    public string? Message { get; set; }
}
```

### InvoiceDto fields (backend — `InvoiceDto.cs`)
```
PesaflowPaymentLink, PesaflowGatewayFee, PesaflowAmountNet, PesaflowTotalAmount, PesaflowSyncStatus
```

### Sample Pesaflow Response (`pesaflow_local_invoice_TEST-20260211170740.json`)
```json
{
  "client_invoice_ref": "TEST-20260211170740",
  "pesaflow_invoice_number": "GWLQKD",
  "payment_link": "https://test.pesaflow.com/checkout?request_id=d8HbuZT_0nO3XLjH7nRy",
  "amount_net": "100.00",
  "gateway_fee": "5.00",
  "total_amount": "105.00",
  "currency": "KES",
  "status": "pending_payment"
}
```

### Superset/Analytics Endpoints (`SupersetController.cs`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/analytics/superset/guest-token` | Get Superset guest token |
| GET | `/api/v1/analytics/superset/dashboards` | List dashboards |
| GET | `/api/v1/analytics/superset/dashboards/{id}` | Get dashboard details |
| POST | `/api/v1/analytics/query` | Natural language → SQL (Ollama) |

### Existing Frontend API (built but unused)
- `src/lib/api/analytics.ts` — `getGuestToken()`, `getDashboards()`, `getDashboard()`, `executeNaturalLanguageQuery()`
- `src/hooks/queries/useAnalyticsQueries.ts` — `useSupersetDashboards()`, `useGetSupersetGuestToken()`, `useNaturalLanguageQuery()`

---

## Phase A: Pesaflow Integration Fix

**Goal:** Align frontend types and flow with actual backend endpoints.

### A1. Fix `src/lib/api/integration.ts`
- **DELETE**: `PesaflowCheckoutResponse`, `InitiateCheckoutRequest`, `initiateCheckout()` — none exist on backend
- **FIX** `PesaflowInvoiceResponse` type to match backend DTO:
  ```ts
  interface PesaflowInvoiceResponse {
    success: boolean;
    pesaflowInvoiceNumber: string | null;
    paymentLink: string | null;     // this is the checkout URL
    gatewayFee: number | null;
    amountNet: number | null;
    totalAmount: number | null;
    currency: string | null;
    message: string | null;
  }
  ```
- Keep `createPesaflowInvoice()` → `POST /invoices/{id}/pesaflow`
- Keep `queryPaymentStatus()` → `GET /invoices/{id}/payment-status`

### A2. Fix `src/lib/api/invoice.ts`
- **Remove** `pesaflowCheckoutUrl` (column dropped in migration)
- **Add**: `pesaflowPaymentLink`, `pesaflowGatewayFee`, `pesaflowAmountNet`, `pesaflowTotalAmount`, `pesaflowSyncStatus`

### A3. Fix `src/hooks/queries/useIntegrationQueries.ts`
- **Delete** `useInitiateCheckout()` — no backend endpoint
- Ensure `useCreatePesaflowInvoice()` and `useQueryPaymentStatus()` use correct types

### A4. Rewrite `src/components/payments/PesaflowCheckoutDialog.tsx`
- Accept `paymentLink: string` prop (the checkout URL)
- Render iframe with `src={paymentLink}` (NOT `srcDoc`)
- Poll payment status every 10s
- Success screen on confirmation
- Loading state + close button

### A5. Fix `src/components/case/ProsecutionSection.tsx`
- Remove `initiateCheckoutMutation` usage
- Flow: "Settle" → `createPesaflowInvoice(invoiceId)` → get `paymentLink` → open `PesaflowCheckoutDialog`
- "Request Payment" for invoices without pesaflow sync
- "Settle" for invoices with `pesaflowPaymentLink`

**Files:** 5 modified

---

## Phase B: Reporting Module Revamp

**Goal:** Two-tab reporting — General Reports + BI/AI Custom Reports with Superset + Ollama NLQ.

### B0. Install dependency
```bash
pnpm add @superset-ui/embedded-sdk
```

### B1. Rewrite `src/app/reporting/page.tsx`
- Two-tab layout (shadcn Tabs):
  - **General Reports**: Module selector → filtered predefined reports → export CSV/PDF
  - **BI & AI Custom Reports**: Superset dashboards + NLQ query
- Module dropdown: Weighing, Cases, Financial, Yard, Config
- Only show reports for selected module

### B2. New: `src/components/reporting/SupersetDashboard.tsx`
- `@superset-ui/embedded-sdk` `embedDashboard()` integration
- Uses `useGetSupersetGuestToken(dashboardId)` for auth
- Uses `useSupersetDashboards()` for dashboard list
- Renders embedded Superset dashboard
- Loading/error states

### B3. New: `src/components/reporting/NaturalLanguageQuery.tsx`
- Text input for natural language queries
- Uses `useNaturalLanguageQuery()` hook → `POST /api/v1/analytics/query`
- Results in data table
- Shows generated SQL for transparency

### B4. New: `src/components/reporting/ModuleReportSelector.tsx`
- Module dropdown filter
- Predefined report list per module
- Date range picker
- Export via `exportArrayToCSV()` from `src/lib/utils/export.ts`

**Files:** 1 rewritten, 3 new, 1 dependency installed

---

## Phase C: Full Offline PWA

**Goal:** Expand offline support beyond invoices to all critical workflows.

### C1. Expand `src/lib/offline/db.ts`
- Add tables: `offlineWeighings`, `offlineCases`, `referenceDataCache`
- Bump Dexie version

### C2. New: `src/hooks/useOfflineCache.ts`
- Read-through cache: Dexie → API → store in Dexie
- Reference data (vehicle types, stations, offence codes) cached 24h
- Stale-while-revalidate pattern

### C3. Modify `src/hooks/useOfflineMutation.ts`
- Extend to weighing and case mutations
- Generic queue: endpoint + payload + timestamp

### C4. Modify `src/lib/offline/sync.ts`
- Handle weighing/case mutation types during drain
- Refresh reference data cache on sync

### C5. New: `public/offline.html`
- Static fallback for uncached pages when offline

### C6. Modify `next.config.js`
- PWA runtime caching rules:
  - API: NetworkFirst
  - Static assets: CacheFirst
  - Images: StaleWhileRevalidate

**Files:** 2 new, 4 modified

---

## Phase D: Legacy Cleanup

- Delete `PesaflowCheckoutResponse`, `InitiateCheckoutRequest`, `initiateCheckout()` from integration.ts
- Delete `useInitiateCheckout()` from useIntegrationQueries.ts
- Remove `pesaflowCheckoutUrl` from invoice.ts
- Grep scan for all references to removed types: `initiateCheckout`, `checkoutUrl`, `iframeHtml`, `PesaflowCheckoutResponse`
- Remove all dead imports

---

## Phase E: Verification & Docs

### Build
```bash
pnpm run build   # zero TypeScript errors
```

### Functional Checklist
- [ ] Pesaflow: create invoice → paymentLink → iframe dialog → poll → success
- [ ] Reporting Tab 1: module filter → predefined reports → CSV export
- [ ] Reporting Tab 2: Superset dashboard embeds with guest token
- [ ] Reporting Tab 2: NLQ query returns results with SQL
- [ ] Offline: cached data available offline
- [ ] Offline: mutations queue and drain on reconnect
- [ ] Offline: reference data from cache when offline
- [ ] No dead type/function references remain
- [ ] Mobile responsive on all modified pages

### Sprint Docs
- Create `docs/sprints/sprint-19-polish-integration.md`
- Update `docs/plan.md`

---

## Implementation Order

| Step | Phase | Files | Description |
|------|-------|-------|-------------|
| 1 | A1-A3 | 3 | Fix Pesaflow types + delete legacy |
| 2 | A4 | 1 | Rewrite PesaflowCheckoutDialog |
| 3 | A5 | 1 | Fix ProsecutionSection flow |
| 4 | B0 | 0 | Install @superset-ui/embedded-sdk |
| 5 | B2-B4 | 3 | New reporting components |
| 6 | B1 | 1 | Rewrite reporting page (2-tab) |
| 7 | C1-C2 | 2 | Expand offline DB + cache hook |
| 8 | C3-C6 | 4 | Extend offline mutations + SW config |
| 9 | D1-D4 | 0 | Legacy cleanup scan |
| 10 | E1-E3 | 2 | Build verify + sprint docs |

**Total:** ~17 files (5 new, ~12 modified)
