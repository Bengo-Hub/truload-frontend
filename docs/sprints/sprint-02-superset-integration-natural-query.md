# Sprint 2: Superset Integration & Natural Query
**Duration:** Weeks 3-4
**Module:** Reports & Analytics
**Status:** Planning

## Goal
Integrate the frontend with the centralized DA platform using Superset SDK and build the Natural Language Query interface.

## Deliverables
- [ ] **Superset Embedding:** Secure embedding of dashboards using `@superset-ui/embedded-sdk`.
- [ ] **Natural Query UI:** Chat-like interface for submitting analytics queries.
- [ ] **Dashboard Hub:** A centralized page to view, search, and manage dashboards.
- [ ] **Visualization Components:** Custom React components for rendering quick stats returned by the backend.

## Tasks

### 1. Superset SDK Integration
- [ ] Install `@superset-ui/embedded-sdk`. <!-- id: 1 -->
- [ ] Create `SupersetDashboard` component that accepts `guestToken` and `dashboardId`. <!-- id: 2 -->
- [ ] Implement `useSupersetAuth` hook to fetch guest tokens from backend. <!-- id: 3 -->
- [ ] Handle iframe resizing and loading states. <!-- id: 4 -->

### 2. Natural Language Query Interface
- [ ] Create `QueryInput` component with auto-complete/suggestions. <!-- id: 5 -->
- [ ] Build `QueryResults` view to handle different response types (Dashboard, Chart, Table, Text). <!-- id: 6 -->
- [ ] Implement "Suggested Queries" based on user role (e.g., "Show my station's performance"). <!-- id: 7 -->

### 3. Reports Module Pages
- [ ] Build `app/(modules)/reports/page.tsx` (Dashboard Hub). <!-- id: 8 -->
- [ ] Build `app/(modules)/reports/analytics/page.tsx` (Ad-hoc Analysis). <!-- id: 9 -->
- [ ] Implement "Save Query" and "Pin Dashboard" functionality (local state or backend synced). <!-- id: 10 -->

## Dependencies
- Backend Sprint 11 (DA API).
- Superset instance running.

## Risks
- **CORS/Auth:** Embedding iframes often face cookie/CORS issues. *Mitigation: Ensure proper domain configuration and SameSite cookie policies.*
