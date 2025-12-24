# TruLoad Frontend - Integration Guide

## Overview

This document provides detailed integration information for all external services and systems integrated with the TruLoad frontend, including Apache Superset SDK, backend API authentication (ASP.NET Core Identity), TruConnect microservice, and offline sync capabilities.

---

## Table of Contents

1. [Backend Authentication Integration](#backend-authentication-integration)
2. [Backend API Integration](#backend-api-integration)
3. [Apache Superset SDK Integration](#apache-superset-sdk-integration)
4. [TruConnect Microservice Integration](#truconnect-microservice-integration)
5. [Offline Sync Integration](#offline-sync-integration)
6. [Financial Module Integration](#financial-module-integration)
7. [Case Management Integration](#case-management-integration)

---

## Backend Authentication Integration

### Overview

TruLoad frontend integrates with the TruLoad backend's ASP.NET Core Identity for authentication and user identity management. All authentication is handled directly by the backend's Identity controllers with local JWT token issuance.

### Architecture

**Authentication Flow:**
1. User submits login credentials via frontend form
2. Frontend sends POST request to TruLoad backend `/api/v1/auth/login`
3. Backend validates credentials using ASP.NET Core Identity SignInManager
4. Backend generates JWT token with user/role/permission claims via JwtService
5. Backend returns tokens to frontend
6. Frontend stores tokens in secure httpOnly cookies
7. Subsequent requests include JWT token in Authorization header

**Token Management:**
- Access tokens stored in secure httpOnly cookies (not accessible to JavaScript)
- Refresh tokens stored in secure httpOnly cookies
- Token refresh happens automatically via axios interceptor before expiry
- Failed authentication redirects to login page
- Token expiration handled gracefully with user notification

### Implementation Details

**Configuration:**
- Auth API endpoint: `${NEXT_PUBLIC_API_URL}/api/v1/auth/login`
- Token refresh endpoint: `${NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`
- User profile endpoint: `${NEXT_PUBLIC_API_URL}/api/v1/auth/user`

**Login Implementation:**
```typescript
// Pseudo-code
const login = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  // Backend handles cookie setting via Set-Cookie header
  // Frontend receives success response
  // User context updated from response
};
```

**Token Refresh:**
- Automatic refresh via axios interceptor
- Refresh triggered 5 minutes before token expiry
- Failed refresh redirects to login page
- Refresh token rotation handled by backend

**User Context:**
- User data fetched from backend after authentication
- User roles and permissions managed locally but synced from auth-service
- User profile includes: name, email, roles, station assignments
- User context available throughout app via React Context or Zustand store

**Protected Routes:**
- Route-level protection using Next.js middleware
- Role-based route access control
- Redirect unauthorized users to appropriate pages
- Session persistence across page refreshes

### Error Handling

**Authentication Errors:**
- Invalid credentials: Display error message, allow retry
- Network errors: Display error, allow retry with exponential backoff
- Token expiry: Automatic refresh, fallback to login if refresh fails

**Session Management:**
- Session timeout: Redirect to login after inactivity
- Concurrent logins: Handle multiple device logins gracefully
- Logout: Clear cookies, redirect to login page

---

## Backend API Integration

### Overview

TruLoad frontend integrates with TruLoad backend via RESTful API for all data operations, including weighing, prosecution, case management, and reporting.

### Architecture

**API Client Setup:**
- Axios instance configured with base URL and interceptors
- Request interceptors: Add JWT token to headers
- Response interceptors: Handle token refresh, error normalization
- Retry logic: Exponential backoff for failed requests
- Request/response logging for debugging

**API Endpoints:**
- Base URL: `NEXT_PUBLIC_API_URL` (environment variable)
- API versioning: `/api/v1/...`
- Endpoints organized by module:
  - `/api/v1/auth/*` - Authentication endpoints
  - `/api/v1/weighings/*` - Weighing operations
  - `/api/v1/prosecution/*` - Prosecution operations
  - `/api/v1/cases/*` - Case management
  - `/api/v1/analytics/*` - Analytics and reporting
  - `/api/v1/settings/*` - Settings and configuration

### Implementation Details

**Axios Configuration:**
```typescript
// Pseudo-code
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add JWT token
api.interceptors.request.use((config) => {
  const token = getTokenFromCookie();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await refreshToken();
      return api.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

**React Query Integration:**
- TanStack Query (React Query) for data fetching
- Query keys organized by module and resource
- SSR hydration for initial data load
- Offline persistence via `@tanstack/query-persist-client` + Dexie
- Background refresh for real-time data

**Error Handling:**
- Normalized error responses from backend
- Error boundaries for graceful error handling
- Toast notifications for user-facing errors
- Retry logic for transient failures

**Request/Response Types:**
- TypeScript types generated from backend OpenAPI spec
- Type-safe API calls throughout application
- Runtime validation with Zod schemas

---

## Apache Superset SDK Integration

### Overview

Apache Superset dashboards are embedded in the Next.js frontend using Superset SDK. The integration supports both pre-configured dashboards and dynamic dashboards created from natural language queries.

### Architecture

**SDK Configuration:**
- Superset base URL: `NEXT_PUBLIC_SUPERSET_URL` (environment variable)
- Authentication: JWT tokens passed to Superset via iframe URL parameters
- Guest tokens: Generated by backend for embedded dashboards
- Dashboard IDs: Retrieved from backend API

**Dashboard Embedding:**
- Use `@superset-ui` packages for embedding Superset dashboards
- Iframe embedding for full dashboard experience
- Custom React components for specific visualizations
- Authentication via backend JWT tokens (SSO)

### Implementation Details

**Dashboard Bootstrap Flow:**
1. User navigates to Reports & Analytics module
2. Frontend requests available dashboards from backend `/api/v1/analytics/dashboards`
3. Backend returns dashboard list with:
   - Dashboard ID
   - Dashboard name
   - Embedded URL
   - Guest token (for authentication)
4. Frontend renders dashboard using Superset SDK iframe component
5. User interacts with dashboard (filtering, drilling, etc.)
6. Dashboard updates via Superset API

**Superset SDK Installation:**
```bash
npm install @superset-ui/core @superset-ui/embedded-sdk
```

**Dashboard Component:**
```typescript
// Pseudo-code
import { EmbeddedSuperset } from '@superset-ui/embedded-sdk';

const DashboardView = ({ dashboardId, guestToken }) => {
  return (
    <EmbeddedSuperset
      dashboardId={dashboardId}
      guestToken={guestToken}
      height="800px"
      width="100%"
    />
  );
};
```

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

### Error Handling

**Superset Connection Errors:**
- Dashboard load failures: Display error message, allow retry
- Network errors: Display error, allow retry with exponential backoff
- Authentication errors: Refresh guest token, retry dashboard load

**Query Processing Errors:**
- Invalid queries: Display error message with suggestions
- Processing failures: Display error, allow query modification
- Timeout errors: Display timeout message, allow retry

---

## TruConnect Microservice Integration

### Overview

TruConnect is a Node.js/Electron microservice running on client machines that connects to scale indicators and exposes weight data via HTTP endpoints. The frontend polls TruConnect directly (client-side) for real-time weight data.

### Architecture

**Service Configuration:**
- Service URL: `NEXT_PUBLIC_TRUCONNECT_URL` (typically `http://localhost:3001`)
- Polling interval: 500ms (configurable)
- Timeout: 5 seconds
- Retry policy: Exponential backoff (3 retries)

**Communication:**
- HTTP GET requests to `/api/weights/stream`
- WebSocket fallback (if available)
- Local-only: Service runs on client machine, not accessible from network

### Implementation Details

**Weight Data Format:**
```json
{
  "deck": 1,
  "weight": 7950,
  "stable": true,
  "timestamp": "2025-10-28T12:34:56Z"
}
```

**Weight Polling:**
```typescript
// Pseudo-code
const useWeightStream = (deck: number) => {
  const [weight, setWeight] = useState<WeightData | null>(null);
  
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_TRUCONNECT_URL}/api/weights/stream?deck=${deck}`
        );
        const data = await response.json();
        setWeight(data);
      } catch (error) {
        console.error('Failed to fetch weight:', error);
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, [deck]);
  
  return weight;
};
```

**Integration Points:**
- Frontend polls TruConnect directly (client-side)
- Real-time weight display in weighing UI
- Weight stabilization detection
- Lock weight button when stable
- Finalized weights sent to backend when weighing session completes

**Error Handling:**
- TruConnect unavailability: Show "Scales Off" message
- Connection timeout: Retry with exponential backoff
- Invalid data: Log error, request retry
- Scale disconnection: Show warning, allow retry or abort

**Status Indicators:**
- Green indicator when TruConnect connected and scale active
- Red indicator when TruConnect unavailable or scale disconnected
- Connection status displayed in weighing screen header
- Scale test enforcement check before allowing weighing

---

## Offline Sync Integration

### Overview

TruLoad frontend supports offline operation with automatic cloud sync when connectivity resumes. Offline capabilities include local form capture, queued submissions, and conflict resolution.

### Architecture

**Offline Storage:**
- IndexedDB (via Dexie.js) for persistent storage
- Service Worker for background sync
- Local-first form capture
- Queue-based submission system

**Sync Strategy:**
- Client-generated UUIDs for idempotency
- Parents-first sync (weighing → axle weights → documents)
- Batched commits for efficiency
- Manual sync button fallback

### Implementation Details

**IndexedDB Schema:**
```typescript
// Pseudo-code
interface WeighingRecord {
  clientLocalId: string; // UUID generated by client
  serverId?: string; // Server-assigned ID after sync
  status: 'queued' | 'synced' | 'failed';
  data: WeighingData;
  syncMetadata: {
    submittedAt: Date;
    syncedAt?: Date;
    retryCount: number;
  };
}
```

**Offline Form Capture:**
- Forms stored in IndexedDB with status='queued'
- Validation performed locally before storage
- Local-first approach: Save immediately, sync later
- Visual indicators for unsynced data

**Background Sync:**
- Service Worker registers sync tasks
- Queue flushed when connectivity resumes
- Deduplication via idempotency keys (client-generated UUIDs)
- Conflict resolution UI when duplicates detected

**Sync Status Indicators:**
- Connection status indicator in UI
- Queue size badge showing pending submissions
- Sync in progress/success/failed messages
- Error queue list for officer review

**Conflict Resolution:**
- Duplicate detection via correlation_id
- Manual conflict resolution UI
- Option to overwrite or merge conflicting records
- Audit trail of all conflict resolutions

**Read-Through Cache:**
- Last known station config/limits cached in IndexedDB
- Displayed while network request is pending
- Updated when network response received
- Stale data indicators

### Error Handling

**Sync Failures:**
- Failed syncs remain in queue
- Exponential backoff for retries
- Manual retry button for failed items
- Error queue list with detailed error messages

**Storage Full:**
- Warn users when storage approaching limit
- Refuse new sessions until space freed
- Guidance for clearing old cached data

**Duplicate Submissions:**
- Idempotency prevents duplicate server records
- Show dedupe message to user
- Option to view duplicate record details

---

## Financial Module Integration

### Overview
The Financial Module handles Invoices and Receipts. Critical for this module is **Payment Transaction Integrity**, ensured via `idempotency_key`.

### Implementation Details

**Receipt Generation:**
- **Idempotency:** Client generates a UUID `idempotency_key` for every payment attempt.
- **Backend Logic:** Backend checks if a receipt with the same `idempotency_key` exists.
  - If exists: Returns existing receipt (safe retry).
  - If new: Processes payment and creates receipt.
- **Offline:** Receipts created offline must preserve their `idempotency_key` during sync.

**Endpoints:**
- `POST /api/v1/finance/invoices` - Create Invoice
- `POST /api/v1/finance/receipts` - Record Payment (Requires `idempotency_key`)

---

## Case Management Integration

### Overview
Handles Case Registers, Assignments, and Closure Reviews.

### Implementation Details

**Case Assignment:**
- **Endpoints:**
  - `POST /api/v1/cases/{id}/assign` - Assign/Re-assign Officer
  - `GET /api/v1/cases/{id}/assignment-logs` - View assignment history
- **Payload:** Must include `new_officer_id`, `assignment_type`, and `reason`.

**Closure Review:**
- **Endpoints:**
  - `POST /api/v1/cases/{id}/closure-review/request` - Submit for review
  - `POST /api/v1/cases/{id}/closure-review/decide` - Approve/Reject
- **Checklist:** Frontend must validate `case_closure_checklists` (Subfiles A-J) before request.

---

## Integration Testing

### Test Strategy

**Unit Tests:**
- Mock API responses
- Test error handling and retry logic
- Test data transformation

**Integration Tests:**
- Test auth flow with mock auth-service
- Test Superset dashboard embedding
- Test TruConnect weight polling
- Test offline sync flow

**E2E Tests:**
- Test complete weighing workflow
- Test prosecution workflow
- Test natural language query flow
- Test offline sync scenarios

---

## Monitoring & Observability

### Metrics

**Integration-Specific Metrics:**
- API call latency (p50, p95, p99)
- API call success/failure rates
- TruConnect connection status
- Offline sync queue size
- Superset dashboard load times

**User Experience Metrics:**
- Time to interactive (TTI)
- First contentful paint (FCP)
- Largest contentful paint (LCP)
- Cumulative layout shift (CLS)

### Logging

**Structured Logging:**
- All API calls logged with request/response details
- Error logs include full stack traces and context
- Integration-specific log levels (DEBUG, INFO, WARN, ERROR)
- User action tracking for analytics

---

## Security Considerations

### Authentication & Authorization

- JWT tokens stored in secure httpOnly cookies
- Token refresh handled automatically
- Protected routes with Next.js middleware
- Role-based access control (RBAC)

### Data Privacy

- Sensitive data not logged in production
- PII data masked in error messages
- Secure communication (HTTPS) for all API calls
- Offline data encrypted in IndexedDB

### Rate Limiting

- Client-side rate limiting for API calls
- Respect backend rate limits
- Queue requests if rate limits exceeded
- User notification for rate limit violations

---

## References

- [Apache Superset Embedded SDK Documentation](https://superset.apache.org/docs/installation/embedding-superset)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Dexie.js Documentation](https://dexie.org/)
- [Next.js Authentication Guide](https://nextjs.org/docs/authentication)

