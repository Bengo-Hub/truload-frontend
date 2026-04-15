# Changelog

All notable changes to TruLoad Frontend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.0 (2026-04-14)


### Features

* Add case financial summary and third-party integration management UI ([9338f5f](https://github.com/Bengo-Hub/truload-frontend/commit/9338f5f264405256231fc97caaf853ba6c8df1f8))
* add GitHub Actions deployment workflow ([06d31dd](https://github.com/Bengo-Hub/truload-frontend/commit/06d31dda9493a51ae70946e771626bd8eba07ffe))
* **admin:** move security/backup/audit from platform to tenant ([31ee63e](https://github.com/Bengo-Hub/truload-frontend/commit/31ee63e98620d25a5c357deed20ba54664f97697))
* **analytics:** add AI query export functionality ([e0d27e9](https://github.com/Bengo-Hub/truload-frontend/commit/e0d27e990569aad0034b4d8e8c4334f1482fd849))
* auth pages ([6a0c9aa](https://github.com/Bengo-Hub/truload-frontend/commit/6a0c9aafaea57fe8825e5f4baf9c8befa65e0978))
* BI & AI Reports and Analytics ([cb2a908](https://github.com/Bengo-Hub/truload-frontend/commit/cb2a908d63571eae762d4aa826c7f8509b06a9df))
* case management UI improvements - warrants, diary, parties, responsiveness ([10c9f1d](https://github.com/Bengo-Hub/truload-frontend/commit/10c9f1dc6cecd130e48b66a546c51b6d8cb50dae))
* case-register ([bc6428b](https://github.com/Bengo-Hub/truload-frontend/commit/bc6428b6ac00f041270f9d94dd5aae4975ab4c16))
* conviction history ladder display + habitual offenders report ([3ed9c8c](https://github.com/Bengo-Hub/truload-frontend/commit/3ed9c8c333dde4cb8d064c7f846ac5dc7f242295))
* enhance weighing workflow and vehicle management ([7d04452](https://github.com/Bengo-Hub/truload-frontend/commit/7d044525b3e76bd50dd608c372ab4a47b2acd2b3))
* frontend org slug based routing ([ea8350f](https://github.com/Bengo-Hub/truload-frontend/commit/ea8350fb400c16e5e18b7fd9a1301c3060e48c01))
* implement weighing capture location dropdowns and version display ([0791ce9](https://github.com/Bengo-Hub/truload-frontend/commit/0791ce9e31cc62558d51e98ac9342bf35e6e2e9b))
* modular base provisioning ([1d52093](https://github.com/Bengo-Hub/truload-frontend/commit/1d52093d93df20fec14a91825ecdedbc97560207))
* polish features, ui refining ([75063d0](https://github.com/Bengo-Hub/truload-frontend/commit/75063d0cc5029c57d59b1c29903ad1f1678a69fd))
* pwa ([bdedb39](https://github.com/Bengo-Hub/truload-frontend/commit/bdedb3901cd9b4cf9bb9daca74b229cf30ad13b5))
* real-time signalr feature ([24726c9](https://github.com/Bengo-Hub/truload-frontend/commit/24726c9555c44f61eacbaed9fa1c09bcdd6039e5))
* redesign vehicle information card and fix WebSocket priority ([a52dbce](https://github.com/Bengo-Hub/truload-frontend/commit/a52dbce5b6cd53fbe90597f35faa0bb198f4f815))
* replace TreasuryCheckoutDialog redirect with iframe embed pattern ([8439f31](https://github.com/Bengo-Hub/truload-frontend/commit/8439f31881350fdf8ef61e883f4399b478d423f6))
* skip devENV.yml in CI/CD and update API domain ([98a9ddd](https://github.com/Bengo-Hub/truload-frontend/commit/98a9ddd870a52f93359d1f57051f792cbd3fd462))
* update plan for DA integration ([c34f549](https://github.com/Bengo-Hub/truload-frontend/commit/c34f549e2f5d739bdb66584217a28693e62dd067))
* wait for ArgoCD sync before health check ([86281f8](https://github.com/Bengo-Hub/truload-frontend/commit/86281f88309823f7d84fdd13ac34206b84f03e92))
* weghing location features ([83edee8](https://github.com/Bengo-Hub/truload-frontend/commit/83edee83bd6e1c7308c9ed15aa8097782c56f437))
* weighing workflows and screens ([5d8359f](https://github.com/Bengo-Hub/truload-frontend/commit/5d8359f8916629f04e48f3969c51a055f2baf537))
* **weighing:** add yard management and enhanced weighing features ([2689a0f](https://github.com/Bengo-Hub/truload-frontend/commit/2689a0f0818f9bffb5862758571bea6969be2415))


### Bug Fixes

* ac let const error ([e45dedf](https://github.com/Bengo-Hub/truload-frontend/commit/e45dedf1f59b41e71881937308ba2ffe33151f52))
* ac let const error ([fcb2013](https://github.com/Bengo-Hub/truload-frontend/commit/fcb2013fb819f3839f582b1905b470f93ff62522))
* align deployment workflow with erp-ui pattern ([58e3c2d](https://github.com/Bengo-Hub/truload-frontend/commit/58e3c2d87ded8eb71c221b7ee681b7be926acda5))
* always notify middleware of axle captures for MCGS cumulative tracking ([37b2dc0](https://github.com/Bengo-Hub/truload-frontend/commit/37b2dc08bee037d4c4d751f1c445f76f97df7b55))
* auth flow ([e76be60](https://github.com/Bengo-Hub/truload-frontend/commit/e76be60767ec1660eb662136574cb190286feb9f))
* auto-retry deploy when secrets just synced + remove GIT_SECRET debug check ([2b5cf1f](https://github.com/Bengo-Hub/truload-frontend/commit/2b5cf1f7b0c840ce8eaa3814b306f5d1c93426c8))
* backup schedules ([6f20ee5](https://github.com/Bengo-Hub/truload-frontend/commit/6f20ee582471c7d1e2f47035076ab6692c3e58df))
* build issues ([22f2da7](https://github.com/Bengo-Hub/truload-frontend/commit/22f2da749d9c839cdc2659d065b80087f5468210))
* case management navigation and workflow access after escalation ([7b8ab0f](https://github.com/Bengo-Hub/truload-frontend/commit/7b8ab0f958c2490382fb953e0e13e49fbcbc9d17))
* case worflows ([42cea8a](https://github.com/Bengo-Hub/truload-frontend/commit/42cea8a239a64180b1ea070e3f20236379d088a5))
* clone devops-k8s repo before helm values update ([ccf1a2e](https://github.com/Bengo-Hub/truload-frontend/commit/ccf1a2ef06d8b5bfe4de85181c3b0afe0ea663e2))
* compliance consistency — pass config ID to backend, use DB tolerances everywhere ([f108329](https://github.com/Bengo-Hub/truload-frontend/commit/f108329c98258b0ea34007af9d845ee3f18bed9b))
* compliance enforcement ([2c7ada3](https://github.com/Bengo-Hub/truload-frontend/commit/2c7ada352cbf1b4e4d11cbc0acd1cad50c507fed))
* compliance enforcement ([34fc80e](https://github.com/Bengo-Hub/truload-frontend/commit/34fc80e191f84fa1e343b01167a337320a325a15))
* cors, weighing, currency issues ([61b0b91](https://github.com/Bengo-Hub/truload-frontend/commit/61b0b911b41c4f07ca5f22bcabb504f67045aff7))
* create environment secret for frontend pods ([901a94b](https://github.com/Bengo-Hub/truload-frontend/commit/901a94bf37655ccd43e8a6a3c71d17bd5be258e3))
* Create minimal environment secret ([901a94b](https://github.com/Bengo-Hub/truload-frontend/commit/901a94bf37655ccd43e8a6a3c71d17bd5be258e3))
* detect and re-sync empty-valued deployment secrets ([0f28010](https://github.com/Bengo-Hub/truload-frontend/commit/0f280107e37de1d2f51e9d07e21ed55950e1f3f2))
* docker build issue ([1fbd00e](https://github.com/Bengo-Hub/truload-frontend/commit/1fbd00edcf65a76f6badca46eba9d302b2a84b01))
* eliminate hardcoded dollar signs in frontend displays ([4b9cf83](https://github.com/Bengo-Hub/truload-frontend/commit/4b9cf837937eadc37f652a98a6a8cda6c42c8d20))
* Ensure correct repository case in deploy workflow (Bengo-Hub not bengo-hub) ([8585b26](https://github.com/Bengo-Hub/truload-frontend/commit/8585b26256a7afb1a8657d79cbf207be28fddc9b))
* **favicon:** correct icon references to use existing assets ([842dbd5](https://github.com/Bengo-Hub/truload-frontend/commit/842dbd5d6331c27a7a5ad863da8892e1664a2dcd))
* **financial:** use AppShell centralized layout for invoices and receipts pages ([0a23c48](https://github.com/Bengo-Hub/truload-frontend/commit/0a23c48795bba14f08db6ec504b01413a1a00132))
* **frontend:** add empty turbopack config and use corepack for pnpm to avoid Turbopack build error and corepack downloads ([27157bf](https://github.com/Bengo-Hub/truload-frontend/commit/27157bfb512e6f3bcebc89842b8fadc2451c0d19))
* frozen lock file ([e7ba140](https://github.com/Bengo-Hub/truload-frontend/commit/e7ba14019567fe95d112dcccfe309f835f90d2ae))
* harden station-scoped data filtering and statistics reactivity ([3b12ef5](https://github.com/Bengo-Hub/truload-frontend/commit/3b12ef53bd62d38fa0cac4046daf027729c3635e))
* honor currency and payment date in financial UI ([1a3a17d](https://github.com/Bengo-Hub/truload-frontend/commit/1a3a17d102018c9fd05fed7a849bc36ed1784fed))
* integrations and e2e tests ([914d13b](https://github.com/Bengo-Hub/truload-frontend/commit/914d13b57d1de888a303d778ea98d8a5dbc8a318))
* module access polish and bug fixes ([904201b](https://github.com/Bengo-Hub/truload-frontend/commit/904201b6d6fd8b8cca5bae8f94de5f69a789d30f))
* node modules ([05433b2](https://github.com/Bengo-Hub/truload-frontend/commit/05433b28ea7315c40d8478f0c1cc7069b5af98fa))
* polish case sub files logic ([e454ae9](https://github.com/Bengo-Hub/truload-frontend/commit/e454ae93e2e58379e5e0f1910311dcf06373c71b))
* polish features ([1dd247a](https://github.com/Bengo-Hub/truload-frontend/commit/1dd247a8be8455b00d3c26dff2864fa61752e30f))
* polish report features ([3b9ba01](https://github.com/Bengo-Hub/truload-frontend/commit/3b9ba0118bc7dd882b121e8626cdee47086abfb5))
* prevent image tag scientific notation in yq - use strenv() instead of env() ([b224c40](https://github.com/Bengo-Hub/truload-frontend/commit/b224c405e8badc46fd9bd02a9050cba77c8a64b0))
* RBAC and permissions ([d526a02](https://github.com/Bengo-Hub/truload-frontend/commit/d526a02f2f9913c5b49ec2e9d5e04856519a9b08))
* refresh system version more frequently in UI ([0bd84b9](https://github.com/Bengo-Hub/truload-frontend/commit/0bd84b9193f99d309aa7a48f74d9a710ae629e7a))
* remove duplicate NTAC Number field from transporter setup and weighing forms ([59932b0](https://github.com/Bengo-Hub/truload-frontend/commit/59932b07cd432d25d3fc93a62a2bcca9b50d9659))
* remove unsupported experimental.forceSwcTransforms config ([3f363d9](https://github.com/Bengo-Hub/truload-frontend/commit/3f363d9a13be8ec6a5042eb9689762c32656f71a))
* reports module select issue ([4ab0d9d](https://github.com/Bengo-Hub/truload-frontend/commit/4ab0d9d47b0f481787cd666bfd45bd7fc84db168))
* restore REQUIRED_SECRETS indentation in deploy.yml ([fe9fc49](https://github.com/Bengo-Hub/truload-frontend/commit/fe9fc497b471067192032b32fa8cd42a6925a381))
* Sprint 22 - integrations, health name, exchange rates, superset SDK ([786294e](https://github.com/Bengo-Hub/truload-frontend/commit/786294e2d05cc1a5f45db7b763a3d64e19b3dd89))
* standardize deployment pipeline with robust token resolution ([ef2a0f2](https://github.com/Bengo-Hub/truload-frontend/commit/ef2a0f2606bb89c655a8117ec7fe2a66c11fbf93))
* streamline conviction history and reconcile reference defaults ([4ffc034](https://github.com/Bengo-Hub/truload-frontend/commit/4ffc0344740b7dcfdfc68fa65391e3621441bb84))
* types patch ([eba9482](https://github.com/Bengo-Hub/truload-frontend/commit/eba9482fe0062e05674d24ede460140c501f91cb))
* **types:** add missing authentication type definitions ([da6556c](https://github.com/Bengo-Hub/truload-frontend/commit/da6556c73cb8b2b6354bfd28b71c1bab4f6c140c))
* **types:** update user type properties to match frontend usage ([55c20c3](https://github.com/Bengo-Hub/truload-frontend/commit/55c20c3a944896fcd528d45a04b82fbd4e5e0248))
* warrant form redesign, subfile cards, diary activity feed, weight ticket preview ([1a82f0b](https://github.com/Bengo-Hub/truload-frontend/commit/1a82f0bf46190083389048c7a363e643796caf96))
* weighing transaction capture plate issue ([6d9ae74](https://github.com/Bengo-Hub/truload-frontend/commit/6d9ae743b9473ca28946bc4785633ce854737e14))
* weighing workflow, axle state persistence, and middleware comms ([fad1a0f](https://github.com/Bengo-Hub/truload-frontend/commit/fad1a0faf220627d8084ecc3abe1d64fb944c9e9))
* **workflow:** handle kubeconfig as base64 OR raw YAML to avoid base64 errors ([66cb3b4](https://github.com/Bengo-Hub/truload-frontend/commit/66cb3b4f57fe06b4296ab30a8442a2897049c96e))
* **workflow:** retry/verify secret sync when partial to avoid false timeout ([962f01d](https://github.com/Bengo-Hub/truload-frontend/commit/962f01d0d37abb0751bd5dccb32a08b7f0b29307))
* **workflow:** robust kubeconfig handling (decode or raw) to avoid base64 errors ([d1f14e3](https://github.com/Bengo-Hub/truload-frontend/commit/d1f14e3c08324e806ab9e10647ad9c7ac47d180d))

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
