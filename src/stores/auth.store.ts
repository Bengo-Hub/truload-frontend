/**
 * Authentication store using Zustand.
 * Manages authentication state, login/logout actions, and user data.
 */

import * as authApi from '@/lib/auth/api';
import { clearTokens, PLATFORM_OWNER_ORG_CODE, setIsPlatformOwner, setTenantContext } from '@/lib/auth/token';
import { clearAllScaleTestCaches } from '@/lib/scale-test-cache';
import type { User } from '@/types/auth/types';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Guard to prevent concurrent fetchUser calls
let isFetchingUser = false;
let fetchUserPromise: Promise<void> | null = null;

interface ApiError {
  response?: {
    status: number;
  };
}

export interface Pending2FA {
  twoFactorToken: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  /** Set when login returned requires2FA; clear after 2FA verify or on new login attempt */
  pending2FA: Pending2FA | null;
  /** Set when login returned requires2FASetup (org requires 2FA); clear after user enables 2FA or logout */
  requires2FASetup: boolean;

  // Actions
  login: (email: string, password: string, options?: { organizationCode?: string; stationCode?: string }) => Promise<void>;
  loginVerify2FA: (twoFactorToken: string, code: string, useRecoveryCode?: boolean) => Promise<void>;
  clearPending2FA: () => void;
  clearRequires2FASetup: () => void;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  clearError: () => void;
  checkAuth: () => void;
  /** Directly set the user (used after SSO select-station completes). */
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      pending2FA: null,
      requires2FASetup: false,

      /**
       * Login user with email and password.
       * If backend returns requires2FA, sets pending2FA and does not set user/tokens.
       */
      login: async (email: string, password: string, options?: { organizationCode?: string; stationCode?: string }) => {
        set({ isLoading: true, error: null, pending2FA: null });
        try {
          const response = await authApi.login(email, password, options);
          if (response.requires2FA && response.twoFactorToken) {
            set({ pending2FA: { twoFactorToken: response.twoFactorToken }, isLoading: false, error: null });
            return;
          }
          set({
            user: response.user ?? null,
            isAuthenticated: !!response.user,
            isLoading: false,
            error: null,
            pending2FA: null,
            requires2FASetup: !!response.requires2FASetup,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
            pending2FA: null,
            requires2FASetup: false,
          });
          throw error;
        }
      },

      /**
       * Complete login after 2FA verification. Call when user has pending2FA and submits TOTP/recovery code.
       */
      loginVerify2FA: async (twoFactorToken: string, code: string, useRecoveryCode = false) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.loginVerify2FA(twoFactorToken, code, useRecoveryCode);
          set({
            user: response.user ?? null,
            isAuthenticated: !!response.user,
            isLoading: false,
            error: null,
            pending2FA: null,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Invalid verification code';
          set({ isLoading: false, error: errorMessage });
          throw error;
        }
      },

      clearPending2FA: () => set({ pending2FA: null }),
      clearRequires2FASetup: () => set({ requires2FASetup: false }),

      /**
       * Logout user and clear authentication state.
       */
      logout: async () => {
        set({ isLoading: true });

        try {
          await authApi.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          clearAllScaleTestCaches();
          clearTokens();

          // Clear all TanStack Query caches via custom event
          // (QueryClient lives in React context, so we signal it to clear)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('truload:logout'));
          }

          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      /**
       * Fetch current user profile from backend.
       * Silently fails if unauthenticated (user not logged in yet).
       * Prevents concurrent requests with internal guard.
       */
      fetchUser: async () => {
        // If already fetching, return the in-progress promise
        if (isFetchingUser && fetchUserPromise) {
          return fetchUserPromise;
        }

        isFetchingUser = true;
        set({ isLoading: true, error: null });
        
        try {
          fetchUserPromise = (async () => {
            try {
              const user = await authApi.getCurrentUser();
              setTenantContext({
                organizationId: user.organizationId,
                stationId: user.stationId,
                isHqUser: user.isHqUser,
              });
              setIsPlatformOwner(user.organizationCode?.toUpperCase() === PLATFORM_OWNER_ORG_CODE);
              set({ user, isAuthenticated: true, isLoading: false, error: null });
            } catch (error) {
              // Silent fail for 401 (not logged in) to avoid unnecessary errors
              const is401 = (error as ApiError)?.response?.status === 401;
              const errorMessage = !is401 && error instanceof Error ? error.message : '';
              set({ user: null, isAuthenticated: false, isLoading: false, error: errorMessage || null });
            } finally {
              isFetchingUser = false;
              fetchUserPromise = null;
            }
          })();

          await fetchUserPromise;
        } catch (error) {
          isFetchingUser = false;
          fetchUserPromise = null;
          throw error;
        }
      },

      /**
       * Clear error message.
       */
      clearError: () => set({ error: null }),

      setUser: (user: User) => set({ user, isAuthenticated: true, error: null }),

      /**
       * Check authentication status on app load.
       * Always rehydrate from backend to ensure fresh user data and permissions.
       */
      checkAuth: () => {
        // Always attempt to rehydrate user from backend even if localStorage has user
        // This ensures permissions and roles are current after page refresh
        get().fetchUser();
      },
    }),
    {
      name: 'truload-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        // do not persist pending2FA (short-lived challenge token)
      }),
    }
  )
);
