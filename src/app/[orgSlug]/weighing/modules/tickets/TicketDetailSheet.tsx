"use client";

import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { WeighingTransaction } from '@/lib/api/weighing';
import { cn } from '@/lib/utils';
import { Printer } from 'lucide-react';

interface TicketDetailSheetProps {
  ticket: WeighingTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrint?: (ticket: WeighingTransaction) => void;
  canPrint?: boolean;
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
    <div className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

export default function TicketDetailSheet({
  ticket,
  open,
  onOpenChange,
  onPrint,
  canPrint,
}: TicketDetailSheetProps) {
  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Weight Ticket #{ticket.ticketNumber}</DialogTitle>
              <DialogDescription>
                {ticket.vehicleRegNumber} &mdash; {formatDateTime(ticket.weighedAt)}
              </DialogDescription>
            </div>
            {canPrint && onPrint && (
              <Button variant="outline" size="sm" onClick={() => onPrint(ticket)}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* Compliance Status */}
          <div className="flex items-center gap-3">
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

          {/* Vehicle & Weighing */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Vehicle & Weighing</h4>
            <div className="bg-gray-50 rounded-lg p-3">
              <DetailRow label="Vehicle Registration" value={ticket.vehicleRegNumber} />
              <DetailRow label="Vehicle Make" value={ticket.vehicleMake} />
              <DetailRow label="Vehicle Type" value={ticket.vehicleType} />
              <DetailRow label="Axle Configuration" value={ticket.axleConfiguration} />
              <DetailRow label="Weighing Type" value={ticket.weighingType} />
              <DetailRow label="Bound" value={ticket.bound} />
              <DetailRow label="GVW Measured" value={formatWeight(ticket.gvwMeasuredKg)} />
              <DetailRow label="GVW Permissible" value={formatWeight(ticket.gvwPermissibleKg)} />
              <DetailRow label="Overload" value={ticket.overloadKg > 0 ? formatWeight(ticket.overloadKg) : 'None'} />
              {ticket.totalFeeUsd > 0 && (
                <DetailRow label="Fee (KES)" value={`KES ${ticket.totalFeeUsd.toLocaleString()}`} />
              )}
            </div>
          </div>

          {/* Axle Weights */}
          {ticket.weighingAxles && ticket.weighingAxles.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Axle Weights</h4>
              <div className="bg-gray-50 rounded-lg p-3">
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
              </div>
            </div>
          )}

          {/* People & Route */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">People & Route</h4>
            <div className="bg-gray-50 rounded-lg p-3">
              <DetailRow label="Driver" value={ticket.driverName} />
              <DetailRow label="Transporter" value={ticket.transporterName} />
              <DetailRow label="Origin" value={ticket.sourceLocation} />
              <DetailRow label="Destination" value={ticket.destinationLocation} />
              <DetailRow label="Cargo" value={ticket.cargoType || ticket.cargoDescription} />
              <DetailRow label="Permit" value={ticket.hasPermit ? (ticket.permitNumber || 'Yes') : 'No'} />
            </div>
          </div>

          {/* Station & Officer */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Station & Officer</h4>
            <div className="bg-gray-50 rounded-lg p-3">
              <DetailRow label="Station" value={ticket.stationName} />
              <DetailRow label="Station Code" value={ticket.stationCode} />
              <DetailRow label="Weighed By" value={ticket.weighedByUserName} />
              <DetailRow label="Weighed At" value={formatDateTime(ticket.weighedAt)} />
              <DetailRow label="Capture Source" value={ticket.captureSource} />
              <DetailRow label="Reweigh Cycle" value={ticket.reweighCycleNo > 0 ? `#${ticket.reweighCycleNo}` : undefined} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
