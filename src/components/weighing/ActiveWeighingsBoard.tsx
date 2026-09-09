"use client";

import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPendingCommercialTransactions } from '@/lib/api/weighing';
import { formatWeight } from '@/lib/weighing-utils';
import type { CommercialWeighingResult } from '@/types/weighing';
import { Loader2, RotateCw, Truck } from 'lucide-react';

interface ActiveWeighingsBoardProps {
  stationId?: string;
  onResume: (transaction: CommercialWeighingResult) => void;
}

function formatElapsed(at?: string): string {
  if (!at) return 'Unknown';
  const diffMs = Date.now() - new Date(at).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  const mins = Math.floor((diffMs % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${mins}m ago`;
  return `${mins}m ago`;
}

function statusLabel(t: CommercialWeighingResult): string {
  if (t.captureStatus === 'awaiting_reweigh') {
    const nextReweighNo = Math.max((t.captureEvents?.length ?? 0) - 1, 1);
    return `Awaiting reweigh #${nextReweighNo}`;
  }
  return 'Awaiting 2nd weight';
}

/**
 * Station-wide list of every commercial weighing transaction currently open (first weight
 * captured, or mid-reweigh). Lets an operator weigh a different vehicle while another is out
 * adjusting cargo, then come back and resume any of them directly - without having to remember
 * and retype the exact plate.
 */
export function ActiveWeighingsBoard({ stationId, onResume }: ActiveWeighingsBoardProps) {
  const { data: pending, isLoading } = useQuery({
    queryKey: ['commercial-active-weighings', stationId],
    queryFn: () => getPendingCommercialTransactions(stationId!),
    enabled: !!stationId,
    refetchInterval: 30_000,
  });

  if (!stationId) return null;

  return (
    <Card className="border-blue-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-gray-600">
          <Truck className="h-4 w-4" /> Active Weighings at This Station
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : !pending || pending.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No vehicles currently mid-weighing — every capture has been finalized or hasn't started yet.
          </p>
        ) : (
          <div className="space-y-2">
            {pending.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-md border border-gray-200 p-2.5 text-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono font-semibold shrink-0">{t.vehicleRegNumber}</span>
                  <Badge variant="outline" className="text-xs shrink-0">{statusLabel(t)}</Badge>
                  <span className="text-muted-foreground truncate">
                    {t.firstWeightKg != null ? `${formatWeight(t.firstWeightKg)} kg (${t.firstWeightType})` : '—'}
                  </span>
                  <span className="text-amber-600 shrink-0">
                    {formatElapsed(t.lastWeightCapturedAt ?? t.firstWeightAt)}
                  </span>
                </div>
                <Button size="sm" variant="outline" className="gap-1 shrink-0" onClick={() => onResume(t)}>
                  <RotateCw className="h-3.5 w-3.5" /> Resume
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
