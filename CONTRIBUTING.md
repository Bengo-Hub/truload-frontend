# Contributing to TruLoad Frontend

Thank you for your interest in contributing to TruLoad Frontend! This document outlines the development process and standards.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Component Guidelines](#component-guidelines)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ (LTS recommended)
- pnpm 8+ (install via `npm install -g pnpm`)
- Git
- IDE: VS Code (recommended) with recommended extensions

### Recommended VS Code Extensions

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript and JavaScript Language Features
- GitLens

### Fork and Clone

```bash
git clone https://github.com/YOUR_USERNAME/truload-frontend.git
cd truload-frontend
pnpm install
```

### Run Development Server

```bash
cp .env.example .env.local
# Edit .env.local with your API URLs
pnpm dev
```

## 🔄 Development Workflow

### Branching Strategy

- `main` - Production-ready code
- `develop` - Integration branch
- `feature/{module-name}` - Feature branches
- `fix/{issue-number}` - Bug fixes
- `hotfix/{critical-issue}` - Production hotfixes

### Creating a Feature Branch

```bash
git checkout develop
git pull origin develop
git checkout -b feature/weighing-ui
```

## 🎨 Coding Standards

### TypeScript

- **Always** use TypeScript (no `.js` files in `src/`)
- Define proper types/interfaces (avoid `any`)
- Use `type` for unions/primitives, `interface` for objects

```typescript
// ✅ Good
interface Weighing {
  id: number;
  ticketNo: string;
  gvwMeasuredKg: number;
  isCompliant: boolean;
}

type WeighingStatus = 'pending' | 'compliant' | 'overload';

// ❌ Bad
const weighing: any = { ... };
```

### File Naming

- **Components:** PascalCase (e.g., `WeighingForm.tsx`)
- **Utilities:** camelCase (e.g., `formatWeight.ts`)
- **Hooks:** camelCase with `use` prefix (e.g., `useWeighing.ts`)
- **Stores:** camelCase with `Store` suffix (e.g., `weighingStore.ts`)

### Code Organization

```typescript
// Component file structure
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
// External imports first

import { Button } from '@/components/ui/button';
import { useWeighingStore } from '@/stores/weighingStore';
// Internal imports

interface ComponentProps {
  // Props definition
}

export function ComponentName({ prop }: ComponentProps) {
  // Hooks
  // State
  // Effects
  // Handlers
  // Render
}
```

## 🧩 Component Guidelines

### Use Shadcn UI Components

Always prefer Shadcn UI components over custom implementations:

```typescript
// ✅ Good
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

// ❌ Bad
<button className="custom-btn">Click</button>
```

### Component Composition

- Keep components small and focused
- Extract reusable logic to custom hooks
- Use composition over prop drilling

```typescript
// ✅ Good
function WeighingScreen() {
  return (
    <WeighingLayout>
      <VehicleDetails />
      <WeightCapture />
      <CompliancePanel />
    </WeighingLayout>
  );
}

// ❌ Bad - everything in one component
function WeighingScreen() {
  // 500 lines of code...
}
```

### State Management

- **Local State:** `useState` for component-specific state
- **Server State:** TanStack Query for API data
- **Global State:** Zustand for cross-component state (minimize usage)

```typescript
// ✅ Good - Server state with TanStack Query
const { data: weighing } = useQuery({
  queryKey: ['weighings', weighingId],
  queryFn: () => api.getWeighing(weighingId),
});

// ✅ Good - Local UI state
const [isDialogOpen, setIsDialogOpen] = useState(false);

// ✅ Good - Global app state (Zustand)
const { currentStation, setBound } = useAppStore();
```

### Styling

- Use Tailwind CSS utility classes
- Extract repeated patterns to components
- Use `cn()` utility for conditional classes

```typescript
import { cn } from '@/lib/utils';

<div className={cn(
  "rounded-lg border p-4",
  isError && "border-red-500",
  isSuccess && "border-green-500"
)}>
```

## 🧪 Testing Guidelines

### Unit Tests (Jest + React Testing Library)

```typescript
import { render, screen } from '@testing-library/react';
import { WeighingCard } from './WeighingCard';

describe('WeighingCard', () => {
  it('displays weighing ticket number', () => {
    render(<WeighingCard ticketNo="ATMBA202510000124" />);
    expect(screen.getByText('ATMBA202510000124')).toBeInTheDocument();
  });
  
  it('shows compliant badge when vehicle is compliant', () => {
    render(<WeighingCard isCompliant={true} />);
    expect(screen.getByText('Compliant')).toBeInTheDocument();
  });
});
```

### E2E Tests (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('weighing flow completes successfully', async ({ page }) => {
  await page.goto('/weighing');
  await page.fill('[name="vehicleRegNo"]', 'KDQ548Z');
  await page.click('button:has-text("Weigh")');
  await expect(page.locator('.ticket-number')).toBeVisible();
});
```

## 📝 Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make Changes**
   - Write clean, documented code
   - Add tests for new features
   - Update documentation

3. **Run Quality Checks**
   ```bash
   pnpm lint
   pnpm type-check
   pnpm test
   ```

4. **Commit with Conventional Commits**
   ```bash
   git commit -m "feat(weighing): add WIM mode UI"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature
   ```
   - Fill out PR template
   - Link related issues
   - Request review

6. **Address Review Comments**
   - Make requested changes
   - Push to same branch
   - Re-request review

## 💬 Commit Message Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style (formatting, missing semicolons, etc.)
- `refactor` - Code refactoring
- `perf` - Performance improvement
- `test` - Adding tests
- `chore` - Maintenance

### Examples

```
feat(weighing): implement static weighing mode

Added multi-deck weight capture with live TruConnect stream
integration. Supports up to 7 axles with group assignment.

Closes #12
```

```
fix(prosecution): correct EAC charge lookup

Fixed fee band query to use correct overload range for
axle-based charges under EAC Act.

Fixes #45
```

## 🔍 Code Review Checklist

Before submitting PR:

- [ ] Code follows TypeScript/React best practices
- [ ] Components are properly typed
- [ ] No console.log statements (use proper logging)
- [ ] Tests added/updated and passing
- [ ] No linter warnings
- [ ] Responsive design tested on mobile/tablet/desktop
- [ ] Accessibility checked (keyboard nav, screen readers)
- [ ] Offline behavior tested (if applicable)
- [ ] Documentation updated
- [ ] No secrets or API keys hardcoded

## 🎯 Best Practices

### Performance

- Use React Server Components where possible
- Implement proper loading states
- Lazy load heavy components
- Optimize images (use Next.js Image component)
- Minimize bundle size

### Accessibility

- Semantic HTML
- Proper ARIA labels
- Keyboard navigation
- Focus management
- Color contrast (WCAG AA)

### Security

- Never commit secrets
- Sanitize user inputs
- Use HTTPS for all API calls
- Implement CSRF protection
- Follow OWASP guidelines

## 📚 Resources

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [TanStack Query](https://tanstack.com/query/latest)
- [Shadcn UI](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Zustand](https://docs.pmnd.rs/zustand/)

## 🙏 Thank You!

Your contributions help make TruLoad better for field officers and road authorities. We appreciate your time and effort!

