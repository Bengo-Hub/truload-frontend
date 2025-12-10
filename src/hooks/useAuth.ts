/**
 * Authentication hooks for easy access to auth state and actions.
 */

import { useAuthStore } from '@/stores/auth.store';
import { useEffect } from 'react';

/**
 * Hook to access authentication state and actions.
 */
export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    fetchUser,
    clearError,
    checkAuth,
  } = useAuthStore();

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    fetchUser,
    clearError,
  };
}

/**
 * Hook to access current user data.
 */
export function useUser() {
  const user = useAuthStore((state) => state.user);
  const fetchUser = useAuthStore((state) => state.fetchUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return {
    user,
    fetchUser,
    isAuthenticated,
  };
}

/**
 * Hook to check if user has specific role.
 */
export function useHasRole(roleNames: string | string[]) {
  const user = useAuthStore((state) => state.user);
  
  if (!user) return false;
  
  const roles = Array.isArray(roleNames) ? roleNames : [roleNames];
  return roles.includes(user.role_name);
}
