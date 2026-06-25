'use client';

/**
 * OfflineSyncPanel — operator-facing view of the offline sync queue.
 *
 * Surfaces pending (auto-retrying) and dead-lettered (needs review) items so
 * offline-captured data is never silently lost. Lets the operator force a sync,
 * retry a failed item, or discard it. Reads from the Dexie offline stores via
 * the sync engine helpers.
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  drainMutationQueue,
  dismissDeadLetter,
  getDeadLetterItems,
  retryDeadLetter,
  type DeadLetterItem,
} from '@/lib/offline/sync';
import { getSyncStatusCounts } from '@/lib/offline/db';
import { AlertTriangle, CloudOff, Loader2, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

export function OfflineSyncPanel() {
  const [counts, setCounts] = useState({ pending: 0, deadLetter: 0 });
  const [deadLetters, setDeadLetters] = useState<DeadLetterItem[]>([]);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    const [c, dl] = await Promise.all([getSyncStatusCounts(), getDeadLetterItems()]);
    setCounts(c);
    setDeadLetters(dl);
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 10_000);
    return () => clearInterval(t);
  }, [refresh]);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const n = await drainMutationQueue();
      toast.success(n > 0 ? `Synced ${n} item${n === 1 ? '' : 's'}` : 'Nothing to sync');
      await refresh();
    } catch {
      toast.error('Sync failed — will retry automatically');
    } finally {
      setSyncing(false);
    }
  };

  const handleRetry = async (item: DeadLetterItem) => {
    await retryDeadLetter(item.kind, item.key);
    toast.success('Re-queued for sync');
    await refresh();
  };

  const handleDismiss = async (item: DeadLetterItem) => {
    await dismissDeadLetter(item.kind, item.key);
    toast.success('Discarded');
    await refresh();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <CloudOff className="h-4 w-4" /> Offline Sync
        </CardTitle>
        <Button size="sm" variant="outline" onClick={handleSyncNow} disabled={syncing} className="gap-1.5">
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Sync now
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3 text-sm">
          <Badge variant="outline" className="gap-1.5">
            Pending <span className="font-semibold">{counts.pending}</span>
          </Badge>
          <Badge
            variant="outline"
            className={`gap-1.5 ${counts.deadLetter > 0 ? 'border-red-300 text-red-700' : ''}`}
          >
            Needs review <span className="font-semibold">{counts.deadLetter}</span>
          </Badge>
        </div>

        {deadLetters.length > 0 ? (
          <div className="space-y-2">
            {deadLetters.map((item) => (
              <div
                key={`${item.kind}-${item.key}`}
                className="flex items-start justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-red-800">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {item.label}
                  </p>
                  <p className="truncate text-xs text-red-600">
                    {item.error ?? 'Sync failed'} · {item.attempts} attempt{item.attempts === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Retry" onClick={() => handleRetry(item)}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" title="Discard" onClick={() => handleDismiss(item)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {counts.pending > 0
              ? 'Items are queued and will sync automatically when online.'
              : 'All caught up — nothing waiting to sync.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
