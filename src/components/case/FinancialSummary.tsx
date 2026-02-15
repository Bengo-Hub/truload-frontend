'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvoicesByProsecutionId, useReceiptsByInvoiceId } from '@/hooks/queries';
import { useCurrency } from '@/hooks/useCurrency';
import {
  Banknote,
  Clock,
  FileText,
  Receipt,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

interface FinancialSummaryProps {
  prosecutionId?: string;
  className?: string;
}

/**
 * Reusable financial summary component for prosecution case detail.
 * Uses the same query keys as the dashboard to leverage TanStack Query's
 * shared cache - no duplicate API calls when the dashboard is also mounted.
 */
export function FinancialSummary({ prosecutionId, className }: FinancialSummaryProps) {
  // Prosecution-specific invoice data
  const { data: invoices = [], isLoading: invoicesLoading } =
    useInvoicesByProsecutionId(prosecutionId);

  // Get receipts for the primary invoice
  const primaryInvoice = invoices.find((i) => i.status === 'pending') || invoices[0];
  const { data: receipts = [] } = useReceiptsByInvoiceId(primaryInvoice?.id);

  // Compute prosecution-level financial stats from local data (no extra API calls)
  const totalDue = invoices.reduce((sum, inv) => sum + inv.amountDue, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
  const totalBalance = invoices.reduce((sum, inv) => sum + inv.balanceRemaining, 0);
  const _pendingCount = invoices.filter((i) => i.status === 'pending').length;
  const paidCount = invoices.filter((i) => i.status === 'paid').length;
  const overdueCount = invoices.filter(
    (i) => i.status === 'pending' && i.dueDate && new Date(i.dueDate) < new Date()
  ).length;
  const collectionRate = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;

  // Payment method breakdown from receipts
  const paymentBreakdown = receipts.reduce<Record<string, number>>((acc, r) => {
    const method = r.paymentMethod || 'unknown';
    acc[method] = (acc[method] || 0) + r.amountPaid;
    return acc;
  }, {});

  const { formatAmount: formatCurrency } = useCurrency();
  const primaryCurrency = invoices[0]?.currency || 'KES';

  if (!prosecutionId) return null;

  if (invoicesLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (invoices.length === 0) return null;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Banknote className="h-4 w-4 text-emerald-600" />
          Financial Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-1.5 mb-1">
              <FileText className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-xs text-blue-700 font-medium">Total Due</span>
            </div>
            <p className="text-lg font-bold text-blue-900">{formatCurrency(totalDue, primaryCurrency)}</p>
            <p className="text-[10px] text-blue-600">
              {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Receipt className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs text-emerald-700 font-medium">Total Paid</span>
            </div>
            <p className="text-lg font-bold text-emerald-900">{formatCurrency(totalPaid, primaryCurrency)}</p>
            <p className="text-[10px] text-emerald-600">
              {paidCount} paid, {receipts.length} receipt{receipts.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className={`p-3 rounded-lg border ${totalBalance > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="h-3.5 w-3.5 text-red-600" />
              <span className={`text-xs font-medium ${totalBalance > 0 ? 'text-red-700' : 'text-gray-600'}`}>
                Outstanding
              </span>
            </div>
            <p className={`text-lg font-bold ${totalBalance > 0 ? 'text-red-900' : 'text-gray-900'}`}>
              {formatCurrency(totalBalance, primaryCurrency)}
            </p>
            {overdueCount > 0 && (
              <div className="flex items-center gap-1 mt-0.5">
                <AlertTriangle className="h-3 w-3 text-red-500" />
                <span className="text-[10px] text-red-600">{overdueCount} overdue</span>
              </div>
            )}
          </div>

          <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-purple-600" />
              <span className="text-xs text-purple-700 font-medium">Collection</span>
            </div>
            <p className="text-lg font-bold text-purple-900">{collectionRate.toFixed(0)}%</p>
            <div className="w-full bg-purple-200 rounded-full h-1.5 mt-1">
              <div
                className="bg-purple-600 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(collectionRate, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Payment Method Breakdown */}
        {Object.keys(paymentBreakdown).length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">Payment Methods</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(paymentBreakdown).map(([method, amount]) => (
                <Badge
                  key={method}
                  variant="outline"
                  className="text-xs gap-1 py-1"
                >
                  <span className="capitalize">{method.replace(/_/g, ' ')}</span>
                  <span className="font-mono font-semibold">{formatCurrency(amount, primaryCurrency)}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
