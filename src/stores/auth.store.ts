/**
 * Authentication store using Zustand.
 * Manages authentication state, login/logout actions, and user data.
 */

import * as authApi from '@/lib/auth/api';
import { clearTokens } from '@/lib/auth/token';
import type { User } from '@/types/auth/types';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Guard to prevent concurrent fetchUser calls
let isFetchingUser = false;
let fetchUserPromise: Promise<void> | null = null;

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  clearError: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      /**
       * Login user with email and password.
       */
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authApi.login(email, password);
          
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

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
          clearTokens();
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
              set({ user, isAuthenticated: true, isLoading: false, error: null });
            } catch (error) {
              // Silent fail for 401 (not logged in) to avoid unnecessary errors
              const is401 = (error as any)?.response?.status === 401;
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
      }),
    }
  )
);
