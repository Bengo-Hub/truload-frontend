'use client';

import { useAuthStore } from '@/stores/auth.store';
import { useEffect, useRef } from 'react';

/**
 * AuthInitializer - ensures auth state is rehydrated from backend on app boot.
 * Must be rendered once at the root level, before any ProtectedRoute checks.
 * This is separate from useAuth hook to avoid dependency cycles.
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only rehydrate once per app load
    if (hasInitialized.current) {
      return;
    }

    hasInitialized.current = true;

    // Trigger auth rehydration from backend on app mount
    // This ensures fresh user data and permissions even if localStorage has cached user
    const rehydrate = async () => {
      try {
        await useAuthStore.getState().fetchUser();
      } catch (error) {
        // Silently ignore - user might not be logged in or connection failed
        // The app will show login page via middleware/ProtectedRoute guards
        console.debug('Auth initialization skipped:', error instanceof Error ? error.message : 'unknown error');
      }
    };

    rehydrate();
  }, []);

  return <>{children}</>;
}
