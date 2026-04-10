"use client";

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { WeighingTransaction } from '@/lib/api/weighing';
import { cn } from '@/lib/utils';
import { Eye, Loader2, MapPin, Printer, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';

interface TicketsListViewProps {
  tickets: WeighingTransaction[];
  isLoading: boolean;
  error: Error | null;
  canRead: boolean;
  canPrint: boolean;
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
    second: '2-digit',
  });
}

function DeckWeightCell({ measured, permissible }: { measured?: number; permissible?: number }) {
  if (!measured) return <TableCell className="text-xs text-center py-2 px-1">—</TableCell>;

  const isOverload = permissible != null && measured > permissible;
  const excess = permissible != null ? measured - permissible : 0;

  return (
    <TableCell className="text-xs text-center py-2 px-1 font-mono">
      <div className={cn(isOverload ? 'text-red-600 font-bold' : 'text-gray-900')}>
        {measured.toLocaleString()}
      </div>
      {permissible != null && (
        <div className="text-[10px] text-gray-400">({permissible.toLocaleString()})</div>
      )}
      {excess > 0 && (
        <div className="text-[10px] text-red-500 font-bold bg-red-50 rounded px-0.5">
          {excess.toLocaleString()}
        </div>
      )}
    </TableCell>
  );
}

function AxleWeightsCell({ axles }: { axles?: WeighingTransaction['weighingAxles'] }) {
  if (!axles || axles.length === 0) return <TableCell className="text-xs text-center py-2 px-1">—</TableCell>;

  return (
    <TableCell className="text-xs py-2 px-1 font-mono">
      <div className="space-y-0.5">
        {axles.map((axle) => {
          const overloaded = (axle.overloadKg ?? 0) > 0;
          return (
            <div key={axle.axleNumber} className="flex items-center gap-1">
              <span className="text-[10px] text-gray-400 w-5">A{axle.axleNumber}</span>
              <span className={cn(overloaded ? 'text-red-600 font-bold' : 'text-gray-900')}>
                {axle.measuredWeightKg.toLocaleString()}
              </span>
              <span className="text-[10px] text-gray-400">/{(axle.permissibleWeightKg ?? 0).toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </TableCell>
  );
}

function ComplianceIcon({ ticket }: { ticket: WeighingTransaction }) {
  const status = getComplianceStatus(ticket);
  const img = status === 'LEGAL'
    ? { src: '/images/weighing/greenbutton.png', alt: 'Compliant' }
    : status === 'OVERLOAD'
    ? { src: '/images/weighing/redbutton.jpg', alt: 'Overloaded' }
    : { src: '/images/weighing/tagged.png', alt: 'Warning' };

  return (
    <Image
      src={img.src}
      alt={img.alt}
      width={22}
      height={22}
      className="shrink-0"
    />
  );
}

export default function TicketsListView({
  tickets,
  isLoading,
  error,
  canRead,
  canPrint,
  onView,
  onPrint,
}: TicketsListViewProps) {
  // Determine if we should show deck columns (static/multideck) or axle columns (mobile)
  const hasDeckTickets = useMemo(
    () => tickets.some(t => t.weighingType === 'static' || t.weighingType === 'multideck'),
    [tickets]
  );
  const hasMobileTickets = useMemo(
    () => tickets.some(t => t.weighingType === 'mobile'),
    [tickets]
  );
  // Show deck columns if any static/multideck tickets exist (or if no tickets loaded yet)
  const showDeckColumns = hasDeckTickets || (!hasMobileTickets && tickets.length === 0);
  // Show axle details column if any mobile tickets exist
  const showAxleDetails = hasMobileTickets;

  const colCount = 16 + (showDeckColumns ? 4 : 0) + (showAxleDetails ? 1 : 0);

  const [mapModal, setMapModal] = useState<{ lat: number; lng: number; reg: string } | null>(null);

  return (
    <Card className="border border-gray-200 rounded-xl">
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-gray-200 bg-gray-50">
              <TableHead className="text-xs font-semibold text-gray-700 h-10 pl-3 w-8">#</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700 h-10 w-8" />
              <TableHead className="text-xs font-semibold text-gray-700 h-10 whitespace-nowrap">Ticket No.</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700 h-10 hidden md:table-cell">Station</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700 h-10 whitespace-nowrap hidden lg:table-cell">Date Time</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700 h-10">Registration</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700 h-10 hidden xl:table-cell">Coordinates</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700 h-10 whitespace-nowrap text-center hidden lg:table-cell">Time Taken (Secs)</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700 h-10 hidden xl:table-cell">Source/Dest.</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700 h-10 hidden lg:table-cell">User</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700 h-10 hidden xl:table-cell">Transporter</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700 h-10 hidden xl:table-cell">Cargo</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700 h-10 hidden md:table-cell">Axle</TableHead>
              {showDeckColumns && (
                <>
                  <TableHead className="text-xs font-semibold text-gray-700 h-10 text-center whitespace-nowrap">Deck A[KG]</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-700 h-10 text-center whitespace-nowrap">Deck B[KG]</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-700 h-10 text-center whitespace-nowrap">Deck C[KG]</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-700 h-10 text-center whitespace-nowrap">Deck D[KG]</TableHead>
                </>
              )}
              {showAxleDetails && (
                <TableHead className="text-xs font-semibold text-gray-700 h-10 whitespace-nowrap">Axle Weights</TableHead>
              )}
              <TableHead className="text-xs font-semibold text-gray-700 h-10 text-center">GVW [KG]</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700 h-10 text-center whitespace-nowrap">Excess [KG]</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700 h-10 pr-3 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center text-gray-500 py-8">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading transactions...
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center text-red-500 py-8">
                  Failed to load transactions. Please try again.
                </TableCell>
              </TableRow>
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center text-gray-500 py-8">
                  No weighing transactions found.
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket, idx) => {
                const compliance = getComplianceStatus(ticket);
                const excessKg = ticket.excessKg ?? Math.max(0, ticket.overloadKg);
                const isMobile = ticket.weighingType === 'mobile';

                return (
                  <TableRow key={ticket.id} className="hover:bg-gray-50/50 border-b border-gray-100">
                    {/* Row # */}
                    <TableCell className="text-xs text-gray-500 py-2 pl-3">{idx + 1}</TableCell>

                    {/* Compliance icon */}
                    <TableCell className="py-2 px-1">
                      <ComplianceIcon ticket={ticket} />
                    </TableCell>

                    {/* Ticket No */}
                    <TableCell className="py-2 px-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-gray-400">
                          {ticket.weighingType ? `${ticket.weighingType.charAt(0).toUpperCase() + ticket.weighingType.slice(1)}` : 'Static'}
                          {ticket.bound ? ` (${ticket.bound})` : ''}
                        </span>
                        <a href="#" className="text-xs font-mono text-blue-600 hover:underline">
                          {ticket.ticketNumber}
                        </a>
                        {ticket.reweighCycleNo > 1 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-purple-600">
                            <RotateCcw className="h-2.5 w-2.5" />R{ticket.reweighCycleNo}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Station */}
                    <TableCell className="text-xs text-gray-700 py-2 hidden md:table-cell">{ticket.stationCode ?? '—'}</TableCell>

                    {/* Date Time */}
                    <TableCell className="text-xs text-gray-600 py-2 whitespace-nowrap hidden lg:table-cell">
                      {formatDateTime(ticket.weighedAt)}
                    </TableCell>

                    {/* Registration */}
                    <TableCell className="text-xs font-mono font-semibold text-gray-900 py-2">
                      {ticket.vehicleRegNumber}
                    </TableCell>

                    {/* Coordinates */}
                    <TableCell className="text-xs py-2 hidden xl:table-cell">
                      {ticket.locationLat != null && ticket.locationLng != null ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                          onClick={() => setMapModal({ lat: ticket.locationLat!, lng: ticket.locationLng!, reg: ticket.vehicleRegNumber })}
                        >
                          <MapPin className="h-3 w-3" />
                          <span className="font-mono text-[11px]">
                            {ticket.locationLat.toFixed(5)}, {ticket.locationLng.toFixed(5)}
                          </span>
                        </button>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>

                    {/* Time Taken */}
                    <TableCell className="text-xs text-gray-600 py-2 text-center font-mono hidden lg:table-cell">
                      {ticket.timeTakenSeconds ?? '—'}
                    </TableCell>

                    {/* Source/Dest */}
                    <TableCell className="text-xs text-gray-600 py-2 hidden xl:table-cell">
                      {(ticket.sourceLocation || ticket.destinationLocation) ? (
                        <div className="space-y-0.5">
                          {ticket.sourceLocation && (
                            <div className="truncate max-w-[100px]">S: {ticket.sourceLocation}</div>
                          )}
                          {ticket.destinationLocation && (
                            <div className="truncate max-w-[100px]">D: {ticket.destinationLocation}</div>
                          )}
                        </div>
                      ) : '—'}
                    </TableCell>

                    {/* User */}
                    <TableCell className="text-xs text-gray-600 py-2 hidden lg:table-cell">
                      {ticket.weighedByUserName ?? '—'}
                    </TableCell>

                    {/* Transporter */}
                    <TableCell className="text-xs text-gray-600 py-2 hidden xl:table-cell">
                      <div className="truncate max-w-[100px]">{ticket.transporterName ?? '—'}</div>
                    </TableCell>

                    {/* Cargo */}
                    <TableCell className="text-xs text-gray-600 py-2 hidden xl:table-cell">
                      <div className="truncate max-w-[100px]">{ticket.cargoType ?? '—'}</div>
                    </TableCell>

                    {/* Axle Config */}
                    <TableCell className="text-xs text-gray-600 py-2 text-center hidden md:table-cell">
                      {ticket.axleConfiguration ?? '—'}
                    </TableCell>

                    {/* Deck A-D (only for static/multideck) */}
                    {showDeckColumns && (
                      <>
                        <DeckWeightCell measured={!isMobile ? ticket.deckAWeightKg : undefined} />
                        <DeckWeightCell measured={!isMobile ? ticket.deckBWeightKg : undefined} />
                        <DeckWeightCell measured={!isMobile ? ticket.deckCWeightKg : undefined} />
                        <DeckWeightCell measured={!isMobile ? ticket.deckDWeightKg : undefined} />
                      </>
                    )}

                    {/* Axle Weights (only for mobile) */}
                    {showAxleDetails && (
                      isMobile ? (
                        <AxleWeightsCell axles={ticket.weighingAxles} />
                      ) : (
                        <TableCell className="text-xs text-center py-2 px-1">—</TableCell>
                      )
                    )}

                    {/* GVW */}
                    <TableCell className="text-xs text-center py-2 px-1 font-mono">
                      <div className={cn(
                        'font-bold',
                        compliance === 'LEGAL' ? 'text-green-600' : compliance === 'OVERLOAD' ? 'text-red-600' : 'text-yellow-600'
                      )}>
                        {ticket.gvwMeasuredKg.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        ({ticket.gvwPermissibleKg.toLocaleString()})
                      </div>
                    </TableCell>

                    {/* Excess */}
                    <TableCell className="text-xs text-center py-2 px-1 font-mono">
                      {excessKg > 0 ? (
                        <>
                          <div className="text-red-600 font-bold">{excessKg.toLocaleString()}</div>
                          {compliance === 'OVERLOAD' && (
                            <div className="text-[10px] bg-yellow-100 text-yellow-800 rounded px-1 font-semibold mt-0.5">
                              AXLE
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-green-600">0</span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-2 pr-3 text-right">
                      <div className="flex justify-end gap-0.5">
                        {canRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="View Details"
                            onClick={() => onView?.(ticket)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canPrint && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="Print Ticket"
                            onClick={() => onPrint?.(ticket)}
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Google Maps Modal */}
      <Dialog open={mapModal !== null} onOpenChange={(open) => !open && setMapModal(null)}>
        <DialogContent className="max-w-2xl w-[90vw] p-0 gap-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="text-sm font-semibold">
              Weighing Location — {mapModal?.reg}
            </DialogTitle>
          </DialogHeader>
          {mapModal && (
            <div className="w-full h-[450px]">
              <iframe
                title="Weighing Location Map"
                className="w-full h-full rounded-b-lg"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${mapModal.lat},${mapModal.lng}&z=16&output=embed`}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
