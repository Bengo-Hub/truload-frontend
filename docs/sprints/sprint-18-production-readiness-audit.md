# Sprint 18: Production Readiness Audit

**Sprint Duration:** 1 day
**Date Completed:** February 12, 2026
**Priority:** P0 - Critical
**Status:** COMPLETE

---

## Sprint Goal

Comprehensive audit of all 18 frontend pages, 20 API modules, 180+ hooks, and all UI components. Replace all mock data, placeholder logic, and TODO stubs with real implementations. Add Pesaflow iframe dialog, offline PWA with reconcile flow, file upload, and form validation.

---

## Findings & Resolutions

| Issue | Severity | Resolution |
|-------|----------|------------|
| Image path typo (`weighiging` → `weighing`) | Bug | Fixed folder + 3 source files |
| Hardcoded station code 'MRK' in TagsTab | Bug | Dynamic via `useMyStation()` |
| Non-functional OAuth buttons on login | UX | Removed |
| Pesaflow opens external tab instead of iframe | Critical | `PesaflowCheckoutDialog` component |
| Technical dashboard 100% mock data | Critical | Real hooks: `useHealthStatus`, `useScaleTestStatus` |
| Reporting export is a TODO stub | Medium | `exportArrayToCSV` utility |
| Officer ID is text input | UX | Searchable Select dropdown |
| 4 `confirm()` calls | UX | shadcn AlertDialog |
| Missing Zod validation on 4 forms | Quality | Zod schemas + react-hook-form |
| PWA disabled, offline not implemented | Critical | Full offline PWA + reconcile flow |
| No file upload for case subfiles | Medium | Multipart upload + progress indicator |
| Profile page hardcoded defaults | Low | Uses real user data from auth context |
| No error boundaries | Quality | 4 route-level error.tsx files |

---

## Deliverables

### Phase 1: Bug Fixes (3 files modified, 1 folder renamed)

- Renamed `public/images/weighiging/` → `public/images/weighing/` (11 image files)
- Fixed references in `multideck/page.tsx` (4 refs), `AxleGroupVisual.tsx` (3 refs), `mobile/page.tsx` (4 refs)
- `TagsTab.tsx` — `useMyStation()` hook replaces hardcoded `'MRK'`
- `LoginForm.tsx` — Removed Google/Microsoft OAuth buttons and divider

### Phase 2: Pesaflow Iframe Dialog (1 new, 1 modified)

**New:** `src/components/payments/PesaflowCheckoutDialog.tsx`
- Dialog with iframe rendering `iframeHtml` (srcDoc) or `checkoutUrl` (src)
- Auto-polls payment status every 10s via `queryPaymentStatus`
- Manual "Check Status" button
- Success screen on payment confirmation

**Modified:** `src/components/case/ProsecutionSection.tsx`
- Replaced `window.open()` with iframe dialog
- Added checkout state management

### Phase 3: Technical Dashboard (2 new, 1 rewritten)

**New:** `src/lib/api/health.ts` — `getHealthStatus()` → `GET /health`
**New:** `src/hooks/queries/useTechnicalQueries.ts` — `useHealthStatus()` with REAL_TIME polling
**Rewritten:** `src/app/technical/page.tsx` — All mock data replaced with real hooks

### Phase 4: CSV Export (1 new, 1 modified)

**New:** `src/lib/utils/export.ts` — `exportToCSV()`, `exportArrayToCSV()` with BOM, escaping, auto-download
**Modified:** `src/app/reporting/page.tsx` — Wired export button to real data

### Phase 5: Officer Dropdown (1 new, 1 modified)

**New:** `src/hooks/queries/useUserQueries.ts` — `useOfficersList()` wrapping `fetchUsers`
**Modified:** `src/components/case/CaseAssignmentLog.tsx` — Select dropdown with officer name + role

### Phase 6: AlertDialog (1 installed, 4 modified)

**Installed:** `@radix-ui/react-alert-dialog` via shadcn
**Modified:** `AxleWeightConfigGrid.tsx`, `CourtHearingList.tsx`, `multideck/page.tsx`, `mobile/page.tsx`

### Phase 7: Zod Validation (4 modified)

Added Zod schemas + `zodResolver` to:
- `CaseAssignmentLog.tsx` — officer, reason, assignment type validation
- `CaseSubfileList.tsx` — subfile type, name required
- `ArrestWarrantList.tsx` — warrant fields validation
- `ProsecutionSection.tsx` — Pesaflow client details validation

### Phase 8: Offline PWA + Reconcile (6 new, 3 modified)

**New files:**
- `src/lib/offline/db.ts` — Dexie database: `offlineInvoices`, `mutationQueue` tables
- `src/lib/offline/sync.ts` — Background sync: drain queue oldest-first, retry up to 5x
- `src/hooks/useOnlineStatus.ts` — Reactive `navigator.onLine` with auto-drain on reconnect
- `src/hooks/useOfflineMutation.ts` — Queues to Dexie when offline, executes directly when online
- `src/components/payments/ReconcileDialog.tsx` — Verify → Reconcile flow (amount + transaction ref → query Pesaflow → record payment → update status)
- `src/components/ui/OfflineIndicator.tsx` — Offline/online status banner

**Modified:**
- `next.config.js` — Re-enabled `@ducanh2912/next-pwa` wrapper
- `src/app/layout.tsx` — Added `OfflineIndicator` to app shell
- `src/components/case/ProsecutionSection.tsx` — Added Reconcile button on pending invoices without Pesaflow ref

### Phase 9: File Upload (1 new, 1 modified)

**New:** `src/lib/api/fileUpload.ts` — `uploadSubfileDocument()` multipart POST
**Modified:** `src/components/case/CaseSubfileList.tsx` — File input, progress bar, auto-detect document type

### Phase 10: Final Polish (1 modified, 4 new)

**Modified:** `src/app/profile/page.tsx` — Real user data from auth context
**New error boundaries:** `src/app/error.tsx`, `dashboard/error.tsx`, `cases/error.tsx`, `weighing/error.tsx`

---

## File Summary

| Category | Count |
|----------|-------|
| New files | 15 |
| Modified files | ~20 |
| Deleted files | 0 |
| Total affected | ~35 |

---

## Verification

- `pnpm run build` — Zero TypeScript errors, all 21 pages compile
- No browser `confirm()` calls remaining
- No mock/placeholder data on any page
- Pesaflow renders in iframe dialog (not external tab)
- PWA enabled with offline IndexedDB storage
- Reconcile flow: amount + ref → verify → reconcile → receipt
- All forms have Zod validation with field-level errors
- Error boundaries on key route segments
- Profile page uses real user data
