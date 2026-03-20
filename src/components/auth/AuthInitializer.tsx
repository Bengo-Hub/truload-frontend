'use client';

import { useAuthStore } from '@/stores/auth.store';
import { useEffect, useRef } from 'react';

/**
 * AuthInitializer - ensures auth state is rehydrated from backend on app boot.
 * Must be rendered once at the root level, before any ProtectedRoute checks.
 * Skips auth fetch on SSO callback pages (the callback handles auth separately).
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Skip auth rehydration on SSO callback pages — the callback page handles
    // the SSO flow (code exchange → sso-exchange → station select) separately.
    // Firing fetchUser() here would call /auth/profile with no truload JWT and get 404/401.
    if (typeof window !== 'undefined' && window.location.pathname.includes('/auth/callback')) {
      return;
    }

    const rehydrate = async () => {
      try {
        await useAuthStore.getState().fetchUser();
      } catch (error) {
        console.debug('Auth initialization skipped:', error instanceof Error ? error.message : 'unknown error');
      }
    };

    rehydrate();
  }, []);

  return <>{children}</>;
}
