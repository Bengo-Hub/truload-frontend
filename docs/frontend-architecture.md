# TruLoad Frontend Architecture

## Overview
Next.js 15 App Router PWA with offline-first design, RBAC, and modular feature layout. This document maps the directory structure, routing conventions, shared utilities, and module boundaries used across the frontend.

## Core Structure
```
src/
├── app/                          # App Router (no pages/_app/_document)
│   ├── (auth)/                   # Auth group (login, logout)
│   ├── (dashboard)/              # Protected dashboard routes
│   ├── users/                    # Users & Roles (top-level)
│   ├── shifts/                   # Shift Management (top-level)
│   ├── setup/                    # Configurations-only scope
│   │   ├── axle-configurations/  # Axle configurations CRUD
│   │   └── settings/             # System Settings tabs
│   ├── api/                      # Health and simple server routes
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing/dashboard
├── components/
│   ├── layout/                   # App shell (sidebar, header)
│   ├── ui/                       # Shadcn components
│   ├── forms/                    # Form primitives (RHF + Zod)
│   ├── charts/                   # Charts & visuals
│   └── auth/                     # Auth widgets (dropdown, guards)
├── lib/
│   ├── api/                      # Axios client + modules (setup, users, shifts)
│   ├── auth/                     # Token helpers, types, auth API
│   ├── offline/                  # Dexie queue & sync helpers
│   ├── truconnect/               # TruConnect client (polling/signalR)
│   └── utils/                    # Common utilities
├── stores/                       # Zustand stores
├── hooks/                        # Custom hooks (auth, permissions)
└── public/                       # Static assets
```

## Routing Conventions
- App Router only; do not add `_document` or `_app`.
- Grouped segments for `(auth)` and `(dashboard)` to separate concerns.
- Top-level modules: `users/` and `shifts/` live outside `setup/`.
- `setup/` is configurations-only:
  - `axle-configurations/` for axle CRUD
  - `settings/` tabbed UI for Security (Password Policy), Backup & Restore, and API Settings (key–value per service)

## Navigation Rules
- Main Menu: Users & Roles, Shift Management, core modules (weighing, prosecution, reports).
- Setup: Only module-specific configurations and system settings.
- Permission-based visibility via `useHasPermission` in UI and route guards.

## Shared Patterns
- Auth: Axios interceptors attach `Authorization` from httpOnly cookie via backend proxy; automatic refresh; 401 retry queue.
- RBAC: Permission claims embedded in JWT; `useHasPermission` hook gates components and actions.
- Data: TanStack Query for fetching; optimistic updates where helpful.
- Offline: Client-generated idempotency keys; Dexie-backed queue; background sync.
- UI: Tailwind + Shadcn; consistent forms via RHF + Zod.

## Module Notes
- `users/`: List, create/edit, role assignment; guarded by `users.manage` permissions.
- `shifts/`: CRUD + schedule editing; guarded by `shifts.manage` permissions.
- `setup/axle-configurations/`: AxleCode/Name/Number, permissible GVW/axle limits; CRUD with confirm dialogs.
- `setup/settings/`:
  - Security: Password Policy get/update.
  - Backup & Restore: Trigger backup, restore uploads.
  - API Settings: Key–value editor per service (notifications, NTSA, eCitizen, KeNHA).

## Data & Integrations
- Base URL: `NEXT_PUBLIC_API_URL`; versioned endpoints `/api/v1/*`.
- Superset: Guest tokens minted by backend; use `@superset-ui/embedded-sdk` for dashboards (planned under `reports/`).
- TruConnect: Polling or SignalR for live weights (future modules under `(modules)/weighing`).

## Guarding & Access
- Middleware enforces auth on protected routes.
- Component guards for fine-grained RBAC.
- Avoid rendering actions without permission even if hidden in nav.

## Conventions Checklist
- No direct external SSO; backend issues local JWT.
- Store only foreign IDs for cross-service data.
- Use Kubernetes DNS for service discovery in backend calls.
- Keep Setup limited to configurations; move operational modules to main nav.

## Future Modules (Placeholders)
- `(modules)/weighing/`, `(modules)/prosecution/`, `(modules)/inspection/`, `(modules)/reports/` following the same structure: `page.tsx`, `components/`, `hooks/`, `types/`, `utils/`.
