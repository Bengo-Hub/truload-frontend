"use client";

import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from '@/components/ui/sheet';
import type { WeighingTransaction } from '@/lib/api/weighing';
import { formatFee } from '@/lib/weighing-utils';
import { cn } from '@/lib/utils';
import { Printer } from 'lucide-react';

interface TicketDetailSheetProps {
  ticket: WeighingTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrint?: (ticket: WeighingTransaction) => void;
  canPrint?: boolean;
  isCommercial?: boolean;
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-KE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatWeight(kg: number) {
  return `${kg.toLocaleString()} kg`;
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === 'LEGAL' || status === 'Compliant'
    ? 'default'
    : status === 'WARNING' || status === 'Warning'
    ? 'secondary'
    : 'destructive';

  return <Badge variant={variant}>{status}</Badge>;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{title}</h4>
      <div className="bg-gray-50 rounded-lg px-3">{children}</div>
    </div>
  );
}

export default function TicketDetailSheet({
  ticket,
  open,
  onOpenChange,
  onPrint,
  canPrint,
  isCommercial = false,
}: TicketDetailSheetProps) {
  if (!ticket) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="truncate">Ticket #{ticket.ticketNumber}</SheetTitle>
              <SheetDescription>
                {ticket.vehicleRegNumber} &mdash; {formatDateTime(ticket.weighedAt)}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <SheetBody className="space-y-5">
          {/* Compliance Status (enforcement) */}
          {!isCommercial && (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50">
              <Image
                src={ticket.isCompliant
                  ? '/images/weighing/greenbutton.png'
                  : ticket.overloadKg > 2000
                  ? '/images/weighing/redbutton.jpg'
                  : '/images/weighing/tagged.png'
                }
                alt={ticket.isCompliant ? 'Compliant' : 'Non-compliant'}
                width={36}
                height={36}
                className="shrink-0"
              />
              <div>
                <StatusBadge status={ticket.controlStatus} />
                {ticket.isCompliant && (
                  <p className="text-sm text-green-600 font-medium mt-0.5">Vehicle is compliant</p>
                )}
                {!ticket.isCompliant && ticket.overloadKg > 0 && (
                  <p className="text-sm text-red-600 font-medium mt-0.5">
                    Overloaded by {formatWeight(ticket.overloadKg)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Commercial Weight Summary */}
          {isCommercial && (
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-3">Weight Summary</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-500">Tare</p>
                  <p className="text-lg font-bold text-gray-900">{formatWeight(ticket.tareWeightKg ?? 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Gross</p>
                  <p className="text-lg font-bold text-gray-900">{formatWeight(ticket.gvwMeasuredKg)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Net</p>
                  <p className="text-lg font-bold text-blue-700">{formatWeight(ticket.gvwMeasuredKg - (ticket.tareWeightKg ?? 0))}</p>
                </div>
              </div>
            </div>
          )}

          {/* Vehicle & Weighing */}
          <SectionCard title={isCommercial ? 'Vehicle Details' : 'Vehicle & Weighing'}>
            <DetailRow label="Vehicle Registration" value={ticket.vehicleRegNumber} />
            <DetailRow label="Vehicle Make" value={ticket.vehicleMake} />
            <DetailRow label="Vehicle Type" value={ticket.vehicleType} />
            {!isCommercial && <DetailRow label="Axle Configuration" value={ticket.axleConfiguration} />}
            <DetailRow label="Weighing Type" value={ticket.weighingType} />
            {!isCommercial && <DetailRow label="Bound" value={ticket.bound} />}
            {!isCommercial && (
              <>
                <DetailRow label="GVW Measured" value={formatWeight(ticket.gvwMeasuredKg)} />
                <DetailRow label="GVW Permissible" value={formatWeight(ticket.gvwPermissibleKg)} />
                <DetailRow label="Overload" value={ticket.overloadKg > 0 ? formatWeight(ticket.overloadKg) : 'None'} />
              </>
            )}
            {isCommercial && <DetailRow label="Consignment" value={ticket.consignmentNumber} />}
            {(ticket.totalFeeUsd > 0 || (ticket.totalFeeKes ?? 0) > 0) && (
              <DetailRow
                label={`Fee (${ticket.chargingCurrency || 'USD'})`}
                value={formatFee(ticket.totalFeeUsd, ticket.totalFeeKes, ticket.chargingCurrency)}
              />
            )}
          </SectionCard>

          {/* Axle Weights (enforcement) */}
          {!isCommercial && ticket.weighingAxles && ticket.weighingAxles.length > 0 && (
            <SectionCard title="Axle Weights">
              {ticket.weighingAxles.map((axle, idx) => {
                const overloaded = (axle.overloadKg ?? 0) > 0;
                return (
                  <DetailRow
                    key={idx}
                    label={`Axle ${axle.axleNumber ?? idx + 1}`}
                    value={
                      <span className={cn(overloaded && 'text-red-600 font-semibold')}>
                        {formatWeight(axle.measuredWeightKg)}
                        {axle.permissibleWeightKg ? ` / ${formatWeight(axle.permissibleWeightKg)}` : ''}
                        {overloaded && ` (+${formatWeight(axle.overloadKg!)})`}
                      </span>
                    }
                  />
                );
              })}
            </SectionCard>
          )}

          {/* People & Route */}
          <SectionCard title="People & Route">
            <DetailRow label="Driver" value={ticket.driverName} />
            <DetailRow label="Transporter" value={ticket.transporterName} />
            <DetailRow label="Origin" value={ticket.sourceLocation} />
            <DetailRow label="Destination" value={ticket.destinationLocation} />
            <DetailRow label="Cargo" value={ticket.cargoType || ticket.cargoDescription} />
            <DetailRow label="Permit" value={ticket.hasPermit ? (ticket.permitNumber || 'Yes') : 'No'} />
          </SectionCard>

          {/* Station & Officer */}
          <SectionCard title="Station & Officer">
            <DetailRow label="Station" value={ticket.stationName} />
            <DetailRow label="Station Code" value={ticket.stationCode} />
            <DetailRow label="Weighed By" value={ticket.weighedByUserName} />
            <DetailRow label="Weighed At" value={formatDateTime(ticket.weighedAt)} />
            <DetailRow label="Capture Source" value={ticket.captureSource} />
            <DetailRow label="Reweigh Cycle" value={ticket.reweighCycleNo > 0 ? `#${ticket.reweighCycleNo}` : undefined} />
          </SectionCard>
        </SheetBody>

        {canPrint && onPrint && (
          <SheetFooter>
            <Button variant="outline" onClick={() => onPrint(ticket)}>
              <Printer className="h-4 w-4 mr-2" />
              Print Ticket
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
