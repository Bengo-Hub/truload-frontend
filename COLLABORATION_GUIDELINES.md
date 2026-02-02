# TruLoad Frontend - Collaboration Guidelines

This document outlines conventions and best practices for collaborating on the TruLoad Frontend project.

## 📝 Naming Conventions

### TypeScript/React Conventions

#### Components
```typescript
// React Components: PascalCase
export function WeighingForm() { }
export function VehicleSearchDialog() { }
export const ProsecutionCaseCard = () => { }

// Component files: PascalCase with .tsx extension
WeighingForm.tsx
VehicleSearchDialog.tsx
ProsecutionCaseCard.tsx

// Page components (App Router): lowercase with .tsx
page.tsx
layout.tsx
loading.tsx
error.tsx
```

#### Functions and Variables
```typescript
// Functions: camelCase, verb-based
async function fetchWeighingData(id: string) { }
const handleSubmit = () => { }
const calculateTotalWeight = (axles: Axle[]) => { }

// Variables: camelCase, noun-based
const weighingData = await fetch('/api/weighings');
const isLoading = false;
const totalWeight = axles.reduce((sum, axle) => sum + axle.weight, 0);

// Booleans: is/has/can prefix
const isAuthenticated = true;
const hasPermission = checkPermission('weighing.create');
const canEdit = user.role === 'admin';
```

#### Types and Interfaces
```typescript
// Interfaces: PascalCase with 'I' prefix (optional, prefer type)
interface IWeighingTransaction {
  id: string;
  vehicleRegistration: string;
}

// Types: PascalCase
type WeighingMode = 'static' | 'wim' | 'axle';
type ComplianceStatus = 'compliant' | 'overloaded' | 'permit';

// Type aliases for complex types
type WeighingResponse = {
  data: WeighingTransaction;
  meta: ResponseMeta;
};

// Props types: {ComponentName}Props
type WeighingFormProps = {
  onSubmit: (data: WeighingFormData) => void;
  initialData?: WeighingFormData;
};
```

#### Constants and Enums
```typescript
// Constants: UPPER_CASE
const MAX_REWEIGH_CYCLES = 8;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const DEFAULT_PAGE_SIZE = 20;

// Enums: PascalCase for both type and members
enum WeighingMode {
  Static = 'static',
  WeighInMotion = 'wim',
  Axle = 'axle',
}

enum PermitStatus {
  Active = 'active',
  Expired = 'expired',
  Suspended = 'suspended',
}
```

#### Hooks
```typescript
// Custom hooks: camelCase with 'use' prefix
export function useWeighingData(id: string) { }
export function usePermissions(userId: string) { }
export function useOfflineQueue() { }
```

#### API and Services
```typescript
// API functions: camelCase, action-based
export async function getWeighing(id: string) { }
export async function createProsecutionCase(data: CreateCaseData) { }
export async function updateVehicle(id: string, data: UpdateVehicleData) { }
```

### File and Folder Conventions

```
app/
  (dashboard)/              # Route groups: lowercase with parentheses
    weighing/              # Routes: lowercase, plural when appropriate
      [id]/                # Dynamic routes: [param]
        page.tsx
      new/
        page.tsx
      page.tsx
    prosecution/
      page.tsx
    layout.tsx

components/
  ui/                      # UI primitives: lowercase
    button.tsx
    dialog.tsx
    input.tsx
  forms/                   # Feature components: PascalCase
    WeighingForm.tsx
    VehicleSearchForm.tsx
  charts/
    WeightDistributionChart.tsx

lib/
  api/                     # Utility folders: lowercase
    weighing-api.ts        # Files: kebab-case
    prosecution-api.ts
  utils/
    format-date.ts
    calculate-compliance.ts

stores/
  auth-store.ts           # Zustand stores: kebab-case with -store suffix
  weighing-store.ts

hooks/
  use-weighing-data.ts    # Custom hooks: kebab-case with use- prefix
  use-offline-sync.ts

types/
  weighing.ts             # Type definition files: kebab-case
  prosecution.ts
  common.ts
```

### CSS/Tailwind Conventions

```tsx
// Class ordering: layout -> spacing -> sizing -> styling -> effects
<div className="flex items-center justify-between p-4 w-full bg-white rounded-lg shadow-sm hover:shadow-md">
  {/* Content */}
</div>

// Component-specific styles in separate files
// weighing-form.module.css (CSS Modules if needed)
// Prefer Tailwind utilities over custom CSS
```

## 🌿 Branch Naming Conventions

### Format
```
<type>/<scope>-<short-description>
```

### Types
- `feature/` - New features or UI components
- `fix/` - Bug fixes
- `hotfix/` - Critical production fixes
- `refactor/` - Code refactoring
- `style/` - UI/styling changes
- `docs/` - Documentation changes
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks

### Examples
```bash
feature/weighing-wim-ui
feature/prosecution-case-form
fix/offline-sync-queue
fix/vehicle-search-validation
hotfix/auth-token-refresh
refactor/api-client-structure
style/dashboard-layout-responsive
docs/update-integration-guide
test/add-weighing-form-tests
chore/upgrade-nextjs-15
```

## 💬 Commit Message Conventions

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type
- `feat` - New feature
- `fix` - Bug fix
- `style` - UI/styling changes
- `refactor` - Code refactoring
- `perf` - Performance improvement
- `test` - Adding/updating tests
- `docs` - Documentation changes
- `chore` - Build/tooling changes
- `ci` - CI/CD changes

### Scope
Module or feature area:
- `weighing` - Weighing module
- `prosecution` - Prosecution module
- `vehicle` - Vehicle management
- `auth` - Authentication
- `offline` - Offline functionality
- `analytics` - Analytics/reporting
- `settings` - Settings screens
- `ui` - UI components
- `api` - API client

### Examples

#### Feature Addition
```
feat(weighing): add WIM mode UI

Implemented Weigh-In-Motion interface with real-time weight
display from TruConnect and auto-stabilization indicators.

- Added WIM mode selection in weighing form
- Implemented real-time weight visualization
- Added weight stabilization status indicators

Closes #42
```

#### Bug Fix
```
fix(offline): resolve sync queue duplication

Fixed issue where offline mutations were duplicated in
IndexedDB queue causing multiple submissions on sync.

Fixes #87
```

#### Styling Change
```
style(dashboard): improve mobile responsiveness

Updated dashboard layout to be fully responsive on mobile
devices with collapsible sidebar and adjusted card layouts.
```

#### Performance Improvement
```
perf(weighing): optimize weighing list rendering

Implemented virtualization for weighing transaction list
to handle large datasets efficiently.

- Added react-window for virtual scrolling
- Reduced initial render time by 60%
```

## 🔀 Pull Request Guidelines

### PR Title Format
```
feat(weighing): add WIM mode UI
fix(offline): resolve sync queue duplication
```

### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Feature
- [ ] Bug fix
- [ ] Hotfix
- [ ] Refactoring
- [ ] Styling
- [ ] Documentation
- [ ] Test

## Related Issues
Closes #123
Related to #456

## Changes Made
- Change 1
- Change 2
- Change 3

## Screenshots/Videos
<!-- Add screenshots for UI changes -->

## Testing
- [ ] Unit tests added/updated
- [ ] Component tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing performed
- [ ] All tests passing
- [ ] Tested offline functionality (if applicable)

## Accessibility
- [ ] Keyboard navigation tested
- [ ] Screen reader tested
- [ ] Color contrast checked
- [ ] ARIA labels added where needed

## Performance
- [ ] No console errors/warnings
- [ ] Lighthouse score checked
- [ ] Bundle size impact assessed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests added/updated
- [ ] No secrets committed
- [ ] TypeScript types properly defined
```

## 🎨 Component Guidelines

### Component Structure
```typescript
// 1. Imports: external -> internal -> types
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { getWeighing } from '@/lib/api/weighing-api';
import type { Weighing } from '@/types/weighing';

// 2. Type definitions
type WeighingFormProps = {
  weighingId?: string;
  onSubmit: (data: WeighingFormData) => void;
  onCancel?: () => void;
};

// 3. Component
export function WeighingForm({ weighingId, onSubmit, onCancel }: WeighingFormProps) {
  // 3.1. Hooks (same order every time)
  const [formData, setFormData] = useState<WeighingFormData>();
  const { data: weighing, isLoading } = useQuery({
    queryKey: ['weighing', weighingId],
    queryFn: () => getWeighing(weighingId!),
    enabled: !!weighingId,
  });

  // 3.2. Effects
  useEffect(() => {
    if (weighing) {
      setFormData(transformToFormData(weighing));
    }
  }, [weighing]);

  // 3.3. Event handlers
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      onSubmit(formData);
    }
  };

  // 3.4. Render helpers (if needed)
  const renderAxleInputs = () => {
    // Complex rendering logic
  };

  // 3.5. Early returns
  if (isLoading) return <div>Loading...</div>;
  if (!weighing && weighingId) return <div>Not found</div>;

  // 3.6. Main render
  return (
    <form onSubmit={handleSubmit}>
      {/* Form content */}
    </form>
  );
}
```

### Server vs Client Components (Next.js 15)

```typescript
// Server Component (default in App Router)
// No 'use client' directive
// Can async fetch data
// Cannot use hooks or event handlers
export default async function WeighingPage({ params }: { params: { id: string } }) {
  const weighing = await getWeighing(params.id);
  
  return (
    <div>
      <h1>{weighing.vehicleRegistration}</h1>
      <WeighingDetails data={weighing} /> {/* Client component */}
    </div>
  );
}

// Client Component
// Must have 'use client' directive
// Can use hooks and event handlers
'use client';

import { useState } from 'react';

export function WeighingDetails({ data }: { data: Weighing }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div onClick={() => setExpanded(!expanded)}>
      {/* Interactive content */}
    </div>
  );
}
```

## 🎯 State Management Guidelines

### TanStack Query (Server State)
```typescript
// Use for API data fetching and caching
export function useWeighingData(id: string) {
  return useQuery({
    queryKey: ['weighing', id],
    queryFn: () => getWeighing(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Mutations
export function useCreateWeighing() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateWeighingData) => createWeighing(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weighings'] });
    },
  });
}
```

### Zustand (Global Client State)
```typescript
// stores/auth-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AuthState = {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      clearAuth: () => set({ user: null, token: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
```

### Local Component State
```typescript
// Use useState for component-specific state
function WeighingForm() {
  const [mode, setMode] = useState<WeighingMode>('static');
  const [errors, setErrors] = useState<FormErrors>({});
  
  // Component logic
}
```

## 📱 Offline-First Guidelines

### IndexedDB Queue (Dexie.js)
```typescript
// lib/offline/queue.ts
import Dexie from 'dexie';

export class OfflineQueueDB extends Dexie {
  mutations!: Table<MutationQueueItem>;

  constructor() {
    super('TruLoadOfflineQueue');
    this.version(1).stores({
      mutations: '++id, type, timestamp, synced, idempotencyKey',
    });
  }
}

// Add to queue
export async function queueMutation(
  type: string,
  data: any,
  idempotencyKey: string
) {
  const db = new OfflineQueueDB();
  await db.mutations.add({
    type,
    data,
    timestamp: Date.now(),
    synced: false,
    idempotencyKey,
  });
}

// Sync queue
export async function syncQueue() {
  const db = new OfflineQueueDB();
  const pending = await db.mutations
    .where('synced')
    .equals(false)
    .toArray();

  for (const item of pending) {
    try {
      await submitMutation(item);
      await db.mutations.update(item.id!, { synced: true });
    } catch (error) {
      // Handle error
    }
  }
}
```

### Idempotency Keys
```typescript
// Always generate idempotency keys for offline operations
import { v4 as uuidv4 } from 'uuid';

function createWeighing(data: CreateWeighingData) {
  const idempotencyKey = uuidv4();
  
  if (navigator.onLine) {
    return submitWeighing(data, idempotencyKey);
  } else {
    return queueMutation('createWeighing', data, idempotencyKey);
  }
}
```

## 🔒 Security Guidelines

### Environment Variables
```typescript
// ✅ Use NEXT_PUBLIC_ prefix for client-side variables
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// ❌ Don't expose secrets to client
// Server-side only (API routes, server components)
const apiSecret = process.env.API_SECRET;
```

### API Client
```typescript
// lib/api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // Send httpOnly cookies
});

// Request interceptor (add auth headers if needed)
apiClient.interceptors.request.use((config) => {
  // Token from httpOnly cookie handled automatically
  return config;
});

// Response interceptor (handle errors)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Input Sanitization
```typescript
// Always validate and sanitize user input
import { z } from 'zod';

const weighingSchema = z.object({
  vehicleRegistration: z.string().min(1).max(20).regex(/^[A-Z0-9\s]+$/),
  mode: z.enum(['static', 'wim', 'axle']),
  stationId: z.string().uuid(),
});

function validateWeighingInput(data: unknown) {
  return weighingSchema.parse(data);
}
```

## 🧪 Testing Guidelines

### Component Tests (Vitest + React Testing Library)
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WeighingForm } from './WeighingForm';

describe('WeighingForm', () => {
  it('renders form fields correctly', () => {
    render(<WeighingForm onSubmit={vi.fn()} />);
    
    expect(screen.getByLabelText(/vehicle registration/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/weighing mode/i)).toBeInTheDocument();
  });

  it('calls onSubmit with form data', async () => {
    const onSubmit = vi.fn();
    render(<WeighingForm onSubmit={onSubmit} />);
    
    fireEvent.change(screen.getByLabelText(/vehicle registration/i), {
      target: { value: 'KCA 123X' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        vehicleRegistration: 'KCA 123X',
      })
    );
  });
});
```

### E2E Tests (Playwright)
```typescript
import { test, expect } from '@playwright/test';

test('create weighing transaction', async ({ page }) => {
  await page.goto('/weighing/new');
  
  await page.fill('[name="vehicleRegistration"]', 'KCA 123X');
  await page.selectOption('[name="mode"]', 'static');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL(/\/weighing\/\d+/);
  await expect(page.locator('h1')).toContainText('KCA 123X');
});
```

## 📊 Performance Guidelines

### Code Splitting
```typescript
// Use dynamic imports for large components
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/charts/HeavyChart'), {
  loading: () => <div>Loading chart...</div>,
  ssr: false, // Disable server-side rendering if not needed
});
```

### Image Optimization
```typescript
import Image from 'next/image';

// Use Next.js Image component for automatic optimization
<Image
  src="/vehicle-photo.jpg"
  alt="Vehicle"
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

### Memo and useCallback
```typescript
import { memo, useCallback, useMemo } from 'react';

// Memoize expensive computations
const totalWeight = useMemo(
  () => axles.reduce((sum, axle) => sum + axle.weight, 0),
  [axles]
);

// Memoize callbacks passed to child components
const handleAxleChange = useCallback(
  (index: number, weight: number) => {
    setAxles(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], weight };
      return updated;
    });
  },
  []
);

// Memoize components
export const AxleInput = memo(function AxleInput({ axle, onChange }: AxleInputProps) {
  return <input value={axle.weight} onChange={(e) => onChange(Number(e.target.value))} />;
});
```

## ♿ Accessibility Guidelines

### Semantic HTML
```tsx
// ✅ Use semantic elements
<nav>
  <ul>
    <li><a href="/weighing">Weighing</a></li>
    <li><a href="/prosecution">Prosecution</a></li>
  </ul>
</nav>

// ❌ Avoid divs for everything
<div className="nav">
  <div className="nav-item">Weighing</div>
</div>
```

### ARIA Labels
```tsx
<button aria-label="Close dialog" onClick={onClose}>
  <XIcon />
</button>

<input
  type="search"
  aria-label="Search vehicles"
  aria-describedby="search-help"
/>
<span id="search-help">Enter vehicle registration number</span>
```

### Keyboard Navigation
```typescript
function Dialog({ isOpen, onClose }: DialogProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  // Dialog content
}
```

## 📚 Documentation Standards

### JSDoc Comments
```typescript
/**
 * Fetches a weighing transaction by ID from the API.
 *
 * @param id - The weighing transaction ID
 * @returns Promise resolving to weighing transaction data
 * @throws {NotFoundError} When weighing transaction doesn't exist
 *
 * @example
 * ```typescript
 * const weighing = await getWeighing('123');
 * console.log(weighing.vehicleRegistration);
 * ```
 */
export async function getWeighing(id: string): Promise<Weighing> {
  const response = await apiClient.get(`/api/v1/weighings/${id}`);
  return response.data;
}
```

### README Updates
- Update README when adding major features
- Include screenshots for UI changes
- Document environment variables
- Update setup instructions if needed

## 🤝 Communication

### Channels
- **GitHub Issues**: Bug reports, feature requests
- **Pull Requests**: Code review discussions
- **Discussions**: UI/UX decisions, architecture questions

### Response Times
- **Critical UI Issues**: Within 24 hours
- **PR Reviews**: Within 48 hours
- **Questions**: Within 72 hours

---

**Last Updated**: February 2, 2026

For questions or clarifications, please open a GitHub Discussion or contact the maintainers.
