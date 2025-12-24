/**
 * Authentication hooks for easy access to auth state and actions.
 */

import { useAuthStore } from '@/stores/auth.store';

/**
 * Hook to access authentication state and actions.
 * Note: Auth is initialized at the root level by AuthInitializer component.
 * This hook just exposes the auth state without triggering additional fetches.
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
  } = useAuthStore();

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
 * @param roleNames Roles to match (name or code). Accepts single or array.
 * @param match Whether all roles must match ("all") or any ("any"). Defaults to "any".
 */
export function useHasRole(roleNames: string | string[], match: 'any' | 'all' = 'any') {
  const user = useAuthStore((state) => state.user);
  
  if (!user) return false;
  if (user.isSuperUser) return true;

  const required = (Array.isArray(roleNames) ? roleNames : [roleNames])
    .filter(Boolean)
    .map((r) => r.toLowerCase());

  if (required.length === 0) return true;

  const userRoles = (user.roles ?? [])
    .filter(Boolean)
    .map((r) => r.toLowerCase());

  if (match === 'all') {
    return required.every((role) => userRoles.includes(role));
  }

  return required.some((role) => userRoles.includes(role));
}

/**
 * Hook to check if user has required permissions.
 * @param permissionCodes Permission codes to validate (e.g., "weighing.create").
 * @param match Whether all permissions are required ("all") or any ("any"). Defaults to "any".
 */
export function useHasPermission(permissionCodes: string | string[], match: 'any' | 'all' = 'any') {
  const user = useAuthStore((state) => state.user);

  if (!user) return false;
  if (user.isSuperUser) return true;

  const required = (Array.isArray(permissionCodes) ? permissionCodes : [permissionCodes])
    .filter(Boolean)
    .map((p) => p.toLowerCase());

  if (required.length === 0) return true;

  const userPermissions = (user.permissions ?? [])
    .filter(Boolean)
    .map((code) => code.toLowerCase());

  if (match === 'all') {
    return required.every((perm) => userPermissions.includes(perm));
  }

  return required.some((perm) => userPermissions.includes(perm));
}
