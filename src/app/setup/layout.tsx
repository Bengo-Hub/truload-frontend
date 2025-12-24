'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredPermissions={['system.view_config']}>
      <AppShell title="Setup" subtitle="Configure system settings, axle definitions, and integrations">
        {children}
      </AppShell>
    </ProtectedRoute>
  );
}
