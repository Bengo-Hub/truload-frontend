'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useConvictionHistory } from '@/hooks/queries';
import { useCurrency } from '@/hooks/useCurrency';
import { Gavel, Scale, AlertTriangle } from 'lucide-react';
import type { ConvictionRecordDto } from '@/lib/api/prosecution';

interface ConvictionHistoryProps {
  vehicleId?: string;
}

function getOrdinalLabel(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]}`;
}

function getConvictionColor(n: number): {
  bg: string;
  text: string;
  border: string;
  dot: string;
  line: string;
} {
  if (n === 1)
    return {
      bg: 'bg-green-50',
      text: 'text-green-800',
      border: 'border-green-200',
      dot: 'bg-green-500',
      line: 'bg-green-200',
    };
  if (n === 2)
    return {
      bg: 'bg-yellow-50',
      text: 'text-yellow-800',
      border: 'border-yellow-200',
      dot: 'bg-yellow-500',
      line: 'bg-yellow-200',
    };
  return {
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
    dot: 'bg-red-500',
    line: 'bg-red-200',
  };
}

function ConvictionStep({
  record,
  isLast,
  formatCurrency,
}: {
  record: ConvictionRecordDto;
  isLast: boolean;
  formatCurrency: (v: number, c: string) => string;
}) {
  const colors = getConvictionColor(record.convictionNumber);
  const date = new Date(record.convictionDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="relative flex gap-4">
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${colors.dot} text-white shrink-0 z-10`}
        >
          {record.convictionNumber}
        </div>
        {!isLast && <div className={`w-0.5 flex-1 min-h-[16px] ${colors.line}`} />}
      </div>

      {/* Content */}
      <div className={`flex-1 rounded-lg border p-3 mb-3 ${colors.bg} ${colors.border}`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Badge className={`${colors.bg} ${colors.text} border ${colors.border} text-xs`}>
              {getOrdinalLabel(record.convictionNumber)} Conviction
            </Badge>
            <Badge variant="outline" className="text-xs">
              {record.status}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">{date}</span>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div>
            <span className="text-muted-foreground">Case:</span>{' '}
            <span className="font-mono font-medium">{record.caseNo}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Overload:</span>{' '}
            <span className="font-mono font-semibold text-red-600">
              +{record.overloadKg.toLocaleString()} kg
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Fine (KES):</span>{' '}
            <span className="font-mono">{formatCurrency(record.chargeAmountKes, 'KES')}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Fine (USD):</span>{' '}
            <span className="font-mono">{formatCurrency(record.chargeAmountUsd, 'USD')}</span>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Legal Framework:</span>{' '}
            <span className="font-medium">{record.legalFramework}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Conviction History Ladder Display
 *
 * Vertical timeline showing all convictions for a vehicle,
 * color-coded: green (1st), yellow (2nd), red (3rd+).
 */
export function ConvictionHistory({ vehicleId }: ConvictionHistoryProps) {
  const { data: convictions, isLoading } = useConvictionHistory(vehicleId);
  const { formatAmount } = useCurrency();

  if (!vehicleId) return null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gavel className="h-4 w-4 text-gray-500" />
            Conviction History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <Skeleton className="h-24 flex-1 rounded-lg" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!convictions || convictions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gavel className="h-4 w-4 text-gray-500" />
            Conviction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Scale className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No prior convictions found for this vehicle.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gavel className="h-4 w-4 text-gray-500" />
            Conviction History
          </CardTitle>
          {convictions.length >= 3 && (
            <Badge className="bg-red-100 text-red-800 border-red-200">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Habitual Offender
            </Badge>
          )}
        </div>
        {convictions.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {convictions[0].vehicleRegNumber} &mdash; {convictions.length}{' '}
            {convictions.length === 1 ? 'conviction' : 'convictions'}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col">
          {convictions.map((record, index) => (
            <ConvictionStep
              key={record.prosecutionCaseId}
              record={record}
              isLast={index === convictions.length - 1}
              formatCurrency={formatAmount}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
