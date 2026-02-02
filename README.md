# TruLoad Frontend

**Intelligent Weighing and Enforcement Solution - PWA Client**

Modern, offline-first Progressive Web App for field officers and back-office staff. Built with Next.js 16, provides real-time weight capture, prosecution management, and comprehensive reporting.

## 📚 Documentation

### Implementation & Architecture
- **[Implementation Plan](docs/plan.md)** - Comprehensive technical specification, UI/UX flows, offline strategy, and sprint breakdown
- **[Integration Guide](docs/integration.md)** - Backend API integration, Superset SDK, TruConnect, offline sync, and external service integrations
- **[Sprint Documentation](docs/sprints/)** - Detailed sprint plans and implementation guides

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- pnpm 8+ (recommended) or npm
- Docker (for local backend services)

### Installation

```bash
# Install pnpm globally (if not installed)
npm install -g pnpm

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API URLs
```

### Development

```bash
# Run development server
pnpm dev

# Open browser to http://localhost:3000
```

### Building for Production

```bash
# Build Next.js app (standalone output)
pnpm build

# Start production server locally
pnpm start
```

### Using Docker

```bash
# Build Docker image
docker build -t truload-frontend:dev \
  --build-arg NEXT_PUBLIC_API_URL=https://api.truload.example.com \
  --build-arg NEXT_PUBLIC_WS_URL=wss://api.truload.example.com/ws \
  .

# Run container
docker run -p 3000:3000 truload-frontend:dev
```

## 🏗️ Project Structure

```
truload-frontend/
├── app/                      # Next.js 16 App Router
│   ├── (auth)/              # Auth routes group
│   ├── (dashboard)/         # Protected dashboard routes
│   ├── (modules)/           # Feature modules
│   │   ├── weighing/
│   │   ├── prosecution/
│   │   ├── release/
│   │   ├── inspection/
│   │   ├── reports/
│   │   └── settings/
│   ├── api/                 # API routes (health check, etc.)
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                  # Shadcn UI components
│   ├── charts/              # Chart components
│   ├── forms/               # Form components
│   └── layout/              # Layout components
├── lib/
│   ├── api/                 # API client (axios)
│   ├── auth/                # Authentication utilities
│   ├── offline/             # Offline sync engine
│   ├── truconnect/          # TruConnect client
│   └── utils/               # Common utilities
├── stores/                  # Zustand stores
├── hooks/                   # Custom React hooks
├── public/                  # Static assets
├── docs/                    # Documentation
├── .github/workflows/       # CI/CD pipelines
├── KubeSecrets/             # Kubernetes secrets template
├── Dockerfile               # Container definition
└── build.sh                 # Build & deploy script
```

## 🎨 Features

### 🎯 Core Modules

1. **Weighing Module**
   - Static weighing (multi-deck scales)
   - WIM (Weigh-In-Motion) auto-capture
   - Mobile/Axle-by-axle weighing
   - Real-time TruConnect integration
   - Offline capture with background sync
   - ANPR camera integration

2. **Prosecution Management**
   - Case intake and party details
   - EAC/Traffic Act charge computation
   - Invoice and receipt tracking
   - Document generation (PDF)
   - Court escalation workflow

3. **Special Release**
   - Auto-tolerance releases
   - Permit-based releases
   - Manual release authorization
   - Yard management

4. **Vehicle Inspection**
   - Dimensional compliance checks
   - Wide load permit validation
   - Photo documentation

5. **Reporting & Analytics**
   - Weighbridge registers
   - Overload statistics
   - Shift reports
   - Export to PDF/Excel

6. **Settings & Configuration**
   - Camera management
   - Station configuration
   - I/O device settings
   - User and role management

### ✨ Key Features

- **🌐 PWA (Progressive Web App):** Installable, works offline
- **📱 Responsive Design:** Mobile, tablet, desktop, kiosk mode
- **🎨 Modern UI:** Tailwind CSS + Shadcn UI components
- **⚡ Performance:** React Server Components, optimistic updates
- **🔌 Offline-First:** IndexedDB queue, background sync
- **🔒 Secure:** JWT authentication, RBAC, audit trails
- **♿ Accessible:** WCAG 2.1 AA compliant, keyboard navigation

## 🔧 Configuration

### Environment Variables

Create `.env.local` file:

```env
# API Configuration (build-time for Next.js)
NEXT_PUBLIC_API_URL=https://api.truload.example.com
NEXT_PUBLIC_WS_URL=wss://api.truload.example.com/ws

# Optional: Runtime server config
NODE_ENV=development
PORT=3000
```

## 🧪 Testing

```bash
# Run unit tests
pnpm test

# Run E2E tests (Playwright)
pnpm test:e2e

# Run with coverage
pnpm test:coverage
```

## 🚢 Deployment

Deployment is automated via GitHub Actions and ArgoCD:

1. Push to `main` branch triggers `.github/workflows/deploy.yml`
2. `build.sh` runs security scan, builds Docker image with build args
3. Pushes to container registry
4. Updates `devops-k8s/apps/truload-frontend/values.yaml`
5. ArgoCD auto-syncs to Kubernetes cluster

Manual deployment:

```bash
./build.sh
```

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines, coding standards, and PR process.

## 📄 License

See [LICENSE](LICENSE) for license information.

## 🔗 Related Projects

- [TruLoad Backend](../truload-backend) - .NET 8 API backend
- [Centralized DevOps](https://github.com/Bengo-Hub/devops-k8s) - Shared K8s infrastructure

## 📞 Support

For issues or questions, please open an issue in the GitHub repository.

