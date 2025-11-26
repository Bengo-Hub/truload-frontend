# TruLoad Frontend - Implementation Plan

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Technology Stack](#technology-stack)
3. [Architecture & Conventions](#architecture--conventions)
4. [Module Workflows (FRD-Aligned)](#module-workflows-frd-aligned)
5. [Offline Strategy](#offline-strategy)
6. [Data & API Integration](#data--api-integration)
7. [Data Analytics Integration](#data-analytics-integration)
8. [Visual & UX Design](#visual--ux-design)
9. [PWA & Installability](#pwa--installability)
10. [Environment & Build](#environment--build)
11. [Sprint Delivery Plan](#sprint-delivery-plan)
12. [References](#references)

---

## Executive Summary

**System Purpose:** PWA-first client application for field officers and back-office staff. Modern, animated, responsive UI for weighing, prosecution, releases, inspections, and reporting. Integrates with local TruConnect microservice for live weights and supports robust offline capture with background sync. Provides advanced BI dashboards and analytics via Apache Superset integration.

**Key Capabilities:**
- Progressive Web App (PWA) with offline-first architecture
- Multi-mode weighing interface (Static, WIM, Mobile/Axle)
- Real-time weight streaming via TruConnect integration
- Offline form capture with automatic cloud sync
- Case register and prosecution workflows
- Special release management
- Vehicle inspection and dimensional compliance
- Advanced analytics and BI dashboards
- Natural language query interface for data exploration

---

## Technology Stack

### Core Framework
- **Framework:** Next.js 15 (App Router, RSC, Server Actions where useful)
- **Language:** TypeScript
- **Code Quality:** ESLint, Prettier

### State Management & Data Fetching
- **Data Fetching:** TanStack Query (API caching, retries, background refresh)
- **State Management:** Zustand (UI/session state; minimal global state)
- **Offline Storage:** Dexie (IndexedDB) for offline queue/storage

### UI & Styling
- **Styling:** Tailwind CSS
- **Component Library:** Shadcn UI (radix primitives) + class-variance-authority
- **Forms:** React Hook Form + Zod (schema validation)
- **Animations:** Framer Motion (micro-interactions)
- **Icons:** Lucide icons

### PWA & Offline
- **PWA:** Workbox/next-pwa (offline, background sync)
- **Service Worker:** Custom service worker for offline-first functionality

### Data Analytics
- **Superset SDK:** @superset-ui packages for dashboard embedding
- **Query Interface:** Custom React components for natural language queries

---

## Architecture & Conventions

### Folder Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (modules)/                # Feature modules
│   │   ├── weighing/            # Weighing module
│   │   ├── prosecution/         # Prosecution module
│   │   ├── case-register/       # Case register module
│   │   ├── case-management/     # Case management module
│   │   ├── release/             # Special release module
│   │   ├── inspection/          # Vehicle inspection module
│   │   ├── tags/                # Tags module
│   │   ├── reports/             # Reports & analytics module
│   │   ├── settings/            # Settings module
│   │   ├── user-management/     # User management module
│   │   └── security/            # Security & audit module
│   └── api/                     # API routes
├── components/
│   ├── ui/                      # Reusable UI components (Shadcn)
│   ├── charts/                  # Chart components
│   ├── forms/                   # Form components
│   └── modules/                 # Module-specific components
├── lib/
│   ├── api/                     # Axios instance with interceptors
│   ├── auth/                    # JWT/session management
│   ├── offline/                 # Offline sync engine
│   ├── truconnect/              # TruConnect local service client
│   ├── superset/                # Apache Superset SDK integration
│   ├── query/                   # Natural language query processing
│   └── i18n/                    # Internationalization
└── stores/                      # Zustand stores
```

### Module Organization

Each module in `app/(modules)/` follows a consistent structure:
- `page.tsx` - Main module page
- `components/` - Module-specific components
- `hooks/` - Module-specific hooks
- `types/` - Module-specific TypeScript types
- `utils/` - Module-specific utilities

---

## Module Workflows (FRD-Aligned)

### A.1 - Weighing Process UI Flow

**Screen 1: Vehicle Entry & ANPR**
- Station bound selector (A/B)
- Open boom button (sends signal to I/O device)
- ANPR panel showing auto-captured number plate
- Camera thumbnails (front/overview)
- Plate confirm/edit interface
- Scale connection status indicator
- Scale test enforcement check

**Screen 2: Vehicle Details & Axle Config**
- Vehicle registration auto-populated from ANPR or manual entry
- Vehicle search (auto-sync from NTSA if available)
- Axle configuration selector (with visual diagrams)
- Origin/destination dropdowns
- Cargo type selector
- Transporter search/select
- Driver details capture (ID/Passport, License, Names, etc.)
- Road selection
- Act selection (EAC/Traffic) with station default pre-selected

**Screen 3: Weight Capture Panel**

**Static Mode:**
- Per-deck weight display with TruConnect stream
- Live weight indicators per deck
- Stabilize and lock buttons per deck
- Visual feedback when weight is stable
- GVW running total

**WIM Mode:**
- Auto-capture timeline showing weight progression per axle
- Highest stable weight display per axle
- Confidence indicators
- Capture confirmation interface

**Mobile/Axle-by-Axle Mode:**
- Axle-by-axle weight assignment interface
- "Assign Weight" button for each axle as vehicle advances
- Group mapping display (A/B/C/D)
- Running GVW calculation
- Axle weight history

**Decision Panel:**
- Compliance status display
- Tolerance badges (≤200 kg release, configurable)
- Permit status indicator
- Action buttons:
  - **Compliant:** Generate ticket → Open exit boom
  - **Overload ≤200kg:** Auto Special Release → Exit
  - **Overload >200kg:** Send to Yard → Prohibition Order
  - **Permit:** Permit-based Special Release or Prosecution

**Reweigh Loop:**
- Reweigh cycle counter (max 8)
- Redistribution/offload wizard
- Compliance certificate generation upon zero overload

**Offline Handling:**
- Local-first form capture in IndexedDB
- Queue submission when offline
- Sync status indicator
- Conflict resolution UI

---

### A.2 - Tags Process UI Flow

**Tags Screen:**
- Automatic tags list (system-generated)
- Manual tag creation form
- Tag details:
  - Registration number
  - Tag type (automatic/manual)
  - Reason/category
  - Station code
  - Time period
  - Status (open/closed)
- Tag closure interface with reason
- Tag export to external systems (KeNHA)

**Tag Workflow:**
1. View all open tags
2. Create manual tag (with officer justification)
3. Review automatic tags
4. Close tags with reason
5. Export tags to external systems

---

### A.3 - Scale Test UI Flow

**Scale Test Screen:**
- Daily test requirement indicator
- Test weight input
- Test execution interface
- Result display (Pass/Fail)
- Deviation display
- Test history
- Block weighing operations if test fails

---

### B.1 - Case Register / Special Release UI Flow

**Case Register Screen:**
- Case list (pending, processing, finalised)
- Case creation from weighing or yard entry
- Case details form:
  - Vehicle information (pre-filled from weighing)
  - Driver details (editable, audit trail on changes)
  - Owner details
  - Transporter details
  - Prohibition Order reference
  - Location details (road, district, county, station)
  - Officer details

**Case Processing Paths:**

**Special Release Path:**
- Admin authorization request
- Conditional Load Correction Memo generation
- Redistribution scheduling (optional)
- Compliance certificate generation (optional)
- Special release certificate generation

**Pay Now Path:**
- Redirect to Prosecution module
- Charge computation display
- Invoice generation
- Payment processing integration (eCitizen)
- Receipt attachment
- Load Correction Memo generation
- Reweigh scheduling
- Compliance certificate generation

**Court Process Path:**
- Escalate to Court action
- Case Manager interface
- Required subfiles checklist
- NTAC/OB number assignment

**Case Status Management:**
- Case status updates
- Finalisation checklist
- Audit trail display (Subfile J)

---

### B.2 - Prosecution Process UI Flow

**Prosecution Intake:**
- Pre-filled case details from Case Register
- Officer details (synced from logged-in user)
- Driver/Owner/Transporter details verification
- Location details
- Court details
- Prohibition Order reference

**Charge Computation View:**

**EAC Act:**
- GVW overload fee calculation display
- Axle overload fee calculations (per axle)
- Highest fee selection (GVW vs Axle)
- Penalty multiplier application (if applicable)
- Fee table reference/version display
- Tolerance applied indicator
- Legal note display

**Traffic Act:**
- GVW-only fee calculation display
- Axle overloads flagged but not charged
- KSh ↔ USD conversion display (daily forex)
- Fee table reference/version

**Document Generation:**
- EAC Certificate preview/download
- Traffic Act Certificate preview/download
- Invoice generation and preview
- Receipt generation (upon payment)
- Load Correction Memo preview/download
- Compliance Certificate preview/download
- Court escalation documents

**Payment Processing:**
- Invoice display
- eCitizen payment gateway integration
- Payment status tracking
- Receipt attachment interface

**Load Correction & Reweigh:**
- Load Correction Memo generation
- Reweigh scheduling interface
- Compliance verification
- Compliance Certificate generation

**Court Escalation:**
- NTAC number assignment
- OB number entry
- Court case tracking
- Case status updates

---

### Case Management Module UI Flow

**Case Management Dashboard:**
- Case list view (all cases, filtered by status)
- Case detail view with subfiles (A-J)
- Violation history tracking
- Repeat offender highlighting

**Case Subfiles (A-J):**
- **Subfile A:** Initial case details and violation information
- **Subfile B:** Driver details
- **Subfile C:** Owner details
- **Subfile D:** Transporter details
- **Subfile E:** Prohibition Order
- **Subfile F:** Charge Sheets and Invoices
- **Subfile G:** Receipts and Payment Records
- **Subfile H:** Load Correction Memos
- **Subfile I:** Compliance Certificates and Special Releases
- **Subfile J:** Minute sheet & correspondences (audit trail)

**Court Case Tracking:**
- Court case timeline
- Case status updates
- Final ruling entry
- Case outcome tracking

**Yard Integration:**
- Vehicle status in yard
- Yard count display
- Vehicle release tracking

---

## Offline Strategy

### Local-First Forms
- Weighing screens 1 and 2 stored in IndexedDB with status='queued'
- Prosecution intake forms cached locally
- Case register forms stored offline
- All forms validated locally before submission

### Background Sync
- Service worker registers sync tasks
- Queue flushed when connectivity resumes
- Deduplication via idempotency keys (client-generated UUIDs)
- Conflict resolution UI when duplicates detected

### Read-Through Cache
- Last known station config/limits cached in IndexedDB
- Displayed while network request is pending
- Updated when network response received

### Offline Indicators
- Connection status indicator in UI
- Queue size badge showing pending submissions
- Sync in progress/success/failed messages
- Error queue list for officer review

---

## Data & API Integration

### API Client Setup
- **Axios Base Instance:** Configured with interceptors
- **JWT Token Management:** Auto-attach tokens, refresh on expiry
- **Error Normalization:** Consistent error handling across app
- **Retry/Backoff:** Handled by TanStack Query

### React Query Configuration
- Query keys organized by module
- SSR hydration for dashboards
- Offline persistence via `@tanstack/query-persist-client` + Dexie
- Background refresh for real-time data

### WebSocket/SignalR
- Live weight stream connection (if exposed by backend)
- Fallback to polling local TruConnect if WebSocket unavailable
- Connection status management

### TruConnect Client
- Local service client with exponential backoff
- Device health indicator
- Manual resync button
- Cache last valid snapshot
- Assign-per-axle workflow for Mobile mode

---

## Authentication & Authorization

### Centralized SSO Integration

**Authentication Flow:**
- TruLoad frontend integrates with centralized `auth-service` via backend proxy
- Login requests sent to TruLoad backend `/api/v1/auth/login`
- Backend forwards request to centralized auth-service
- JWT tokens received and stored in secure httpOnly cookies
- Tokens included in all subsequent API requests
- Token refresh handled automatically before expiry

**Token Management:**
- Access tokens stored in secure httpOnly cookies (not accessible to JavaScript)
- Refresh tokens stored in secure httpOnly cookies
- Token refresh happens automatically via axios interceptor
- Failed authentication redirects to login page
- Token expiration handled gracefully with user notification

**User Context:**
- User data fetched from TruLoad backend after authentication
- User roles and permissions managed locally but synced from auth-service
- User profile includes: name, email, roles, station assignments
- User context available throughout app via React Context or Zustand store

**Protected Routes:**
- Route-level protection using Next.js middleware
- Role-based route access control
- Redirect unauthorized users to appropriate pages
- Session persistence across page refreshes

---

## Data Analytics Integration

### Apache Superset SDK Integration

**Overview:**
- Apache Superset dashboards embedded in Next.js frontend using Superset SDK
- Dashboards rendered in dedicated Reports & Analytics module
- Natural language query interface for ad-hoc analytics
- Real-time dashboard updates based on query results

**Dashboard Embedding:**
- Use `@superset-ui` packages for embedding Superset dashboards
- Iframe embedding for full dashboard experience
- Custom React components for specific visualizations
- Authentication via backend JWT tokens (SSO)

**SDK Configuration:**
- Superset base URL: `NEXT_PUBLIC_SUPERSET_URL` (environment variable)
- Authentication: JWT tokens passed to Superset via iframe URL parameters
- Guest tokens: Generated by backend for embedded dashboards
- Dashboard IDs: Retrieved from backend API

**Dashboard Bootstrap Flow:**
1. User navigates to Reports & Analytics module
2. Frontend requests available dashboards from backend `/api/v1/analytics/dashboards`
3. Backend returns dashboard list with embedded URLs and guest tokens
4. Frontend renders dashboard using Superset SDK iframe component
5. User interacts with dashboard (filtering, drilling, etc.)
6. Dashboard updates via Superset API

**Natural Language Query Interface:**
- Text input component for natural language queries
- Query examples displayed for user guidance
- Query history for repeat queries
- Auto-complete suggestions based on previous queries
- Query processing handled by backend (ONNX → Vector → Superset)

**Natural Language Query Flow:**
1. User submits natural language query (e.g., "fetch trucks with repeated offenses over the past month. display in table format and a summary donut chart")
2. Frontend sends query to backend `/api/v1/analytics/query`
3. Backend processes query:
   - ONNX Runtime generates vector embedding
   - pgvector similarity search finds relevant data
   - Query intent parsed for data criteria and visualization requirements
   - SQL query constructed and executed
   - Superset chart/dashboard created or updated
4. Backend returns:
   - Superset embedded URL
   - Dashboard ID
   - Query results summary
5. Frontend renders Superset dashboard or custom visualization based on results

**Visualization Components:**
- Custom React components for specific chart types
- Superset SDK components for complex dashboards
- Table view for tabular data
- Chart view for visualizations (bar, line, pie, donut, etc.)
- Export functionality (CSV, Excel, PDF)

**Dashboard Management:**
- Save queries for quick access
- Share dashboards with other users
- Export query results
- Query suggestions based on user role and module

### Natural Language Query Interface

**Query Input Component:**
- Text input for natural language queries
- Examples display for user guidance
- Query history for repeat queries
- Auto-complete suggestions (optional)

**Query Processing Flow:**
1. User submits natural language query
2. Frontend sends query to backend `/api/v1/analytics/query` endpoint
3. Backend processes query (ONNX → Vector → DB)
4. Backend forwards data and visualization requirements to Superset
5. Backend returns Superset dashboard URL with pre-configured filters
6. Frontend renders Superset dashboard or custom visualization

**Query Examples:**
- "fetch trucks with repeated offenses over the past month. display in table format and a summary donut chart"
- "show me overload statistics by station for the last quarter"
- "display GVW violations grouped by vehicle type as a bar chart"

**Visualization Types:**
- Table format
- Bar chart
- Line chart
- Pie/Donut chart
- Heatmap
- Time series

**Query Interface Features:**
- Save queries for quick access
- Share queries with other users
- Export query results (CSV, Excel, PDF)
- Query suggestions based on user role and module

### Reports & Analytics Module Structure

```
app/(modules)/reports/
├── page.tsx                    # Main reports dashboard
├── analytics/
│   ├── page.tsx               # Analytics hub
│   ├── natural-query/         # Natural language query interface
│   └── dashboards/            # Superset dashboard embedding
├── bi/
│   ├── page.tsx               # BI dashboards
│   └── [dashboardId]/
│       └── page.tsx           # Specific dashboard view
└── components/
    ├── QueryInput.tsx         # Natural language query input
    ├── DashboardEmbed.tsx     # Superset dashboard embedder
    └── VisualizationViewer.tsx # Custom visualization viewer
```

For detailed integration instructions, refer to [integration.md](./integration.md).

---

## Visual & UX Design

### Design Principles
- **Accessibility First:** Radix primitives for accessible components, keyboard navigation, low-vision color modes
- **Responsive Design:** Mobile-first approach, works on tablets, desktops, and kiosk mode
- **Performance:** Skeleton loaders, optimistic UI updates, lazy loading
- **Feedback:** Toast notifications, sound feedback for critical actions (boom open/stop prompts)

### UI Components
- **Cards:** Information containers with shadows and hover effects
- **Tables:** Sortable, filterable, paginated data tables
- **Dialogs/Modals:** Accessible modal dialogs for forms and confirmations
- **Forms:** React Hook Form with Zod validation, error messages, field-level feedback
- **Loaders:** Skeleton loaders, spinners, progress indicators
- **Charts:** Custom chart components using Recharts or similar

### Weighing Process UI
- Animated stepper showing current step in weighing process
- Live weight display with large, readable numbers
- Visual feedback for compliance status (green/yellow/red)
- Attention to big screens and kiosk mode for field use
- Touch-friendly buttons for mobile/tablet use

### Color Scheme
- Primary: Compliance green, violation red, warning yellow
- Neutral: Gray scale for text and backgrounds
- Status colors: Success, warning, error, info
- Dark mode support (optional)

---

## PWA & Installability

### App Manifest
- App name, short name, description
- Icons (multiple sizes for different devices)
- Theme color, background color
- Display mode: standalone
- Orientation: portrait/landscape
- Start URL: `/`

### Service Worker
- **Cache Strategy:**
  - Cache-first for shell/assets (HTML, CSS, JS)
  - Network-first for data with cache fallback
  - Stale-while-revalidate for API responses
- **Background Sync:** Queue offline actions for sync when online
- **Push Notifications:** (Optional) For system alerts and updates

### Offline Features
- Install prompt for users
- Badge API for pending sync count
- Offline indicator in UI
- Conflict resolution UI when duplicates detected
- Persistent storage for offline forms

### Installability
- Install prompt on supported browsers
- Standalone app experience when installed
- Offline access to cached content
- App icon on home screen/desktop

---

## Environment & Build

### Environment Variables
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_WS_URL` - WebSocket/SignalR URL
- `NEXT_PUBLIC_SUPERSET_URL` - Apache Superset base URL
- `NEXT_PUBLIC_TRUCONNECT_URL` - Local TruConnect service URL

### Build Configuration
- **Build Args:** Environment variables set in Docker build
- **Runtime Env:** Kubernetes secrets for sensitive configuration
- **Environment Schema:** Documented in `/docs/env-schema.md`

### Health Endpoint
- `/health` - Lightweight API route for readiness/liveness checks
- Compatible with Kubernetes probes

### Docker Build
- Multi-stage Dockerfile for optimized production builds
- Static export option for CDN deployment
- Environment variable injection at build time

---

## Sprint Delivery Plan

For detailed sprint tasks and deliverables, refer to the [sprints](./sprints/) folder.

**Sprint Overview:**
- **Sprint 1:** Setup & Auth (Week 1-2)
- **Sprint 2:** Superset Integration & Natural Query (Week 3-4)
- **Sprint 3:** Weighing Core UI + TruConnect (Week 5-6)
- **Sprint 4:** Prosecution Forms & Charge Views (Week 7-8)
- **Sprint 5:** Case Register & Special Release (Week 9-10)
- **Sprint 6:** Tags & Yard Management (Week 11-12)
- **Sprint 7:** Case Management Module (Week 13-14)
- **Sprint 8:** Inspection UI (Week 15)
- **Sprint 9:** Reports & Basic Analytics (Week 16-17)
- **Sprint 10:** Settings & Technical Admin (Week 18)
- **Sprint 11:** PWA Enhancement & Offline (Week 19-20)
- **Sprint 12:** Polish & E2E Testing (Week 21-22)

Each sprint document in the [sprints](./sprints/) folder contains:
- Detailed task breakdown with checkboxes
- Acceptance criteria
- Dependencies
- Estimated effort

---

## References

- [Integration Guide](./integration.md)
- [Sprint Plans](./sprints/)
- [FRD Document](../../resources/Master%20FRD%20KURAWEIGH.docx.md)
- [Backend Plan](../truload-backend/docs/plan.md)
