'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useSupersetDashboards, useGetSupersetGuestToken } from '@/hooks/queries/useAnalyticsQueries';
import { BarChart3, Loader2, RefreshCcw } from 'lucide-react';

const SUPERSET_DOMAIN = process.env.NEXT_PUBLIC_SUPERSET_URL || 'https://superset.codevertexitsolutions.com';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EmbeddedDashboardPromise = Promise<{ unmount: () => void } & Record<string, any>>;

export function SupersetDashboard() {
  const mountRef = useRef<HTMLDivElement>(null);
  const embeddedRef = useRef<EmbeddedDashboardPromise | null>(null);
  const [selectedDashboardId, setSelectedDashboardId] = useState<string>('');
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [embedError, setEmbedError] = useState<string | null>(null);

  // Token cache: avoid re-fetching within TTL
  const tokenCacheRef = useRef<{ token: string; expiresAt: number; dashboardId: number } | null>(null);
  // Failure guard: if token fetch fails, don't retry for 5 minutes
  const failedAtRef = useRef<number>(0);
  // Deduplicate concurrent fetchGuestToken calls from the SDK
  const inflightTokenRef = useRef<Promise<string> | null>(null);
  // Track mounted state to prevent stale SDK callbacks
  const mountedRef = useRef(true);

  const { data: dashboards, isLoading: loadingDashboards } = useSupersetDashboards();
  const guestTokenMutation = useGetSupersetGuestToken();

  // Stable ref for mutateAsync so it doesn't cause useCallback re-creation
  const mutateAsyncRef = useRef(guestTokenMutation.mutateAsync);
  mutateAsyncRef.current = guestTokenMutation.mutateAsync;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const embedSelectedDashboard = useCallback(async (dashboardId: string) => {
    if (!mountRef.current || !dashboardId) return;

    setEmbedError(null);

    // Unmount previous dashboard
    if (embeddedRef.current) {
      try {
        const prev = await embeddedRef.current;
        prev.unmount();
      } catch {
        // ignore unmount errors
      }
    }

    // Clear in-flight token request on new embed
    inflightTokenRef.current = null;

    setIsEmbedding(true);

    try {
      const numericId = parseInt(dashboardId, 10);

      // Dynamic import to avoid Turbopack resolution issues
      const { embedDashboard } = await import('@superset-ui/embedded-sdk');

      embeddedRef.current = embedDashboard({
        id: dashboardId,
        supersetDomain: SUPERSET_DOMAIN,
        mountPoint: mountRef.current!,
        fetchGuestToken: async () => {
          // Component unmounted — reject to stop SDK polling
          if (!mountedRef.current) {
            throw new Error('Component unmounted');
          }

          // If we recently failed, reject immediately to prevent SDK retry storm (5min cooldown)
          const now = Date.now();
          if (failedAtRef.current && now - failedAtRef.current < 300_000) {
            throw new Error('Guest token fetch temporarily disabled after failure');
          }

          // Return cached token if still valid (5min TTL)
          const cached = tokenCacheRef.current;
          if (cached && cached.dashboardId === numericId && now < cached.expiresAt) {
            return cached.token;
          }

          // Deduplicate: if a fetch is already in-flight, reuse it
          if (inflightTokenRef.current) {
            return inflightTokenRef.current;
          }

          const fetchPromise = (async () => {
            try {
              const result = await mutateAsyncRef.current({
                dashboardIds: [numericId],
              });
              // Cache for 5 minutes
              tokenCacheRef.current = {
                token: result.token,
                expiresAt: Date.now() + 5 * 60 * 1000,
                dashboardId: numericId,
              };
              failedAtRef.current = 0;
              return result.token;
            } catch (err) {
              failedAtRef.current = Date.now();
              throw err;
            } finally {
              inflightTokenRef.current = null;
            }
          })();

          inflightTokenRef.current = fetchPromise;
          return fetchPromise;
        },
        dashboardUiConfig: {
          hideTitle: true,
          hideChartControls: false,
          filters: {
            visible: true,
            expanded: false,
          },
        },
      });

      await embeddedRef.current;
    } catch (err) {
      if (mountedRef.current) {
        console.error('Failed to embed Superset dashboard:', err);
        setEmbedError('Failed to load dashboard. Please try again later.');
      }
    } finally {
      if (mountedRef.current) {
        setIsEmbedding(false);
      }
    }
  }, []);

  // Embed when dashboard selection changes
  useEffect(() => {
    if (selectedDashboardId) {
      embedSelectedDashboard(selectedDashboardId);
    }
    return () => {
      if (embeddedRef.current) {
        embeddedRef.current.then(d => d.unmount()).catch(() => {});
        embeddedRef.current = null;
      }
    };
  }, [selectedDashboardId, embedSelectedDashboard]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Superset Dashboards
            </CardTitle>
            <CardDescription>Interactive BI dashboards powered by Apache Superset</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {loadingDashboards ? (
              <Skeleton className="h-9 w-[200px]" />
            ) : (
              <Select value={selectedDashboardId} onValueChange={setSelectedDashboardId}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="Select a dashboard" />
                </SelectTrigger>
                <SelectContent>
                  {dashboards?.map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      {d.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedDashboardId && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => embedSelectedDashboard(selectedDashboardId)}
                disabled={isEmbedding}
              >
                <RefreshCcw className={`h-4 w-4 ${isEmbedding ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!selectedDashboardId ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-muted-foreground">Select a dashboard above to view</p>
          </div>
        ) : embedError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="h-12 w-12 text-red-300 mb-4" />
            <p className="text-red-600 font-medium mb-2">{embedError}</p>
            <Button variant="outline" size="sm" onClick={() => embedSelectedDashboard(selectedDashboardId)}>
              Retry
            </Button>
          </div>
        ) : isEmbedding ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
            <span className="text-muted-foreground">Loading dashboard...</span>
          </div>
        ) : null}
        <div
          ref={mountRef}
          className="w-full min-h-[600px]"
          style={{ display: selectedDashboardId && !isEmbedding ? 'block' : 'none' }}
        />
      </CardContent>
    </Card>
  );
}
