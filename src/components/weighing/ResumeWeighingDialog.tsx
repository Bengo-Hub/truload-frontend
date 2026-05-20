"use client";

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
import type { CommercialWeighingResult } from '@/types/weighing';
import { formatWeight } from '@/lib/weighing-utils';
import { Clock, RotateCcw, Truck } from 'lucide-react';

interface ResumeWeighingDialogProps {
  open: boolean;
  transactions: CommercialWeighingResult[];
  onResume: (transaction: CommercialWeighingResult) => void;
  onStartNew: () => void;
}

function formatElapsed(firstWeightAt?: string): string {
  if (!firstWeightAt) return 'Unknown';
  const diffMs = Date.now() - new Date(firstWeightAt).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  const mins = Math.floor((diffMs % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${mins}m ago`;
  return `${mins}m ago`;
}

export function ResumeWeighingDialog({ open, transactions, onResume, onStartNew }: ResumeWeighingDialogProps) {
  const primary = transactions[0];

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Open Weighing Found
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This vehicle has an open first-weight transaction. Do you want to resume it for the second
                weight pass, or start a new transaction?
              </p>
              {primary && (
                <div className="rounded-md border bg-muted/30 p-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">{primary.vehicleRegNumber}</span>
                    {primary.ticketNumber && (
                      <Badge variant="outline" className="ml-auto font-mono text-xs">
                        {primary.ticketNumber}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                    <span>First weight:</span>
                    <span className="text-foreground font-medium">
                      {primary.firstWeightKg != null ? `${formatWeight(primary.firstWeightKg)} kg` : '—'}
                      {primary.firstWeightType && (
                        <Badge variant="secondary" className="ml-1 text-xs capitalize">
                          {primary.firstWeightType}
                        </Badge>
                      )}
                    </span>
                    <span>Station:</span>
                    <span className="text-foreground">{primary.stationName ?? '—'}</span>
                    <span>Captured:</span>
                    <span className="text-amber-600 font-medium">{formatElapsed(primary.firstWeightAt)}</span>
                  </div>
                </div>
              )}
              {transactions.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  +{transactions.length - 1} more open transaction(s) — the most recent is shown above.
                </p>
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
            onClick={() => primary && onResume(primary)}
            disabled={!primary}
            className="sm:flex-1"
          >
            Resume — Capture Second Weight
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
