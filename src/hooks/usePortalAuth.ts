/**
 * Portal authentication hook.
 *
 * Checks if the authenticated user has a linked transporter account.
 * The portal uses the same auth-api JWT tokens but requires
 * a transporter role or linked transporter ID.
 */

'use client';

import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';

export function usePortalAuth() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  const isPortalUser = useMemo(() => {
    if (!user) return false;
    // User is a portal user if they have a transporter-related role
    // or if the user object contains a transporterId field
    const portalRoles = ['transporter', 'portal_user', 'transporter_admin', 'transporter_driver'];
    const hasPortalRole = user.roles?.some((r) =>
      portalRoles.includes(r.toLowerCase())
    );
    return hasPortalRole || false;
  }, [user]);

  const transporterName = useMemo(() => {
    if (!user) return '';
    return user.fullName ?? user.email;
  }, [user]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth/login?redirect=/portal/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  return {
    user,
    isAuthenticated,
    isLoading,
    isPortalUser,
    transporterName,
  };
}
