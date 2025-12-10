/**
 * Authentication store using Zustand.
 * Manages authentication state, login/logout actions, and user data.
 */

import * as authApi from '@/lib/auth/api';
import { hasValidToken } from '@/lib/auth/token';
import type { User } from '@/types/auth/types';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string, tenantSlug?: string) => Promise<void>;
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
      login: async (email: string, password: string, tenantSlug = 'codevertex') => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authApi.login(email, password, tenantSlug);
          
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
       */
      fetchUser: async () => {
        if (!hasValidToken()) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        set({ isLoading: true, error: null });
        
        try {
          const user = await authApi.getCurrentUser();
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user';
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });
        }
      },

      /**
       * Clear error message.
       */
      clearError: () => set({ error: null }),

      /**
       * Check authentication status on app load.
       */
      checkAuth: () => {
        const isValid = hasValidToken();
        if (!isValid) {
          set({ isAuthenticated: false, user: null });
        } else if (!get().user) {
          // Token is valid but no user data, fetch it
          get().fetchUser();
        }
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
