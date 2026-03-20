/**
 * Protected route wrapper component.
 * Ensures user is authenticated before rendering children.
 */

'use client';

import { useAuth, useHasPermission, useHasRole } from '@/hooks/useAuth';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  matchAllRoles?: boolean;
  matchAllPermissions?: boolean;
  /** Module key required for this page. Checked against user.enabledModules (if set). Superusers bypass. */
  moduleKey?: string;
}

export function ProtectedRoute({
  children,
  requiredRoles,
  requiredPermissions,
  matchAllRoles = false,
  matchAllPermissions = false,
  moduleKey,
}: ProtectedRouteProps) {
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const { isAuthenticated, isLoading, user } = useAuth();
  const hasRequiredRole = useHasRole(requiredRoles ?? [], matchAllRoles ? 'all' : 'any');
  const hasRequiredPermission = useHasPermission(
    requiredPermissions ?? [],
    matchAllPermissions ? 'all' : 'any'
  );

  // Module access: if the user has an enabledModules list and this page has a moduleKey,
  // verify the module is enabled. Superusers bypass module restrictions.
  const hasModuleAccess =
    !moduleKey ||
    user?.isSuperUser ||
    !user?.enabledModules?.length ||
    user.enabledModules.includes(moduleKey);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const loginPath = orgSlug ? `/${orgSlug}/auth/login` : '/auth/login';
      router.replace(loginPath);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading]);

  const userId = user?.id;
  useEffect(() => {
    if (!isLoading && isAuthenticated && userId) {
      const rolesSatisfied = !requiredRoles?.length || hasRequiredRole;
      const permissionsSatisfied = !requiredPermissions?.length || hasRequiredPermission;

      if (!rolesSatisfied || !permissionsSatisfied || !hasModuleAccess) {
        router.replace(`/${orgSlug}/unauthorized`);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasRequiredPermission,
    hasRequiredRole,
    hasModuleAccess,
    isAuthenticated,
    isLoading,
    userId,
  ]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Do not render children when access is denied (avoids flash before redirect)
  const rolesSatisfied = !requiredRoles?.length || hasRequiredRole;
  const permissionsSatisfied = !requiredPermissions?.length || hasRequiredPermission;
  if (!rolesSatisfied || !permissionsSatisfied || !hasModuleAccess) {
    return null;
  }

  return <>{children}</>;
}
