"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WeighingTransaction } from '@/lib/api/weighing';
import { cn } from '@/lib/utils';
import { Clock, Play, Truck } from 'lucide-react';

interface PendingTransactionCardProps {
  transactions: WeighingTransaction[];
  onResume: (transaction: WeighingTransaction) => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * PendingTransactionCard - Shows pending/incomplete weighing transactions
 *
 * Displayed in the Capture step to allow resuming interrupted weighing sessions.
 * Shows vehicle plate, ticket number, and relative time since started.
 */
export function PendingTransactionCard({
  transactions,
  onResume,
  isLoading = false,
  className,
}: PendingTransactionCardProps) {
  if (isLoading || transactions.length === 0) return null;

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <Card className={cn('border-amber-200 bg-amber-50/50', className)}>
      <CardHeader className="pb-2 px-4 pt-3">
        <CardTitle className="text-sm font-medium text-amber-800 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Pending Transactions ({transactions.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="space-y-2">
          {transactions.slice(0, 5).map((txn) => (
            <div
              key={txn.id}
              className="flex items-center justify-between gap-3 p-2 bg-white rounded-lg border border-amber-100"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Truck className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-mono font-semibold text-sm truncate">
                    {txn.vehicleRegNumber}
                  </p>
                  <p className="text-xs text-gray-500">
                    {txn.ticketNumber} &middot; {getRelativeTime(txn.weighedAt)}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="flex-shrink-0 text-amber-700 border-amber-300 hover:bg-amber-100"
                onClick={() => onResume(txn)}
              >
                <Play className="mr-1 h-3 w-3" />
                Resume
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default PendingTransactionCard;
