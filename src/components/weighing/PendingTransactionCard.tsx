"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WeighingTransaction } from '@/lib/api/weighing';
import { cn } from '@/lib/utils';
import { Clock, Play, Truck } from 'lucide-react';

interface PendingTransactionCardProps {
  transactions: WeighingTransaction[];
  onResume: (transaction: WeighingTransaction) => void;
  onDiscard?: (transaction: WeighingTransaction) => void;
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
  onDiscard,
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
    <Card className={cn('border-amber-200 bg-amber-50/20 shadow-sm', className)}>
      <CardHeader className="pb-2 px-4 pt-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold text-amber-900 flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-600" />
          Pending Transactions ({transactions.length})
        </CardTitle>
        <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
          Incomplete
        </span>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
          {transactions.map((txn) => (
            <div
              key={txn.id}
              className="flex items-center justify-between gap-3 p-2.5 bg-white rounded-lg border border-amber-100/50 hover:border-amber-200 transition-all shadow-sm group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-100 transition-colors">
                  <Truck className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-mono font-bold text-sm text-gray-900 tracking-tight truncate">
                    {txn.vehicleRegNumber}
                  </p>
                  <p className="text-[10px] text-gray-500 font-medium">
                    {txn.ticketNumber} &middot; {getRelativeTime(txn.weighedAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {onDiscard && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 text-[11px] font-medium"
                    onClick={() => onDiscard(txn)}
                  >
                    Discard
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-amber-700 border-amber-200 hover:bg-amber-50 hover:border-amber-300 shadow-sm text-[11px] font-bold"
                  onClick={() => onResume(txn)}
                >
                  <Play className="mr-1.5 h-3 w-3 fill-current" />
                  Resume
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default PendingTransactionCard;
