/**
 * Portal Drivers Page
 *
 * Driver list with performance metrics.
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePortalDrivers, usePortalDriverPerformance } from '@/hooks/queries/usePortalQueries';
import type { PortalDriver } from '@/types/portal';
import { Eye, Users } from 'lucide-react';
import { useState } from 'react';

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

function DriverPerformanceDialog({
  driver,
  open,
  onOpenChange,
}: {
  driver: PortalDriver | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: perf, isLoading } = usePortalDriverPerformance(driver?.id ?? '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        {driver && (
          <>
            <DialogHeader>
              <DialogTitle>Driver Performance</DialogTitle>
              <DialogDescription>{driver.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : perf ? (
                <>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <DetailRow label="Total Trips" value={perf.totalTrips.toLocaleString()} />
                    <DetailRow
                      label="Total Net Weight"
                      value={`${perf.totalNetWeightKg.toLocaleString()} kg`}
                    />
                    <DetailRow
                      label="Avg. Turnaround"
                      value={`${perf.avgTurnaroundMinutes} min`}
                    />
                  </div>
                  {perf.tripsPerDay && perf.tripsPerDay.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Recent Activity</h4>
                      <div className="bg-gray-50 rounded-lg p-3 max-h-[200px] overflow-y-auto">
                        {perf.tripsPerDay.map((d) => (
                          <DetailRow
                            key={d.date}
                            label={new Date(d.date).toLocaleDateString('en-KE')}
                            value={`${d.count} trips`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">No performance data available.</p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function PortalDriversPage() {
  const { data: drivers, isLoading } = usePortalDrivers();
  const [selectedDriver, setSelectedDriver] = useState<PortalDriver | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Drivers</h2>
        <p className="text-sm text-gray-500">Your drivers and their performance</p>
      </div>

      <Card className="border border-gray-200 rounded-xl">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-gray-200 bg-gray-50">
                <TableHead className="text-xs font-semibold text-gray-700 h-10">Name</TableHead>
                <TableHead className="text-xs font-semibold text-gray-700 h-10 hidden md:table-cell">ID Number</TableHead>
                <TableHead className="text-xs font-semibold text-gray-700 h-10">License</TableHead>
                <TableHead className="text-xs font-semibold text-gray-700 h-10 text-right">Trips</TableHead>
                <TableHead className="text-xs font-semibold text-gray-700 h-10 text-right hidden lg:table-cell">Avg. Payload (kg)</TableHead>
                <TableHead className="text-xs font-semibold text-gray-700 h-10 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !drivers || drivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No drivers found
                  </TableCell>
                </TableRow>
              ) : (
                drivers.map((d) => (
                  <TableRow key={d.id} className="hover:bg-gray-50/50">
                    <TableCell className="text-xs font-semibold">{d.name}</TableCell>
                    <TableCell className="text-xs text-gray-600 font-mono hidden md:table-cell">{d.idNumber}</TableCell>
                    <TableCell>
                      {d.licenseValid ? (
                        <Badge variant="default" className="text-[10px]">Valid</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          {d.licenseNumber ? 'Expired' : 'N/A'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-semibold">{d.tripCount.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-right font-mono hidden lg:table-cell">{d.avgPayloadKg.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        title="View Performance"
                        onClick={() => setSelectedDriver(d)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DriverPerformanceDialog
        driver={selectedDriver}
        open={!!selectedDriver}
        onOpenChange={(open) => {
          if (!open) setSelectedDriver(null);
        }}
      />
    </div>
  );
}
