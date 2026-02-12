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

  const { data: dashboards, isLoading: loadingDashboards } = useSupersetDashboards();
  const guestTokenMutation = useGetSupersetGuestToken();

  const embedSelectedDashboard = useCallback(async (dashboardId: string) => {
    if (!mountRef.current || !dashboardId) return;

    // Unmount previous dashboard
    if (embeddedRef.current) {
      try {
        const prev = await embeddedRef.current;
        prev.unmount();
      } catch {
        // ignore unmount errors
      }
    }

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
          const result = await guestTokenMutation.mutateAsync({
            dashboardIds: [numericId],
          });
          return result.token;
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
      console.error('Failed to embed Superset dashboard:', err);
    } finally {
      setIsEmbedding(false);
    }
  }, [guestTokenMutation]);

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
