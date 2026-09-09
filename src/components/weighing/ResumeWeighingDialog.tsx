"use client";

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { CommercialWeighingResult } from '@/types/weighing';
import { formatWeight } from '@/lib/weighing-utils';
import { AlertTriangle, Clock, RotateCcw, Truck } from 'lucide-react';

interface ResumeWeighingDialogProps {
  open: boolean;
  transactions: CommercialWeighingResult[];
  /** Whether the current user holds manual_weight_override — required to resume a candidate outside the auto-match window. */
  canOverride: boolean;
  /** onResume's second argument is true when resuming an out-of-window candidate (isOverrideAttach). */
  onResume: (transaction: CommercialWeighingResult, isOverrideAttach: boolean, overrideReason?: string) => void;
  onStartNew: () => void;
}

function formatElapsed(at?: string): string {
  if (!at) return 'Unknown';
  const diffMs = Date.now() - new Date(at).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  const mins = Math.floor((diffMs % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${mins}m ago`;
  return `${mins}m ago`;
}

function reweighLabel(transaction: CommercialWeighingResult): string {
  const events = transaction.captureEvents ?? [];
  if (transaction.captureStatus === 'awaiting_reweigh') {
    const nextReweighNo = Math.max(events.length - 1, 1);
    return `Awaiting reweigh #${nextReweighNo}`;
  }
  return 'Awaiting 2nd weight';
}

export function ResumeWeighingDialog({ open, transactions, canOverride, onResume, onStartNew }: ResumeWeighingDialogProps) {
  const [selectedId, setSelectedId] = useState<string | undefined>(transactions[0]?.id);
  const [overrideReason, setOverrideReason] = useState('');

  const selected = transactions.find((t) => t.id === selectedId) ?? transactions[0];
  const needsOverride = selected ? selected.isWithinAutoWindow === false : false;

  const handleResumeClick = () => {
    if (!selected) return;
    if (needsOverride) {
      if (!canOverride || !overrideReason.trim()) return;
      onResume(selected, true, overrideReason.trim());
    } else {
      onResume(selected, false);
    }
    setOverrideReason('');
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            {transactions.length > 1 ? 'Open Weighings Found' : 'Open Weighing Found'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This vehicle has {transactions.length > 1 ? `${transactions.length} open transactions` : 'an open transaction'}.
                Pick one to resume for its next weight, or start a brand new transaction.
              </p>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {transactions.map((t) => {
                  const isSelected = t.id === selectedId;
                  const outsideWindow = t.isWithinAutoWindow === false;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedId(t.id)}
                      className={cn(
                        'w-full text-left rounded-md border p-3 space-y-2 text-sm transition-colors',
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-muted bg-muted/30 hover:bg-muted/50'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium">{t.vehicleRegNumber}</span>
                        {t.ticketNumber && (
                          <Badge variant="outline" className="ml-auto font-mono text-xs">
                            {t.ticketNumber}
                          </Badge>
                        )}
                        {outsideWindow ? (
                          <Badge variant="destructive" className="text-xs gap-1">
                            <AlertTriangle className="h-3 w-3" /> Needs override
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Auto-match</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                        <span>Status:</span>
                        <span className="text-foreground font-medium">{reweighLabel(t)}</span>
                        <span>First weight:</span>
                        <span className="text-foreground font-medium">
                          {t.firstWeightKg != null ? `${formatWeight(t.firstWeightKg)} kg` : '—'}
                          {t.firstWeightType && (
                            <Badge variant="secondary" className="ml-1 text-xs capitalize">
                              {t.firstWeightType}
                            </Badge>
                          )}
                        </span>
                        <span>Station:</span>
                        <span className="text-foreground">{t.stationName ?? '—'}</span>
                        <span>Last activity:</span>
                        <span className="text-amber-600 font-medium">
                          {formatElapsed(t.lastWeightCapturedAt ?? t.firstWeightAt)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {needsOverride && (
                <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-xs text-destructive">
                    This transaction's last activity is outside the auto-match window.
                    {canOverride
                      ? ' Resuming it requires a reason (manual_weight_override).'
                      : ' You do not have permission to override the window — ask a supervisor.'}
                  </p>
                  {canOverride && (
                    <div className="space-y-1">
                      <Label htmlFor="override-reason" className="text-xs">Reason</Label>
                      <Textarea
                        id="override-reason"
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="e.g. Vehicle delayed at loading bay, confirmed same driver/plate"
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel asChild>
            <Button
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={onStartNew}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Start New Transaction
            </Button>
          </AlertDialogCancel>
          <Button
            onClick={handleResumeClick}
            disabled={!selected || (needsOverride && (!canOverride || !overrideReason.trim()))}
            className="sm:flex-1"
          >
            Resume — Capture Next Weight
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
