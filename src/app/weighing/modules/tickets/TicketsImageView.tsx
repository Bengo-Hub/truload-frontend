"use client";

import { Card, CardContent } from '@/components/ui/card';
import type { WeighingTransaction } from '@/lib/api/weighing';
import { cn } from '@/lib/utils';
import { AlertTriangle, Camera, CheckCircle2, Loader2 } from 'lucide-react';

interface TicketsImageViewProps {
  tickets: WeighingTransaction[];
  isLoading: boolean;
  error: Error | null;
  onView?: (ticket: WeighingTransaction) => void;
}

function getComplianceStatus(ticket: WeighingTransaction): 'LEGAL' | 'WARNING' | 'OVERLOAD' {
  if (ticket.isCompliant) return 'LEGAL';
  if (ticket.overloadKg > 2000) return 'OVERLOAD';
  return 'WARNING';
}

function ComplianceIndicator({ ticket }: { ticket: WeighingTransaction }) {
  const status = getComplianceStatus(ticket);
  if (status === 'LEGAL') {
    return <CheckCircle2 className="h-6 w-6 text-green-500 drop-shadow" />;
  }
  if (status === 'OVERLOAD') {
    return <AlertTriangle className="h-6 w-6 text-red-500 drop-shadow" />;
  }
  return <AlertTriangle className="h-6 w-6 text-yellow-500 drop-shadow" />;
}

function TicketImageCard({ ticket, onView }: { ticket: WeighingTransaction; onView?: (t: WeighingTransaction) => void }) {
  const compliance = getComplianceStatus(ticket);
  const excessKg = ticket.excessKg ?? Math.max(0, ticket.overloadKg);

  return (
    <Card
      className="border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onView?.(ticket)}
    >
      <CardContent className="p-0">
        {/* Ticket number header */}
        <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <span className="text-[10px] font-mono text-gray-500 truncate">{ticket.ticketNumber}</span>
          <ComplianceIndicator ticket={ticket} />
        </div>

        {/* Registration badge */}
        <div className="px-3 pt-2">
          <span className={cn(
            'inline-block px-2 py-0.5 rounded text-xs font-bold font-mono',
            compliance === 'LEGAL'
              ? 'bg-green-100 text-green-800'
              : compliance === 'OVERLOAD'
              ? 'bg-red-100 text-red-800'
              : 'bg-yellow-100 text-yellow-800'
          )}>
            {ticket.vehicleRegNumber}
          </span>
        </div>

        {/* ANPR Photo */}
        <div className="px-3 py-2">
          {ticket.vehicleThumbnailUrl ? (
            <img
              src={ticket.vehicleThumbnailUrl}
              alt={`ANPR - ${ticket.vehicleRegNumber}`}
              className="w-full h-28 object-cover rounded border border-gray-200"
            />
          ) : (
            <div className="w-full h-28 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
              <Camera className="h-8 w-8 text-gray-300" />
            </div>
          )}
        </div>

        {/* Weight info */}
        <div className="px-3 pb-3 space-y-1">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] text-gray-500">GVW:</span>
            <span className={cn(
              'text-xs font-mono font-bold',
              compliance === 'LEGAL' ? 'text-green-600' : compliance === 'OVERLOAD' ? 'text-red-600' : 'text-yellow-600'
            )}>
              {ticket.gvwMeasuredKg.toLocaleString()}
              <span className="text-[10px] text-gray-400 font-normal ml-0.5">
                / {ticket.gvwPermissibleKg.toLocaleString()}
              </span>
            </span>
          </div>

          {excessKg > 0 && (
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] text-gray-500">Excess:</span>
              <span className="text-xs font-mono font-bold text-red-600">
                +{excessKg.toLocaleString()} kg
              </span>
            </div>
          )}

          <div className="flex items-baseline justify-between">
            <span className="text-[10px] text-gray-500">Station:</span>
            <span className="text-[10px] text-gray-700">{ticket.stationCode ?? '—'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TicketsImageView({
  tickets,
  isLoading,
  error,
  onView,
}: TicketsImageViewProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading transactions...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-12">
        Failed to load transactions. Please try again.
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12">
        No weighing transactions found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
      {tickets.map((ticket) => (
        <TicketImageCard key={ticket.id} ticket={ticket} onView={onView} />
      ))}
    </div>
  );
}
