"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/weighing';
import type { WeighingTransaction } from '@/lib/api/weighing';
import { cn } from '@/lib/utils';
import { AlertTriangle, Camera, CheckCircle2, Eye, Loader2, Printer } from 'lucide-react';

interface TicketsLineViewProps {
  tickets: WeighingTransaction[];
  isLoading: boolean;
  error: Error | null;
  canRead?: boolean;
  canPrint?: boolean;
  onView?: (ticket: WeighingTransaction) => void;
  onPrint?: (ticket: WeighingTransaction) => void;
}

function getComplianceStatus(ticket: WeighingTransaction): 'LEGAL' | 'WARNING' | 'OVERLOAD' {
  if (ticket.isCompliant) return 'LEGAL';
  if (ticket.overloadKg > 2000) return 'OVERLOAD';
  return 'WARNING';
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

function TicketLineCard({ ticket, onView, onPrint, canRead, canPrint }: { ticket: WeighingTransaction; onView?: (t: WeighingTransaction) => void; onPrint?: (t: WeighingTransaction) => void; canRead?: boolean; canPrint?: boolean }) {
  const compliance = getComplianceStatus(ticket);
  const excessKg = ticket.excessKg ?? Math.max(0, ticket.overloadKg);
  const images = ticket.vehicleImageUrls ?? [];
  const thumbnail = ticket.vehicleThumbnailUrl;

  return (
    <Card
      className="border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onView?.(ticket)}
    >
      <CardContent className="p-0 flex">
        {/* Left: Images + compliance overlay */}
        <div className="w-1/3 min-h-[180px] relative bg-gray-100 flex-shrink-0">
          {/* Image grid (up to 3 images) */}
          <div className="grid grid-cols-1 h-full">
            {images.length > 0 ? (
              images.slice(0, 3).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Vehicle ${i + 1}`}
                  className="w-full h-full object-cover border-b border-gray-200 last:border-b-0"
                />
              ))
            ) : thumbnail ? (
              <img
                src={thumbnail}
                alt="ANPR"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Camera className="h-10 w-10 text-gray-300" />
              </div>
            )}
          </div>

          {/* Compliance overlay */}
          <div className="absolute bottom-2 left-2">
            {compliance === 'LEGAL' ? (
              <CheckCircle2 className="h-8 w-8 text-green-500 drop-shadow-lg" />
            ) : compliance === 'OVERLOAD' ? (
              <AlertTriangle className="h-8 w-8 text-red-500 drop-shadow-lg" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-yellow-500 drop-shadow-lg" />
            )}
          </div>
        </div>

        {/* Right: Data */}
        <div className="w-2/3 p-3 flex flex-col justify-between">
          {/* Header: Reg + Status */}
          <div className="flex items-center justify-between mb-2">
            <span className={cn(
              'inline-block px-2 py-0.5 rounded text-sm font-bold font-mono',
              compliance === 'LEGAL'
                ? 'bg-green-100 text-green-800'
                : compliance === 'OVERLOAD'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            )}>
              {ticket.vehicleRegNumber}
            </span>
            <StatusBadge status={compliance} />
          </div>

          {/* Ticket number */}
          <div className="text-xs text-gray-400 font-mono mb-2">{ticket.ticketNumber}</div>

          {/* Data grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div>
              <span className="text-gray-400">Station:</span>
              <span className="ml-1 text-gray-700">{ticket.stationCode ?? '—'}</span>
            </div>
            <div>
              <span className="text-gray-400">Date:</span>
              <span className="ml-1 text-gray-700">{formatDateTime(ticket.weighedAt)}</span>
            </div>
            <div>
              <span className="text-gray-400">Axle:</span>
              <span className="ml-1 text-gray-700">{ticket.axleConfiguration ?? '—'}</span>
            </div>
            <div>
              <span className="text-gray-400">GVW:</span>
              <span className={cn(
                'ml-1 font-mono font-bold',
                compliance === 'LEGAL' ? 'text-green-600' : compliance === 'OVERLOAD' ? 'text-red-600' : 'text-yellow-600'
              )}>
                {ticket.gvwMeasuredKg.toLocaleString()}
                <span className="text-gray-400 font-normal"> / {ticket.gvwPermissibleKg.toLocaleString()}</span>
              </span>
            </div>
            <div>
              <span className="text-gray-400">Transporter:</span>
              <span className="ml-1 text-gray-700 truncate">{ticket.transporterName ?? '—'}</span>
            </div>
            <div>
              <span className="text-gray-400">Cargo:</span>
              <span className="ml-1 text-gray-700 truncate">{ticket.cargoType ?? '—'}</span>
            </div>
            {ticket.sourceLocation && (
              <div>
                <span className="text-gray-400">Source:</span>
                <span className="ml-1 text-gray-700 truncate">{ticket.sourceLocation}</span>
              </div>
            )}
            {ticket.destinationLocation && (
              <div>
                <span className="text-gray-400">Dest:</span>
                <span className="ml-1 text-gray-700 truncate">{ticket.destinationLocation}</span>
              </div>
            )}
          </div>

          {/* Overload callout */}
          {excessKg > 0 && (
            <div className="mt-2 px-2 py-1 bg-red-50 rounded text-xs font-mono font-bold text-red-600 text-center">
              Overload: +{excessKg.toLocaleString()} kg
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-2 flex justify-end gap-1">
            {canRead && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                title="View Details"
                onClick={(e) => { e.stopPropagation(); onView?.(ticket); }}
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                View
              </Button>
            )}
            {canPrint && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                title="Print Ticket"
                onClick={(e) => { e.stopPropagation(); onPrint?.(ticket); }}
              >
                <Printer className="h-3.5 w-3.5 mr-1" />
                Print
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TicketsLineView({
  tickets,
  isLoading,
  error,
  canRead,
  canPrint,
  onView,
  onPrint,
}: TicketsLineViewProps) {
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
    <div className="space-y-3">
      {tickets.map((ticket) => (
        <TicketLineCard key={ticket.id} ticket={ticket} onView={onView} onPrint={onPrint} canRead={canRead} canPrint={canPrint} />
      ))}
    </div>
  );
}
