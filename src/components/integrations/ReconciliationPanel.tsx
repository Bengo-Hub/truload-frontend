'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowDownUp, CheckCircle2, Loader2, RefreshCcw } from 'lucide-react';
import type { ReconcileResult } from '@/lib/api/integration';

interface ReconciliationPanelProps {
  onReconcile: () => Promise<ReconcileResult>;
  disabled?: boolean;
  className?: string;
}

export function ReconciliationPanel({ onReconcile, disabled, className }: ReconciliationPanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ReconcileResult | null>(null);

  const handleReconcile = async () => {
    setIsRunning(true);
    setResult(null);
    try {
      const res = await onReconcile();
      setResult(res);
    } catch {
      setResult({ reconciled: 0, message: 'Reconciliation failed. Please try again.' });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className={`p-4 space-y-3 ${className ?? ''}`}>
      <div className="flex items-center gap-2">
        <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-medium text-gray-900">Payment Reconciliation</h4>
      </div>
      <p className="text-xs text-muted-foreground">
        Reconcile pending invoices with Pesaflow to detect missed webhook payments
        and update local records.
      </p>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleReconcile}
          disabled={disabled || isRunning}
          className="gap-1.5"
        >
          {isRunning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCcw className="h-3.5 w-3.5" />
          )}
          {isRunning ? 'Reconciling...' : 'Run Reconciliation'}
        </Button>

        {result && (
          <div className="flex items-center gap-1.5 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-gray-700">
              {result.reconciled > 0
                ? `${result.reconciled} invoice${result.reconciled !== 1 ? 's' : ''} reconciled`
                : result.message}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
