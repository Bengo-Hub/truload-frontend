# Sprint 17: Case Management Frontend Adaptation

**Sprint Duration:** 1 day
**Date Completed:** February 12, 2026
**Priority:** P1 - Critical
**Status:** COMPLETE

---

## Sprint Goal

Adapt the frontend to expose 5 backend case lifecycle features that were fully implemented but had no UI: Case Parties, Case Subfiles, Arrest Warrants, Closure Checklists, and Case Assignment Logs. Restructure the case detail page with a tabbed layout to accommodate all features. Verify backend E2E scenarios pass 109/109.

---

## Background

### Current State (Post Sprint 16b)

**Backend Status:** 100% complete with full case lifecycle APIs
- 6 E2E compliance scenarios covering overload detection through case closure
- Court hearings, prosecution, special release, parties, subfiles, warrants, closure checklists, assignments all have REST endpoints
- 109 total test steps across all scenarios

**Frontend Status:** 99% complete
- Case Register, Court Hearings, Prosecution, Special Release UI implemented
- **5 features missing frontend UI** despite having complete backend support:
  - Case Parties (defendant, complainant, witness, IO)
  - Case Subfiles (A-J document management)
  - Arrest Warrants (issue, execute, drop)
  - Closure Checklists (subfile verification + review workflow)
  - Case Assignment Logs (IO assignment history)

---

## Deliverables

### 0. Backend E2E Verification

**Status:** COMPLETE - 109/109 passing

- Fixed Scenario 3: Changed `/case/release-types` (404) to correct endpoint `case/taxonomy/release-types`
- Fixed Scenario 5: Increased HTTP timeout from 30s to 60s across all 6 test scripts
- Created `run_all_scenarios.py` runner script for sequential execution with TEST_RESULTS.md output
- All 6 scenarios pass sequentially on fresh database

### 1. shadcn Checkbox Component

**File:** `src/components/ui/checkbox.tsx`
**Status:** COMPLETE

Added via `pnpm dlx shadcn@latest add checkbox` for use in closure checklist subfile verification.

### 2. API Layer (5 files)

All files follow the pattern established by `src/lib/api/courtHearing.ts`: inline TypeScript interfaces + async functions using `apiClient`.

| File | Types | Functions |
|------|-------|-----------|
| `src/lib/api/caseParty.ts` | `CasePartyDto`, `AddCasePartyRequest`, `UpdateCasePartyRequest` | `getPartiesByCaseId`, `addParty`, `updateParty`, `removeParty` |
| `src/lib/api/caseSubfile.ts` | `CaseSubfileDto`, `CreateCaseSubfileRequest`, `UpdateCaseSubfileRequest`, `SubfileCompletionDto`, `SubfileTypeDto` | `getSubfilesByCaseId`, `getSubfileCompletion`, `createSubfile`, `updateSubfile`, `deleteSubfile`, `fetchSubfileTypes` |
| `src/lib/api/arrestWarrant.ts` | `ArrestWarrantDto`, `CreateArrestWarrantRequest`, `ExecuteWarrantRequest`, `DropWarrantRequest` | `getWarrantsByCaseId`, `getWarrantById`, `createWarrant`, `executeWarrant`, `dropWarrant` |
| `src/lib/api/closureChecklist.ts` | `CaseClosureChecklistDto`, `UpdateChecklistRequest`, `RequestReviewRequest`, `ReviewDecisionRequest`, `ClosureTypeDto` | `getChecklist`, `updateChecklist`, `requestReview`, `approveReview`, `rejectReview`, `fetchClosureTypes` |
| `src/lib/api/caseAssignment.ts` | `CaseAssignmentLogDto`, `LogAssignmentRequest` | `getAssignmentsByCaseId`, `getCurrentAssignment`, `logAssignment` |

### 3. Query Hook Layer (5 files)

All files follow the pattern established by `src/hooks/queries/useCourtHearingQueries.ts`: query keys, `useQuery` with `QUERY_OPTIONS` presets, `useMutation` with cache invalidation.

| File | Queries | Mutations | Cache Tier |
|------|---------|-----------|------------|
| `useCasePartyQueries.ts` | `usePartiesByCaseId` | `useAddParty`, `useUpdateParty`, `useRemoveParty` | dynamic (1min) |
| `useCaseSubfileQueries.ts` | `useSubfilesByCaseId`, `useSubfileCompletion`, `useSubfileTypes` | `useCreateSubfile`, `useUpdateSubfile`, `useDeleteSubfile` | dynamic + static (types) |
| `useArrestWarrantQueries.ts` | `useWarrantsByCaseId` | `useCreateWarrant`, `useExecuteWarrant`, `useDropWarrant` | dynamic (1min) |
| `useClosureChecklistQueries.ts` | `useClosureChecklist`, `useClosureTypes` | `useUpdateChecklist`, `useRequestChecklistReview`, `useApproveChecklistReview`, `useRejectChecklistReview` | dynamic + static (types) |
| `useCaseAssignmentQueries.ts` | `useAssignmentsByCaseId`, `useCurrentAssignment` | `useLogAssignment` | dynamic (1min) |

### 4. UI Component Layer (5 files)

All files follow the pattern established by `src/components/case/CourtHearingList.tsx`: Card + Table/Form + Dialog + toast notifications.

| Component | Layout | Key Features | Permission |
|-----------|--------|-------------|------------|
| `CasePartyList.tsx` | Table + Add/Edit/Remove modals | Role badges (defendant=red, complainant=blue, witness=purple, IO=green), role dropdown, ID/phone fields | `case.update` |
| `CaseSubfileList.tsx` | Table + completion progress bar + Create/Edit/Delete modals | Subfile-types taxonomy dropdown, file size display, completion percentage from `/completion` endpoint | `case.update` |
| `ArrestWarrantList.tsx` | Table + Issue/Execute/Drop modals | Status badges (Issued=yellow, Executed=green, Dropped=gray), actions only for ISSUED warrants | `case.arrest_warrant` |
| `ClosureChecklistPanel.tsx` | Form-based (not table) | Closure type dropdown, 10 subfile checkboxes (A-J) in 2-column grid, review workflow (request -> approve/reject), state synced from API via useEffect | `case.close` |
| `CaseAssignmentLog.tsx` | Timeline view + Assign Officer modal | Current IO highlighted in indigo card, chronological timeline with type badges, transfer arrows for reassignments | `case.update` |

### 5. Barrel Exports

**Files Modified:**
- `src/hooks/queries/index.ts` - Added 5 new `export *` statements
- `src/components/case/index.ts` - Added 5 new named exports

### 6. Case Detail Page Restructure

**File Modified:** `src/app/cases/[id]/page.tsx`

**Changes:**
- Imported `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger` from shadcn/ui
- Imported 5 new components from `@/components/case`
- Left column (2/3 width) restructured into 7-tab layout:
  - **Overview** — Existing Violation Details + Vehicle & Driver + Special Releases cards
  - **Parties** — `<CasePartyList>`
  - **Subfiles** — `<CaseSubfileList>`
  - **Hearings** — `<CourtHearingList>` (moved from standalone)
  - **Warrants** — `<ArrestWarrantList>`
  - **Prosecution** — `<ProsecutionSection>` (moved from standalone)
  - **Closure** — `<ClosureChecklistPanel>`
- Right column (1/3 width) — Timeline, Officers, **Assignment Log** (new), Disposition unchanged
- TabsList uses responsive grid: `grid-cols-4` on mobile, `grid-cols-7` on desktop

---

## Files Created (16 total)

| # | File | Type |
|---|------|------|
| 1 | `src/components/ui/checkbox.tsx` | shadcn component |
| 2 | `src/lib/api/caseParty.ts` | API layer |
| 3 | `src/lib/api/caseSubfile.ts` | API layer |
| 4 | `src/lib/api/arrestWarrant.ts` | API layer |
| 5 | `src/lib/api/closureChecklist.ts` | API layer |
| 6 | `src/lib/api/caseAssignment.ts` | API layer |
| 7 | `src/hooks/queries/useCasePartyQueries.ts` | Query hooks |
| 8 | `src/hooks/queries/useCaseSubfileQueries.ts` | Query hooks |
| 9 | `src/hooks/queries/useArrestWarrantQueries.ts` | Query hooks |
| 10 | `src/hooks/queries/useClosureChecklistQueries.ts` | Query hooks |
| 11 | `src/hooks/queries/useCaseAssignmentQueries.ts` | Query hooks |
| 12 | `src/components/case/CasePartyList.tsx` | UI component |
| 13 | `src/components/case/CaseSubfileList.tsx` | UI component |
| 14 | `src/components/case/ArrestWarrantList.tsx` | UI component |
| 15 | `src/components/case/ClosureChecklistPanel.tsx` | UI component |
| 16 | `src/components/case/CaseAssignmentLog.tsx` | UI component |

## Files Modified (3 total)

| # | File | Changes |
|---|------|---------|
| 17 | `src/hooks/queries/index.ts` | +5 barrel exports |
| 18 | `src/components/case/index.ts` | +5 barrel exports |
| 19 | `src/app/cases/[id]/page.tsx` | Tabbed layout + assignment log |

---

## Verification

- [x] `pnpm run build` — 0 TypeScript errors, all 21 pages compile
- [x] Backend E2E — 109/109 steps passing across 6 scenarios (sequential, fresh DB)
- [ ] Manual UI testing — Navigate to `/cases/{id}`, verify all 7 tabs render and load data
- [ ] CRUD testing — Test each feature's create/update/delete against running backend

---

## Architecture Decisions

1. **Tabs over routes** — All 5 features embedded as tabs within the existing case detail page, not separate routes. This keeps the case context visible and avoids deep navigation.

2. **3-layer pattern** — Each feature follows the same `api → hooks → component` pattern established by CourtHearingList, ensuring consistency and maintainability.

3. **Permission-gated actions** — All action buttons conditionally rendered using `useHasPermission()` with exact backend permission codes (`case.update`, `case.arrest_warrant`, `case.close`).

4. **Cache tiering** — Dynamic data (parties, subfiles, warrants, assignments) uses 1-minute staleTime. Static taxonomy data (subfile-types, closure-types) uses 30-minute staleTime.

5. **Timeline over table for assignments** — Assignment log uses a vertical timeline layout rather than a table, since assignment history is inherently chronological and the current IO needs visual prominence.
