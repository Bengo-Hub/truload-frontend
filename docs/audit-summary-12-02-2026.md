You are designing an implementation plan for a comprehensive production-readiness audit and fix sprint for the TruLoad frontend (Next.js 16, TanStack Query v5, shadcn/ui).

## AUDIT FINDINGS SUMMARY

### CRITICAL ISSUES (Must Fix)

1. **Technical Dashboard - 100% Mock Data** (`src/app/technical/page.tsx`)
   - Lines 60-112: All device status, service health, and scale test data is hardcoded mock
   - Backend HAS a health endpoint and the middleware already exposes scale/device status
   - Need: Wire to real backend API (health endpoint) + TruConnect middleware status
   - The `useMiddleware()` hook at `src/hooks/useMiddleware.ts` already provides: connected status, scale info, indicator health
   - Backend has `/api/v1/health` and integration test connectivity endpoints

2. **Pesaflow Payment Opens External Tab** (`src/components/case/ProsecutionSection.tsx:278`)
   - `window.open(checkout.checkoutUrl, '_blank')` opens payment in new browser tab
   - User REQUIRES: Internal iframe/popup dialog component instead
   - The backend returns `checkoutUrl` and potentially `iframeHtml` (see `PesaflowCheckoutResponse.iframeHtml` in `src/lib/api/integration.ts:76`)
   - Need: Create `PesaflowCheckoutDialog` component that renders checkout URL in iframe within a Dialog

3. **Offline PWA Mode Disabled** (`next.config.js`)
   - PWA wrapper commented out (line 4)
   - No service worker, no IndexedDB queue, no background sync
   - User REQUIRES: Offline invoice creation with default values, then reconcile button when back online
   - `@ducanh2912/next-pwa` package already installed
   - `public/manifest.json` already exists
   - Dexie installed but unused
   - Need: Enable PWA, implement offline mutation queue, add reconcile flow for invoices

4. **Reporting Export Not Implemented** (`src/app/reporting/page.tsx:108`)
   - `// TODO: Implement actual export logic` - just shows a toast
   - Need: Real CSV/Excel export from dashboard data

5. **Image Path Typos** (multiple weighing files)
   - `/images/weighiging/` should be `/images/weighing/`
   - In `src/app/weighing/mobile/page.tsx` and `src/app/weighing/multideck/page.tsx`

6. **Hardcoded Station Code in Tag Creation** (`src/app/weighing/modules/tags/TagsTab.tsx:443`)
   - Station code hardcoded to `'MRK'` instead of dynamic from user context

### HIGH PRIORITY ISSUES

7. **CaseAssignmentLog Officer Input** (`src/components/case/CaseAssignmentLog.tsx`)
   - Uses text input for officer ID instead of searchable dropdown
   - Backend has user list API (`src/lib/api/setup.ts` has fetchUsers)

8. **Form Validation Missing Zod Schemas**
   - Many modal forms (CasePartyList, ArrestWarrantList, CaseAssignmentLog, etc.) rely only on manual checks
   - LoginForm.tsx DOES use Zod (good pattern to follow)
   - Need: Add Zod schemas to critical forms

9. **No React Error Boundaries**
   - No error boundary components found
   - Need: Add error boundary wrapper

10. **CaseSubfileList - No File Upload**
    - Currently URL-only for documents
    - Need: File upload with progress (backend likely has upload endpoint)

### MEDIUM PRIORITY

11. **Missing shadcn AlertDialog** - Currently uses browser `confirm()` for delete confirmations
12. **OAuth Buttons** - Google/Microsoft buttons in login form are non-functional stubs
13. **Profile Page** - Has some hardcoded defaults

### USER REQUIREMENTS

1. **Pesaflow Iframe**: Payment link must render internally in a popup/dialog component, NOT open external browser tab
2. **Offline PWA**: 
   - When offline, invoices created with default values for Pesaflow fields
   - When back online, show "Reconcile" button 
   - On reconcile: user inputs amount + transaction ref, queries Pesaflow endpoint, updates invoice fields + status, generates receipt
3. **Mobile-first responsive design** throughout
4. **Production-ready logic** - no dummy/placeholder/TODO code
5. **Update sprint docs and plan.md when done**

### EXISTING PATTERNS TO REUSE

- **API pattern**: `src/lib/api/courtHearing.ts` (types + async functions + apiClient)
- **Hook pattern**: `src/hooks/queries/useCourtHearingQueries.ts` (query keys, QUERY_OPTIONS, mutations)
- **Component pattern**: `src/components/case/CourtHearingList.tsx` (Card + Table + Dialog + toast)
- **Zod pattern**: `src/app/login/page.tsx` has proper Zod schema + React Hook Form
- **Toast notifications**: `sonner` library, `toast.success()` / `toast.error()`
- **Permission checking**: `useHasPermission('module.action')`
- **Cache tiers**: `QUERY_OPTIONS.static` (30min), `QUERY_OPTIONS.dynamic` (1min)
- **Integration API**: `src/lib/api/integration.ts` already has Pesaflow types including `iframeHtml`, `reconcilePayments()`
- **Query hooks**: `src/hooks/queries/useIntegrationQueries.ts` already has `useCreatePesaflowInvoice`, `useInitiateCheckout`, `useReconcilePayments`
- **Middleware hook**: `src/hooks/useMiddleware.ts` provides real-time device/scale status
- **Dashboard API**: `src/lib/api/dashboard.ts` has 20+ statistical endpoints

### KEY FILE PATHS
- `next.config.js` - PWA config
- `public/manifest.json` - PWA manifest  
- `src/lib/api/client.ts` - API client with interceptors
- `src/lib/api/integration.ts` - Pesaflow payment types and APIs
- `src/lib/api/dashboard.ts` - Dashboard statistics APIs
- `src/hooks/useMiddleware.ts` - TruConnect middleware real-time hook
- `src/hooks/queries/useIntegrationQueries.ts` - Pesaflow hooks
- `src/hooks/queries/useDashboardQueries.ts` - Dashboard hooks
- `src/app/technical/page.tsx` - All mock data (340 lines)
- `src/app/reporting/page.tsx` - Missing export
- `src/components/case/ProsecutionSection.tsx` - Pesaflow window.open on line 278
- `src/components/case/CaseAssignmentLog.tsx` - Text input for officer
- `src/components/case/CaseSubfileList.tsx` - URL-only documents

Design a comprehensive, prioritized implementation plan organized into phases. Each phase should list:
- Files to create/modify
- What changes to make
- Dependencies between tasks
- Estimated complexity

# Production Readiness Audit — Implementation Plan

## Context

Full audit of all 18 frontend pages, 20 API modules, 180+ hooks, and all UI components completed. Backend has 109/109 e2e tests passing. Sprint 17 (case management frontend) is complete. This plan addresses all remaining production-readiness gaps found during the audit — replacing mock data, placeholder logic, and TODO stubs with real implementations, plus adding the Pesaflow iframe dialog and offline PWA reconcile flow per user requirements.

## Findings Summary

| Issue | Severity | Phase |
|-------|----------|-------|
| Image path typo (`weighiging` → `weighing`) | Bug | 1 |
| Hardcoded station code 'MRK' in TagsTab | Bug | 1 |
| Non-functional OAuth buttons on login | UX | 1 |
| Pesaflow opens external tab instead of iframe | Critical (user req) | 2 |
| Technical dashboard 100% mock data | Critical | 3 |
| Reporting export is a TODO stub | Medium | 4 |
| CaseAssignmentLog uses text input for officer ID | UX | 5 |
| 4 `confirm()` calls should use AlertDialog | UX | 6 |
| Missing Zod validation on several forms | Quality | 7 |
| PWA disabled, offline mode not implemented | Critical (user req) | 8 |
| CaseSubfileList has no file upload | Medium | 9 |
| Profile page has hardcoded defaults | Low | 10 |

---

## Phase 1: Quick Bug Fixes

### 1a. Fix image path typo
- Rename folder `public/images/weighiging/` → `public/images/weighing/` (11 files inside)
- Update all code references from `weighiging` to `weighing` (grep all `.tsx`/`.ts` files)

### 1b. Fix hardcoded station code
- `src/components/weighing/TagsTab.tsx` — replace hardcoded `'MRK'` with dynamic station code from user context or config

### 1c. Remove non-functional OAuth buttons
- `src/app/login/page.tsx` — remove or hide Google/Microsoft OAuth buttons that have no backend support

**Files**: ~5 modified, 1 folder renamed

---

## Phase 2: Pesaflow Iframe Dialog

**User requirement**: Payment link must render internally in a popup dialog, NOT open external browser tab.

### New: `src/components/payments/PesaflowCheckoutDialog.tsx`
- Dialog with iframe rendering `iframeHtml` from `PesaflowCheckoutResponse`
- Fallback to `checkoutUrl` in iframe if no `iframeHtml`
- Loading state, error handling, close button
- Dialog auto-closes on payment completion (poll or postMessage event)

### Modify: `src/components/case/ProsecutionSection.tsx`
- Replace `window.open(checkout.checkoutUrl, '_blank')` (line ~278) with opening `PesaflowCheckoutDialog`
- Add state for dialog open/close

**Reference**: `src/lib/api/integration.ts` already has `iframeHtml` field on `PesaflowCheckoutResponse`

**Files**: 1 new, 1 modified

---

## Phase 3: Technical Dashboard — Real API Data

Replace 100% mock data (lines 60-112 of `src/app/technical/page.tsx`).

### New: `src/lib/api/health.ts`
- `getHealthStatus()` → `GET /health` (backend `HealthController.cs` returns `{ status, service, timestamp, version }`)

### New: `src/hooks/queries/useTechnicalQueries.ts`
- `useHealthStatus()` — REAL_TIME (30s) cache
- Leverages existing `useMiddleware()` for device/scale WebSocket data

### Modify: `src/app/technical/page.tsx`
- Replace mock `devices[]` with real data from `useMiddleware()` (provides scale/connection status via WebSocket)
- Replace mock `services[]` with health check from `/health`
- Replace mock scale test with real diagnostic
- Keep existing UI structure (cards, status badges)

**Files**: 2 new, 1 modified

---

## Phase 4: Reporting CSV Export

Replace TODO stub at line ~108 of `src/app/reporting/page.tsx`.

### New: `src/lib/utils/export.ts`
- `exportToCSV(data, columns, filename)` — array to CSV with proper escaping, triggers download

### Modify: `src/app/reporting/page.tsx`
- Wire `exportReport()` to `exportToCSV()` with current report data

**Files**: 1 new, 1 modified

---

## Phase 5: Officer Searchable Dropdown

### New: `src/hooks/queries/useUserQueries.ts`
- `useOfficersList()` — fetch available officers for assignment

### Modify: `src/components/case/CaseAssignmentLog.tsx`
- Replace text `<Input>` for officer ID with searchable Select/Combobox
- Display officer name + rank in options
- Selected officer populates `newOfficerId`

**Files**: 1 new, 1 modified

---

## Phase 6: AlertDialog for Confirmations

### Step 1: `pnpm dlx shadcn@latest add alert-dialog`

### Modify 4 files (replace `confirm()` calls):
1. `src/components/axle-config/AxleWeightConfigGrid.tsx` (line 118)
2. `src/components/case/CourtHearingList.tsx` (line 231)
3. `src/app/weighing/multideck/page.tsx` (line 873)
4. `src/app/weighing/mobile/page.tsx` (line 998)

Each: AlertDialog with title, description, Cancel + Continue buttons

**Files**: 1 new (shadcn), 4 modified

---

## Phase 7: Zod Form Validation

Add Zod schemas to forms lacking validation:

- `src/components/case/CaseAssignmentLog.tsx` — officer, reason (min 10 chars), assignment type
- `src/components/case/CaseSubfileList.tsx` — subfile type, name required
- `src/components/case/ProsecutionSection.tsx` — court date, prosecutor, charges
- `src/components/case/ArrestWarrantList.tsx` — warrant fields

Pattern: `z.object()` schema → `useForm({ resolver: zodResolver(schema) })` → field-level errors

**Files**: 4 modified

---

## Phase 8: Offline PWA with Reconcile Flow

**User requirement**: Offline invoicing with default Pesaflow values, reconcile when back online.

### 8a. Enable PWA
- `next.config.js` — re-enable `@ducanh2912/next-pwa` wrapper
- `src/components/PWARegister.tsx` — verify service worker registration

### 8b. Offline Database
- **New**: `src/lib/offline/db.ts` — Dexie schema (invoices, receipts, mutation queue)
- **New**: `src/lib/offline/sync.ts` — Background sync: detect online → push queued mutations → pull updates

### 8c. Offline Mutations
- **New**: `src/hooks/useOfflineMutation.ts` — Queues mutations to Dexie when offline, executes when online
- Invoice creation when offline: save with default Pesaflow fields (status: `PENDING_RECONCILE`, pesaflowRef: null)

### 8d. Reconcile UI
- **New**: `src/components/payments/ReconcileDialog.tsx`
  - Inputs: amount, transaction reference
  - "Verify" → queries Pesaflow endpoint
  - Shows transaction details for confirmation
  - "Reconcile" → updates invoice + status, generates receipt
- Invoice list: show "Reconcile" button on `PENDING_RECONCILE` invoices when online

### 8e. Offline Indicators
- **New**: `src/components/ui/OfflineIndicator.tsx` — Banner showing offline/online status
- Root layout: add OfflineIndicator to app shell
- Uses `navigator.onLine` + `online`/`offline` events

**Files**: 5 new, ~4 modified

---

## Phase 9: File Upload for Subfiles

### New: `src/lib/api/fileUpload.ts`
- `uploadFile(file, caseId, subfileId)` → multipart POST

### Modify: `src/components/case/CaseSubfileList.tsx`
- File input in create/edit dialog
- Show uploaded filename in table
- Upload progress indicator

**Files**: 1 new, 1 modified

---

## Phase 10: Final Polish

- `src/app/profile/page.tsx` — replace hardcoded defaults with user data from auth context
- Add `error.tsx` for key route segments missing error boundaries
- Responsive pass on all pages (most already have responsive Tailwind classes)

**Files**: ~5 modified

---

## Implementation Order

| Step | Phase | Files | Description |
|------|-------|-------|-------------|
| 1 | 1 | ~5 | Quick fixes (image paths, station code, OAuth) |
| 2 | 2 | 2 | Pesaflow iframe dialog |
| 3 | 3 | 3 | Technical dashboard real data |
| 4 | 4 | 2 | CSV export utility |
| 5 | 5 | 2 | Officer searchable dropdown |
| 6 | 6 | 5 | AlertDialog replacements |
| 7 | 7 | 4 | Zod validation schemas |
| 8 | 8 | ~9 | Offline PWA + reconcile |
| 9 | 9 | 2 | File upload for subfiles |
| 10 | 10 | ~5 | Final polish |
| 11 | — | 2 | Update sprint docs + plan.md |
| 12 | — | 0 | `pnpm run build` — verify clean |

**Total**: ~41 files (15 new, ~26 modified)

## Verification

1. `pnpm run build` — zero TypeScript errors
2. All pages load with real data (no mock/placeholder)
3. Pesaflow payment renders in iframe dialog
4. PWA installs and works offline
5. Offline invoices reconcile correctly when back online
6. All forms have Zod validation with field-level errors
7. No browser `confirm()` calls remaining
8. Mobile-responsive on all pages
9. Sprint docs and plan.md updated
