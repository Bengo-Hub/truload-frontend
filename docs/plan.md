## TruLoad Frontend Plan (Next.js 15, TanStack Query, Zustand, Tailwind, Shadcn)

### 1. Overview
PWA-first client for field officers and back-office. Modern, animated, responsive UI for weighing, prosecution, releases, inspections, and reporting. Integrates with local TruConnect microservice for live weights and supports robust offline capture with background sync.

### 2. Tech Stack
- Next.js 15 (App Router, RSC, Server Actions where useful)
- TypeScript, ESLint, Prettier
- TanStack Query (API caching, retries, background refresh)
- Zustand (UI/session state; minimal global state)
- Tailwind CSS + Shadcn UI (radix primitives) + class-variance-authority
- React Hook Form + Zod (schema validation)
- Framer Motion (micro-interactions), Lucide icons
- Workbox/next-pwa (offline, background sync)
- Dexie (IndexedDB) for offline queue/storage

### 3. Architecture & Conventions
- Feature folders by module: `app/(modules)/weighing`, `prosecution`, `release`, `inspection`, `settings`, `security`, `user-management`, `reports`.
- `lib/api` (axios instance with interceptors, rate limit headers), `lib/auth` (JWT/session), `lib/offline` (sync engine), `lib/truconnect` (local service client), `lib/i18n`.
- Reusable UI: `components/ui/*` (cards, tables, dialogs, forms, loaders), `components/charts/*`.
- Accessibility first (radix), keyboard nav, low-vision color modes.

### 4. Offline Strategy
- Local-first forms for weighing (screens 1/2), prosecution intake; queue submissions in Dexie.
- Background Sync: register sync task to flush queue when connectivity resumes; dedupe via idempotency keys.
- Read-through cache: show last known weigh station config/limits from IndexedDB while network pending.

### 5. Modules & Screens (priority order)
1) User & Shift Management
   - Login (2FA optional), Role-based routing, Shift selector (A/B/Off/Mobile), profile.

2) Weighing (Core)
   - Screen 1: Station bound A/B, open boom, ANPR panel, camera thumbnails, plate confirm/edit; scale test enforcement.
   - Screen 2: Vehicle details (auto or new), axle configuration detect/override, origin/destination, transporter, driver.
   - Live weight panel:
     - Static: per-deck capture via TruConnect stream; stabilize and lock per deck.
     - WIM: auto-capture highest stable per axle while moving; show capture timeline and confidence.
     - Axle-by-Axle (Mobile): operator clicks Assign Weight for each axle as vehicle advances; show group A/B/C/D mapping and running GVW.
     - GVW auto-calculated; show tolerance badges (≤200 kg release, configurable) and permit status.
   - Decision panel: compliant (generate ticket), special release (≤200kg or permit), send to yard (redistribution/GVW overload), permit checks.
   - Reweigh loop up to 8 cycles, redistrib/offload wizard.

3) Prosecution
   - Intake: driver/owner/location/court/prohibition details (prefilled from weighing; editable, audit trail on changes).
   - EAC charge view: compute GVW band and axle band(s), pick higher; show fee table reference/version, tolerance applied, and legal note.
   - Traffic charge view: GVW-only bands; show KSh↔USD conversion (daily forex), axle overloads flagged but not charged.
   - Documents: EAC certificate, Traffic certificate, invoice, receipt, load correction memo, compliance certificate; escalate to court.

4) Special Release
   - Yard list actions; manual releases with reasons; permit-linked releases; conditional releases post-redistribution.

5) Inspection
   - Dimension capture (height/width/length/projections) with act rules; permit validation; link to ticket/case.

6) Settings & Technical
   - Cameras (position/IP/path/type), Station defaults (route, domain/IP), I/O settings (PLC addresses, deckEntry/deckExit), prosecution defaults.

7) Reporting
   - Weighbridge register, overload & reweigh, charged, shift reports, scale tests, transporter statements.
   - Yard list & tags audit; permit-based releases vs prosecutions; per-act analytics.

### 6. Data & API
- Axios base with interceptors (JWT attach/refresh, error normalization, retry/backoff with TanStack Query).
- React Query keys per module; SSR hydration for dashboards; offline persistence via `@tanstack/query-persist-client` + Dexie.
- WebSocket/SignalR client for live weight stream if exposed; else poll local TruConnect.
 - TruConnect client: exponential backoff, device health indicator, manual resync; cache last valid snapshot; assign-per-axle workflow for Mobile mode.

### 7. Visual & UX
- Responsive grid; skeleton loaders; optimistic UI on queue; toast/sound feedback for boom open/stop prompts.
- Animated stepper for weighing process; attention to big screens and kiosk mode.

### 8. PWA & Installability
- App manifest, service worker (cache-first for shell, network-first for data with cache fallback), background sync.
- Badge/API for pending sync count; conflict resolution UI when duplicates detected.
 - Offline-first forms for prosecution intake and reweigh cycles; reconcile on reconnect with idempotency keys.
 - Persist tolerance and act selection locally to ensure consistent decisions across reconnects.

### 9. Environment & Build
- Build args: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL` (in Docker build); runtime env from K8s secret for standalone server.
- `.env` schema doc in /docs; secrets never hard-coded.
 - Health endpoint `/health` exposed via lightweight API route for readiness/liveness compatibility with chart.

### 10. Sprint Plan (mirrors backend)
1) Setup & Auth shell, layout, theme, routing, RBAC guards
2) Weighing core UI + TruConnect client + offline capture
3) Prosecution forms, charge breakdown views, documents UX
4) Special Release flows, Yard actions
5) Inspection UI
6) Reports & dashboards
7) Settings & Technical admin screens
8) Polish: accessibility, performance, E2E tests


