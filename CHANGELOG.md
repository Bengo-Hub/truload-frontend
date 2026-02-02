# Changelog

All notable changes to TruLoad Frontend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial Next.js 15 project setup with App Router
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

### Planned
- Weighing module UI (Static, WIM, Axle modes)
- Real-time weight display from TruConnect
- Prosecution case management interface
- Special Release workflows and approval UI
- Vehicle Inspection forms and checklists
- Reporting dashboards with filters
- Settings and configuration screens (Axle Configurations, System Settings)
- User and Role management UI
- Shift Management interface
- TruConnect client integration with health monitoring
- Offline queue with background sync
- Superset SDK embedding for analytics
- NL query UI for analytics
- Idempotency key generation for offline operations
- Service Worker for background sync

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
- Project initialization with Next.js 15
- Basic folder structure (app/, components/, lib/, stores/)
- Documentation framework (README, Implementation Plan, Integration Guide)
- Build and deployment scripts
- Package.json with core dependencies

