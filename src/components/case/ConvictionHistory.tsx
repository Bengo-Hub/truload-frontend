'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { Skeleton } from '@/components/ui/skeleton';
import { useConvictionHistory } from '@/hooks/queries';
import { useCurrency } from '@/hooks/useCurrency';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import type { ConvictionRecordDto } from '@/lib/api/prosecution';
import { AlertTriangle, Eye, Gavel, Scale } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface ConvictionHistoryProps {
  vehicleId?: string;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/**
 * Conviction history for a vehicle, rendered as an overflow-safe responsive table
 * (cards on mobile) with a per-row "View details" modal. Color-coded badge by count;
 * habitual-offender flag when 3+.
 */
export function ConvictionHistory({ vehicleId }: ConvictionHistoryProps) {
  const { data: convictions, isLoading } = useConvictionHistory(vehicleId);
  const { formatAmount } = useCurrency();
  const orgSlug = useOrgSlug();
  const [selected, setSelected] = useState<ConvictionRecordDto | null>(null);

  if (!vehicleId) return null;

  const header = (
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gavel className="h-4 w-4 text-gray-500" />
          Conviction History
        </CardTitle>
        {(convictions?.length ?? 0) >= 3 && (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Habitual Offender
          </Badge>
        )}
      </div>
      {convictions && convictions.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {convictions[0].vehicleRegNumber} &mdash; {convictions.length}{' '}
          {convictions.length === 1 ? 'conviction' : 'convictions'}
        </p>
      )}
    </CardHeader>
  );

  if (isLoading) {
    return (
      <Card>
        {header}
        <CardContent className="space-y-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-9 w-full rounded" />)}
        </CardContent>
      </Card>
    );
  }

  if (!convictions || convictions.length === 0) {
    return (
      <Card>
        {header}
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
      {header}
      <CardContent className="space-y-3">
        <ResponsiveTable<ConvictionRecordDto>
          data={convictions}
          keyExtractor={(c) => c.prosecutionCaseId}
          columns={[
            { key: 'no', header: '#', primary: true, render: (c) => ordinal(c.convictionNumber) },
            { key: 'date', header: 'Date', render: (c) => fmtDate(c.convictionDate) },
            { key: 'case', header: 'Case', render: (c) => <span className="font-mono">{c.caseNo}</span> },
            { key: 'overload', header: 'Overload', align: 'right', render: (c) => <span className="font-mono text-red-600">+{c.overloadKg.toLocaleString()} kg</span> },
            { key: 'fine', header: 'Fine (KES)', align: 'right', hideTablet: true, render: (c) => <span className="font-mono">{formatAmount(c.chargeAmountKes, 'KES')}</span> },
            { key: 'status', header: 'Status', render: (c) => <Badge variant="outline" className="text-xs">{c.status}</Badge> },
          ]}
          actionsRenderer={(c) => (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelected(c)} title="View details">
              <Eye className="h-4 w-4" />
            </Button>
          )}
        />
        {convictions.length >= 3 && (
          <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm">
            <Link href={`/${orgSlug}/reporting/habitual-offenders`} className="font-medium text-primary hover:underline">
              View full history in the Habitual Offenders report
            </Link>
          </div>
        )}
      </CardContent>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-gray-500" />
              {selected && `${ordinal(selected.convictionNumber)} Conviction`}
            </DialogTitle>
            <DialogDescription>{selected?.vehicleRegNumber} · {selected && fmtDate(selected.convictionDate)}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Field label="Case No" value={<span className="font-mono">{selected.caseNo}</span>} />
              <Field label="Status" value={<Badge variant="outline">{selected.status}</Badge>} />
              <Field label="Overload" value={<span className="font-mono text-red-600">+{selected.overloadKg.toLocaleString()} kg</span>} />
              <Field label="Legal Framework" value={selected.legalFramework} />
              <Field label="Fine (KES)" value={<span className="font-mono">{formatAmount(selected.chargeAmountKes, 'KES')}</span>} />
              <Field label="Fine (USD)" value={<span className="font-mono">{formatAmount(selected.chargeAmountUsd, 'USD')}</span>} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
