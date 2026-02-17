# Changelog

All notable changes to TruLoad Frontend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed (Sprint 22.1 - Production Bug Fixes - 2026-02-18)

#### Weighing Workflow
- **Backend WebSocket removed**: Removed `getBackendWsUrl()` from `useMiddleware.ts`; always connects to local TruConnect middleware (no failed `wss://` connection attempts in production)
- **Frontend ticket number generation removed**: Removed `generateTicketNumber()` from `useWeighing.ts` and `mobile/page.tsx`; backend now generates ticket numbers via `DocumentNumberService` using configurable naming conventions
- **Double transaction prevention**: Added `createTransactionMutation.isPending` guard in `initializeTransaction`; disabled "Next" button during loading to prevent double-click
- **Axle capture error handling**: Improved error messages with specific checks for no session, already-captured axle, and no scale weight reading

#### Financial Pages
- **Currency formatting crash**: Added `currency || 'KES'` fallback in `useCurrency.ts` and `ReconcileDialog.tsx` to prevent `Intl.NumberFormat` crash when currency code is undefined

#### UI Improvements
- **PDF preview dialog**: Increased dialog size from `max-w-3xl` to `max-w-[90vw]` (portrait) and `max-w-[95vw]` (landscape); height from `h-[85vh]` to `h-[90vh]` for much larger document preview
- **Vehicle make dropdown**: Added `vehicleMakes` and `onRefreshVehicleMakes` props to `VehicleDetailsCard`; wired `useVehicleMakes` query hook for API-driven makes with refresh button (falls back to hardcoded list)

### Added (Implemented - Feb 2026)
- Initial Next.js 16 project setup with App Router
- PWA support with next-pwa and Workbox
- Offline-first architecture with IndexedDB queue (Dexie.js)
- Shadcn UI component library integration
- TanStack Query v5 for server state management
- Zustand for global state management
- Tailwind CSS styling framework with custom configuration
- TypeScript strict mode configuration
- Middleware for authentication and route protection
- Docker support with multi-stage builds
- Kubernetes deployment configuration
- CI/CD pipeline via GitHub Actions
- ESLint and Prettier configuration
- Environment variable management (.env.example)

### Implemented Features (Feb 2026 Audit)

#### Authentication (90% Complete)
- JWT token management with secure httpOnly cookies
- Login/logout flows with backend integration
- Token refresh mechanism
- Protected route components with RBAC
- Session persistence across page refreshes

#### User Management (100% Complete)
- Accounts tab with full CRUD
- Roles tab with assignment
- Permissions tab with management
- Organizations tab with hierarchy
- Stations tab with configuration
- Departments tab with setup

#### Shift Management (100% Complete)
- Work shift CRUD operations
- Weekly schedule configuration
- Break time tracking
- Start/end time management

#### Axle Configurations (100% Complete)
- AxleWeightConfigGrid with inline editing
- CRUD operations for axle weight references
- Form validation with React Hook Form
- Permission-based access control

#### Weighing Operations (90% Complete)
- Weighing Operations Hub with tabbed interface
- Multideck Weighing Page (3-step workflow) - **Backend wired**
- Mobile/Axle-by-Axle Weighing Page - **Backend wired**
- 32 weighing components (Compliance, Scale Test, Modals)
- Scale Test Management with history
- Weight Tickets listing with search/filter
- ✅ Transaction creation via useWeighing hook
- ✅ Weight capture and submission to backend
- ✅ Entity creation (Driver, Transporter) mutations wired
- ✅ Decision panel (Tag, Yard) actions wired to backend
- ✅ TruConnect WebSocket for real-time weights
- ✅ Vehicle details sync to backend transaction
- TODO: Wire PDF document generation endpoint

#### Yard Management (100% Complete)
- Vehicle yard entry listing with pagination
- Status filtering and updates
- Release workflow with authorization
- Real-time data fetching

#### Tags Management (100% Complete)
- Automatic and manual tag creation
- Tag categories and filtering
- Tag closure workflow
- Tag export interface

#### Dashboard (30% Complete)
- Stat cards (weighings, overloaded, users, cases)
- Basic chart components
- Dashboard filters
- TODO: Superset SDK integration

### Pending Features (Not Started)
- Case Register UI (0%) - Backend 100% ready
- Special Release UI (0%) - Backend 100% ready
- Prosecution UI (0%) - Backend not started
- Document Generation UI (0%) - Wire PDF endpoints
- Advanced Analytics (0%) - Superset SDK embedding
- Vehicle Inspection forms (0%)
- Offline queue with background sync
- NL query UI for analytics

### Completed in Phase 2 (Feb 4, 2026)
- ✅ Production build fixed (TypeScript type errors resolved)
- ✅ TruConnect real-time WebSocket integration
- ✅ Weighing submit APIs wired to backend
- ✅ Mobile weighing page fully integrated
- ✅ Multideck weighing page fully integrated
- ✅ Entity creation modals wired to mutations

### Known Issues
- Security settings UI not wired to backend
- PDF document generation endpoint not yet exposed

## [0.2.0] - 2026-02-02

### Changed
- Updated documentation with current implementation status
- Refined project structure for better module organization
- Enhanced type definitions for API contracts
- Improved collaboration guidelines and coding standards

### Added
- Collaboration guidelines document
- Security policy documentation
- Updated contributing guidelines with frontend-specific patterns
- Code of conduct aligned with backend

## [0.1.0] - 2025-10-28

### Added
- Project initialization with Next.js 16
- Basic folder structure (app/, components/, lib/, stores/)
- Documentation framework (README, Implementation Plan, Integration Guide)
- Build and deployment scripts
- Package.json with core dependencies

