/**
 * Portal Statement Page
 *
 * Live AR statement from treasury-api: outstanding balance, invoice/payment history.
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePortalStatement } from '@/hooks/queries/usePortalQueries';
import { Info, Receipt } from 'lucide-react';

function formatKes(amount: number) {
  return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PortalStatementPage() {
  const { data: statement, isLoading } = usePortalStatement();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Statement</h2>
          <p className="text-sm text-gray-500">Your account balance and billing history</p>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!statement?.isLinked) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Statement</h2>
          <p className="text-sm text-gray-500">Your account balance and billing history</p>
        </div>
        <Card className="border-blue-100 bg-blue-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">No billing history yet</p>
                <p>
                  Your statement will appear here once you have completed a commercial weighing
                  session that resulted in an invoice.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Statement</h2>
        <p className="text-sm text-gray-500">
          {statement.customerName ?? 'Your account'} — {new Date(statement.from).toLocaleDateString('en-KE')} to{' '}
          {new Date(statement.to).toLocaleDateString('en-KE')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Invoiced</p>
            <p className="text-xl font-semibold">{formatKes(statement.totalInvoiced)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Paid</p>
            <p className="text-xl font-semibold">{formatKes(statement.totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className={statement.closingBalance > 0 ? 'border-amber-200 bg-amber-50' : undefined}>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Outstanding Balance</p>
            <p className="text-xl font-semibold">{formatKes(statement.closingBalance)}</p>
          </CardContent>
        </Card>
      </div>

      {statement.onAccountBilling && (
        <Card className="border-blue-100 bg-blue-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Billed on account</p>
                <p>
                  Weighing fees settle later instead of collecting payment immediately.
                  {statement.creditLimitKes
                    ? ` Credit limit: ${formatKes(statement.creditLimitKes)}.`
                    : ' No credit limit set.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Transaction History
          </CardTitle>
          <CardDescription>
            {statement.lines.length} entr{statement.lines.length !== 1 ? 'ies' : 'y'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statement.lines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No transactions in this period.
                  </TableCell>
                </TableRow>
              )}
              {statement.lines.map((line, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-sm">{new Date(line.date).toLocaleDateString('en-KE')}</TableCell>
                  <TableCell className="text-sm">{line.docType}</TableCell>
                  <TableCell className="text-sm font-mono">{line.reference}</TableCell>
                  <TableCell className="text-right text-sm">{line.debit > 0 ? formatKes(line.debit) : '—'}</TableCell>
                  <TableCell className="text-right text-sm">{line.credit > 0 ? formatKes(line.credit) : '—'}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{formatKes(line.balance)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize text-[10px]">{line.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
