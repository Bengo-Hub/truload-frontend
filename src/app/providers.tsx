'use client';

import { AuthInitializer } from '@/components/auth/AuthInitializer';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrandProvider } from '@/contexts/BrandContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { CACHE_TIMES, GC_TIMES } from '@/lib/query/config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';

/**
 * Create QueryClient with optimized caching configuration.
 *
 * Cache strategy to prevent API rate limits:
 * - Default staleTime: 5 minutes (serve cached data, only refetch after expiry)
 * - gcTime: 15 minutes (keep unused cache for back-navigation)
 * - refetchOnWindowFocus: false (prevent spikes on tab switching)
 * - refetchOnMount: true (refetch only if stale when component mounts)
 * - structuralSharing: true (avoid re-renders for identical data)
 * - Retry: 2 with exponential backoff (cap at 30s)
 *
 * Individual hooks override with QUERY_OPTIONS from config.ts:
 *   static (30min), semiStatic (5min), dynamic (1min), realTime (30s)
 */
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: CACHE_TIMES.SEMI_STATIC, // 5 min - serve from cache while fresh
        gcTime: GC_TIMES.SEMI_STATIC, // 15 min before garbage collection
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: false, // Prevent refetch storms on tab switching
        refetchOnMount: true, // Only refetch on mount if data is stale
        refetchOnReconnect: true,
        structuralSharing: true, // Avoid re-renders when data hasn't changed
        throwOnError: false, // Don't bubble query errors to error boundaries — handle in components
      },
      mutations: {
        retry: 1,
        retryDelay: 1000,
      },
    },
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  // Clear all TanStack Query caches on logout
  useEffect(() => {
    const handleLogout = () => {
      queryClient.clear();
      console.log('[Providers] TanStack Query cache cleared on logout');
    };
    window.addEventListener('truload:logout', handleLogout);
    return () => window.removeEventListener('truload:logout', handleLogout);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer>
        <BrandProvider>
          <CurrencyProvider>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </CurrencyProvider>
        </BrandProvider>
        <Toaster position="top-right" richColors />
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthInitializer>
    </QueryClientProvider>
  );
}
