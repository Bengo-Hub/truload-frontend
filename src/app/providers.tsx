'use client';

import { AuthInitializer } from '@/components/auth/AuthInitializer';
import { CACHE_TIMES, GC_TIMES } from '@/lib/query/config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { Toaster } from 'sonner';

/**
 * Create QueryClient with optimized configuration
 * - Default stale time: 1 minute (balance between freshness and performance)
 * - Garbage collection: 5 minutes (keep unused data briefly for back navigation)
 * - Retry: 3 times with exponential backoff
 * - No auto-refetch on window focus (controlled by individual queries)
 */
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: CACHE_TIMES.DYNAMIC, // 1 minute default
        gcTime: GC_TIMES.DYNAMIC, // 5 minutes before garbage collection
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
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

  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer>
        {children}
        <Toaster position="top-right" richColors />
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthInitializer>
    </QueryClientProvider>
  );
}
