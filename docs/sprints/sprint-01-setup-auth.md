# Sprint 1: Setup & Authentication

**Duration:** Weeks 1-2  
**Module:** Setup & Authentication  
**Status:** Implementation Complete - Testing Pending  
**Last Updated:** December 10, 2025  
**Progress:** ~85% (Core features complete, tests pending)

---

## Overview

Set up Next.js 15 project structure, configure authentication integration with TruLoad backend (ASP.NET Core Identity), implement login/logout flows, and create protected route infrastructure.

---

## Objectives

- Set up Next.js 15 project with TypeScript
- Configure authentication integration with TruLoad backend JWT authentication
- Implement login/logout flows
- Create protected route infrastructure
- Set up state management with Zustand
- Configure API client with axios and React Query
- Implement token management and refresh
- Create user context and profile management

---

## Tasks

### Project Setup

- [x] Initialize Next.js 15 project with TypeScript
- [x] Configure ESLint and Prettier
- [x] Set up folder structure (app router, components, lib, stores)
- [x] Install and configure Tailwind CSS
- [x] Install and configure Shadcn UI components
- [x] Set up environment variables schema
- [x] Configure path aliases (@/components, @/lib, etc.)
- [x] Set up Docker configuration for development
- [x] Configure health check endpoint

### Authentication Integration

- [x] Create axios instance with base configuration
- [x] Configure request interceptor for JWT token attachment
- [x] Configure response interceptor for token refresh
- [x] Implement login API call to backend (`POST /api/v1/auth/login`)
- [x] Implement token refresh API call (`POST /api/v1/auth/refresh`)
- [x] Implement logout functionality
- [x] Create authentication service/hook
- [x] Handle authentication errors gracefully
- [x] Implement session timeout handling

### Token Management

- [x] Implement secure cookie storage for tokens
- [x] Create token utilities (get, set, remove)
- [x] Implement token refresh before expiry
- [x] Handle token expiration gracefully
- [x] Implement token cleanup on logout
- [x] Create token refresh interceptor

### User Context & Profile

- [x] Create user context provider
- [x] Implement user profile fetch from backend
- [x] Create user profile hook (useUser)
- [x] Store user data in Zustand store
- [ ] Implement user profile update functionality
- [x] Handle user profile from backend Identity

### Protected Routes

- [x] Create Next.js middleware for route protection
- [x] Implement authentication check in middleware
- [x] Create protected route wrapper component
- [x] Implement role-based route access control
- [x] Create redirect logic for unauthorized users
- [x] Handle session persistence across page refreshes

### UI Components

- [x] Create login page with form
- [x] Implement login form validation (React Hook Form + Zod)
- [x] Create loading states for authentication
- [x] Create error display components
- [x] Create user profile dropdown component
- [x] Create logout button component
- [x] Implement responsive design for login page (Professional weighbridge theme)

### State Management

- [x] Set up Zustand store for authentication state
- [x] Create auth store with user, token, and status
- [x] Implement auth actions (login, logout, refresh)
- [x] Create user store for profile data
- [x] Implement state persistence (optional)

### API Client Configuration

- [x] Create axios instance with base URL
- [x] Configure request/response interceptors
- [x] Set up error handling and normalization
- [ ] Configure retry logic with exponential backoff
- [x] Set up React Query configuration
- [ ] Create query key factory for API calls
- [ ] Configure offline persistence with Dexie (optional for Sprint 1)

### Error Handling

- [x] Create error boundary component
- [x] Implement error normalization from API responses
- [x] Create toast notification system
- [x] Handle authentication errors specifically
- [x] Create error display components
- [ ] Implement retry logic for failed requests

### Testing

- [ ] Write unit tests for authentication service
- [ ] Write unit tests for token management utilities
- [ ] Write unit tests for protected route middleware
- [ ] Write integration tests for login/logout flows
- [ ] Write E2E tests for authentication flow
- [ ] Set up test utilities and mocks

---

## Acceptance Criteria

- [x] Login/logout flows working end-to-end
- [x] Token management and refresh working correctly
- [x] Protected routes redirecting unauthorized users
- [x] User context available throughout application
- [x] Authentication errors handled gracefully
- [x] Session persists across page refreshes
- [x] Tokens stored in httpOnly cookies only (no localStorage/sessionStorage usage)
- [x] All UI components responsive and accessible
- [ ] All tests passing (unit, integration, E2E)
- [ ] Code review completed and approved

---

## Dependencies

- TruLoad backend authentication endpoints available
- TruLoad backend with ASP.NET Core Identity

---

## Estimated Effort

**Total:** 60-80 hours

- Project Setup: 8-10 hours
- Authentication Integration: 16-20 hours
- Token Management: 8-10 hours
- User Context & Profile: 8-10 hours
- Protected Routes: 8-10 hours
- UI Components: 8-10 hours
- State Management: 4-6 hours
- API Client Configuration: 4-6 hours
- Testing: 8-10 hours

---

## Risks & Mitigation

**Risk:** Token refresh race conditions  
**Mitigation:** Implement token refresh queue, prevent concurrent refresh requests

**Risk:** Session timeout not handled gracefully  
**Mitigation:** Implement automatic token refresh before expiry, show user notification

**Risk:** Protected routes bypassed  
**Mitigation:** Implement both middleware and component-level protection, test thoroughly

---

## Notes

- Authentication requests handled directly by TruLoad backend Identity controllers
- Tokens stored in secure httpOnly cookies (not accessible to JavaScript)
- User profile fetched from backend after authentication
- Protected routes use Next.js middleware for server-side protection

---

## Deliverables

1. Working Next.js 15 project setup
2. Authentication integration with backend Identity JWT service
3. Login/logout flows implemented
4. Protected route infrastructure
5. User context and profile management
6. Token management and refresh
7. API client configuration with axios and React Query
8. UI components for authentication
9. Unit, integration, and E2E tests

