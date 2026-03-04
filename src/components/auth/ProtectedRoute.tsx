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
}

export function ProtectedRoute({
  children,
  requiredRoles,
  requiredPermissions,
  matchAllRoles = false,
  matchAllPermissions = false,
}: ProtectedRouteProps) {
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const { isAuthenticated, isLoading, user } = useAuth();
  // orgSlug used for unauthorized redirect (tenant routes)
  const hasRequiredRole = useHasRole(requiredRoles ?? [], matchAllRoles ? 'all' : 'any');
  const hasRequiredPermission = useHasPermission(
    requiredPermissions ?? [],
    matchAllPermissions ? 'all' : 'any'
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const rolesSatisfied = !requiredRoles?.length || hasRequiredRole;
      const permissionsSatisfied = !requiredPermissions?.length || hasRequiredPermission;

      if (!rolesSatisfied || !permissionsSatisfied) {
        router.push(`/${orgSlug}/unauthorized`);
      }
    }
  }, [
    hasRequiredPermission,
    hasRequiredRole,
    isAuthenticated,
    isLoading,
    orgSlug,
    requiredPermissions,
    requiredRoles,
    router,
    user,
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

  // Do not render children when user lacks required role/permission (avoids flash before redirect)
  const rolesSatisfied = !requiredRoles?.length || hasRequiredRole;
  const permissionsSatisfied = !requiredPermissions?.length || hasRequiredPermission;
  if (!rolesSatisfied || !permissionsSatisfied) {
    return null;
  }

  return <>{children}</>;
}
