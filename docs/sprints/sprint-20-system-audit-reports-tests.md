# Sprint 20: System Audit, Reports Revamp & E2E Tests

**Sprint Duration:** 1 day
**Date Completed:** February 13, 2026
**Priority:** P0 - Critical
**Status:** COMPLETE

---

## Sprint Goal

Comprehensive system audit across all 6 modules to find and fix bugs, build a modular backend report generation system with 26 report types, revamp the frontend reporting UI to use backend-powered report catalog, add weighing metadata setup page, and establish robust E2E integration test infrastructure with 166 passing tests.

---

## Summary

Sprint 20 delivered five major phases: (1) a modular backend reports module with 26 report types across 6 modules using QuestPDF and CsvHelper, (2) a frontend reports revamp replacing hardcoded templates with backend-powered catalog and PDF preview, (3) a weighing metadata setup page with 6 CRUD tabs, (4) a full system audit that found and fixed 57+ issues across weighing, cases, financial, prosecution, and sidebar, and (5) E2E integration tests with 166 tests at 100% pass rate covering user CRUD, roles, permissions, 2FA, password policy, shifts, and security settings.

---

## Deliverables

### Phase 1: Backend Reports Module (New)
- [x] Created modular report generation system: `IReportService`, `ReportService`, `BaseReportGenerator`, `BaseReportDocument`
- [x] 6 module report generators: WeighingReportGenerator, ProsecutionReportGenerator, CaseReportGenerator, FinancialReportGenerator, YardReportGenerator, SecurityReportGenerator
- [x] New `ReportController` with `GET /api/v1/reports/catalog` and `GET /api/v1/reports/{module}/{reportType}` endpoints
- [x] DTOs: ReportRequest, ReportResponse, ReportDefinitionDto, ReportMetadata
- [x] 26 report types across 6 modules: Weighing (12), Prosecution (6), Cases (3), Financial (3), Yard (2), Security (2)
- [x] PDF generation via QuestPDF BaseReportDocument with tabular layout, date range headers, summary footers
- [x] CSV generation via CsvHelper
- [x] Registered all services in Program.cs DI container

### Phase 2: Frontend Reports Revamp
- [x] Created `src/lib/api/reports.ts` with fetchReportCatalog, downloadReport, triggerBlobDownload, createBlobUrl, revokeBlobUrl
- [x] Created `src/hooks/queries/useReportQueries.ts` with useReportCatalog, useDownloadReport, useGenerateAndDownloadReport
- [x] Created `src/components/reporting/ReportPreviewDialog.tsx` for PDF preview in iframe before download
- [x] Rewrote `src/components/reporting/ModuleReportSelector.tsx` to use backend-powered report catalog (was hardcoded templates)
- [x] Updated `src/app/reporting/page.tsx` to remove old export logic
- [x] Report flow: Module select -> Fetch catalog from backend -> Select report + date range -> Generate PDF/CSV -> Preview/Download

### Phase 3: Weighing Metadata Setup Tab
- [x] Created `src/app/setup/weighing-metadata/page.tsx` with 6 tabs: Transporters, Drivers, Vehicles, Cargo Types, Origins/Destinations, Vehicle Makes
- [x] Added 9 new CRUD API functions in `src/lib/api/weighing.ts` (update/delete for all entities)
- [x] Added 12 new mutation hooks in `src/hooks/queries/useWeighingQueries.ts`
- [x] Updated `src/components/layout/AppSidebar.tsx` with "Weighing Data" menu item under Setup
- [x] Updated `CargoTypeModal.tsx` to support 'view' mode

### Phase 4: System Audit & Gap Fixes (57+ issues found, all critical/high fixed)

**Weighing fixes:**
- [x] ANPR scan simulation replaced with proper toast notification
- [x] alert() stub for permit viewer replaced with toast.info
- [x] Mock scaleStatus removed, derived from middleware connection
- [x] RE-WEIGH label made dynamic using reweighCycleNo
- [x] Added missing CargoTypeModal to multideck page
- [x] Special release permission fixed: 'special-release.create' -> 'case.special_release'

**Case register fixes:**
- [x] Removed "New Case" button linking to non-existent /cases/new route
- [x] Fixed escalate mutation signature mismatch
- [x] Fixed search double-setting caseNo and vehicleRegNumber

**Financial module fixes (CRITICAL):**
- [x] Invoice page: invoiceNumber -> invoiceNo, amount -> amountDue, prosecutionCaseNo -> caseNo
- [x] Receipt page: receiptNumber -> receiptNo, invoiceNumber -> invoiceNo, amount -> amountPaid
- [x] Statistics property fixes for both pages
- [x] Search criteria date field fixes
- [x] Download mutation return type fix
- [x] Added missing DTO fields (paidAt, voidedAt, voidReason, status)

**Prosecution fixes:**
- [x] Court hearing API double /api/v1 prefix stripped (was producing 404s)
- [x] Search double-field issue fixed
- [x] Unsafe non-null assertion fixed

**Sidebar:**
- [x] Added financial pages (/financial/invoices, /financial/receipts) with Receipt and CreditCard icons

### Phase 5: E2E Integration Tests (166 tests, 100% pass rate)
- [x] Test infrastructure: TestDbContextFactory, TestUserHelper, ServiceFactory
- [x] UserCrudTests (10 tests): Create, duplicate email, update, delete, list, pagination, search, role assign/remove/get
- [x] RolePermissionTests (7 tests): Create role with permissions, update, delete, list, verify access control, hierarchy
- [x] PasswordPolicyTests: Password length, complexity, history, expiry, lockout, reset flow
- [x] TwoFactorTests: Enable/disable 2FA, generate setup, verify code, reject invalid, recovery codes
- [x] SecuritySettingsTests: Read/update password policy, 2FA enforcement, audit log entries
- [x] ShiftCrudTests (15 tests): Create/update/delete shifts, rotations, user assignments, enforcement settings
- [x] PermissionSeedingTests: Updated to verify 121 permissions across 14 categories (was 83/8)

---

## Key Metrics

- Backend tests: 166/166 passing (100%)
- Frontend build: 25 routes, 0 errors
- Backend build: 0 errors
- Report types: 26 across 6 modules
- Bug fixes: 57+ issues audited, all critical/high resolved
- New test files: 8 test classes
- New/modified files: 40+

---

## Files Created

### Backend
- `Services/Reports/IReportService.cs`
- `Services/Reports/ReportService.cs`
- `Services/Reports/BaseReportGenerator.cs`
- `Services/Reports/BaseReportDocument.cs`
- `Services/Reports/Generators/WeighingReportGenerator.cs`
- `Services/Reports/Generators/ProsecutionReportGenerator.cs`
- `Services/Reports/Generators/CaseReportGenerator.cs`
- `Services/Reports/Generators/FinancialReportGenerator.cs`
- `Services/Reports/Generators/YardReportGenerator.cs`
- `Services/Reports/Generators/SecurityReportGenerator.cs`
- `Controllers/ReportController.cs`
- `DTOs/Reports/ReportRequest.cs`
- `DTOs/Reports/ReportResponse.cs`
- `DTOs/Reports/ReportDefinitionDto.cs`
- `DTOs/Reports/ReportMetadata.cs`
- `Tests/UserCrudTests.cs`
- `Tests/RolePermissionTests.cs`
- `Tests/PasswordPolicyTests.cs`
- `Tests/TwoFactorTests.cs`
- `Tests/SecuritySettingsTests.cs`
- `Tests/ShiftCrudTests.cs`
- `Tests/Infrastructure/TestDbContextFactory.cs`
- `Tests/Infrastructure/TestUserHelper.cs`
- `Tests/Infrastructure/ServiceFactory.cs`

### Frontend
- `src/lib/api/reports.ts`
- `src/hooks/queries/useReportQueries.ts`
- `src/components/reporting/ReportPreviewDialog.tsx`
- `src/app/setup/weighing-metadata/page.tsx`

## Files Modified

### Backend
- `Program.cs` (DI registration for report services)
- `Data/Seeders/PermissionSeeder.cs` (121 permissions across 14 categories)
- `Tests/PermissionSeedingTests.cs` (updated to verify 121/14)

### Frontend
- `src/components/reporting/ModuleReportSelector.tsx` (rewrote to use backend catalog)
- `src/app/reporting/page.tsx` (removed old export logic)
- `src/lib/api/weighing.ts` (9 new CRUD API functions)
- `src/hooks/queries/useWeighingQueries.ts` (12 new mutation hooks)
- `src/components/layout/AppSidebar.tsx` (weighing data menu + financial pages)
- `src/components/weighing/CargoTypeModal.tsx` (view mode support)
- `src/app/weighing/mobile/page.tsx` (ANPR toast, scaleStatus, reweigh label, permission fix)
- `src/app/weighing/multideck/page.tsx` (CargoTypeModal, scaleStatus, reweigh label)
- `src/app/cases/page.tsx` (removed New Case button, fixed escalate, fixed search)
- `src/app/financial/invoices/page.tsx` (DTO field name fixes, statistics fixes)
- `src/app/financial/receipts/page.tsx` (DTO field name fixes, statistics fixes)
- `src/app/prosecution/page.tsx` (double prefix fix, search fix, non-null fix)

---

## Build Verification

```
# Frontend
pnpm run build -> 0 errors, 25 routes

# Backend
dotnet build -> 0 errors

# Tests
dotnet test -> 166/166 passing (0 failures)
```
