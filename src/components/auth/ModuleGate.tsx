'use client';

/**
 * ModuleGate: Conditionally render children based on module access.
 * Analogous to PermissionGate but for tenant module authorization.
 *
 * Usage:
 *   <ModuleGate moduleKey="cases">
 *     <CasesList />
 *   </ModuleGate>
 *
 *   <ModuleGate enforcementOnly>
 *     <ComplianceChart />
 *   </ModuleGate>
 */

import { useModuleAccess } from '@/hooks/useModuleAccess';
import type { ReactNode } from 'react';

interface ModuleGateProps {
  /** Module key — hidden if module is not in user's enabledModules */
  moduleKey?: string;
  /** If true, hidden for commercial tenants (regardless of moduleKey) */
  enforcementOnly?: boolean;
  /** Content to show when access is granted */
  children: ReactNode;
  /** Content to show when access is denied (default: nothing) */
  fallback?: ReactNode;
}

export function ModuleGate({
  moduleKey,
  enforcementOnly = false,
  children,
  fallback = null,
}: ModuleGateProps) {
  const { isCommercial, hasModule } = useModuleAccess();

  // Enforcement-only gate
  if (enforcementOnly && isCommercial) return <>{fallback}</>;

  // Module key gate
  if (moduleKey && !hasModule(moduleKey)) return <>{fallback}</>;

  return <>{children}</>;
}
