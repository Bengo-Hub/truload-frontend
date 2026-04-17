/**
 * Portal Vehicles Page
 *
 * Transporter's vehicle fleet with tare weights, trip counts, and weight trend charts.
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChartWrapper } from '@/components/charts';
import { usePortalVehicles, usePortalVehicleTrends } from '@/hooks/queries/usePortalQueries';
import type { PortalVehicle } from '@/types/portal';
import { Eye, Truck } from 'lucide-react';
import { useState } from 'react';

function VehicleTrendDialog({
  vehicle,
  open,
  onOpenChange,
}: {
  vehicle: PortalVehicle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: trends, isLoading } = usePortalVehicleTrends(vehicle?.id ?? '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        {vehicle && (
          <>
            <DialogHeader>
              <DialogTitle>Weight Trends - {vehicle.registrationNumber}</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <ChartWrapper
                title="Net Weight Over Time"
                subtitle={`Weight trend for ${vehicle.registrationNumber}`}
                data={trends ?? []}
                series={[
                  { dataKey: 'netWeightKg', name: 'Net Weight (kg)', color: '#3b82f6' },
                  { dataKey: 'grossWeightKg', name: 'Gross Weight (kg)', color: '#10b981' },
                  { dataKey: 'tareWeightKg', name: 'Tare Weight (kg)', color: '#f59e0b' },
                ]}
                defaultChartType="line"
                allowedChartTypes={['line', 'bar']}
                isLoading={isLoading}
              />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function PortalVehiclesPage() {
  const { data: vehicles, isLoading } = usePortalVehicles();
  const [selectedVehicle, setSelectedVehicle] = useState<PortalVehicle | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Vehicle Fleet</h2>
        <p className="text-sm text-gray-500">Your registered vehicles and their weight data</p>
      </div>

      <Card className="border border-gray-200 rounded-xl">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-gray-200 bg-gray-50">
                <TableHead className="text-xs font-semibold text-gray-700 h-10">Reg. No</TableHead>
                <TableHead className="text-xs font-semibold text-gray-700 h-10">Type</TableHead>
                <TableHead className="text-xs font-semibold text-gray-700 h-10 text-right">Last Tare (kg)</TableHead>
                <TableHead className="text-xs font-semibold text-gray-700 h-10 hidden md:table-cell">Tare Date</TableHead>
                <TableHead className="text-xs font-semibold text-gray-700 h-10">Tare Status</TableHead>
                <TableHead className="text-xs font-semibold text-gray-700 h-10 text-right">Total Trips</TableHead>
                <TableHead className="text-xs font-semibold text-gray-700 h-10 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !vehicles || vehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                    <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No vehicles found
                  </TableCell>
                </TableRow>
              ) : (
                vehicles.map((v) => (
                  <TableRow key={v.id} className="hover:bg-gray-50/50">
                    <TableCell className="text-xs font-mono font-semibold">{v.registrationNumber}</TableCell>
                    <TableCell className="text-xs text-gray-600">{v.vehicleType}</TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {v.lastTareWeightKg?.toLocaleString() ?? '--'}
                    </TableCell>
                    <TableCell className="text-xs text-gray-600 hidden md:table-cell">
                      {v.lastTareDate
                        ? new Date(v.lastTareDate).toLocaleDateString('en-KE')
                        : '--'}
                    </TableCell>
                    <TableCell>
                      {v.tareExpired ? (
                        <Badge variant="destructive" className="text-[10px]">Expired</Badge>
                      ) : v.tareExpiryDate ? (
                        <Badge variant="default" className="text-[10px]">Valid</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">N/A</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-semibold">
                      {v.totalTrips.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        title="View Weight Trends"
                        onClick={() => setSelectedVehicle(v)}
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

      <VehicleTrendDialog
        vehicle={selectedVehicle}
        open={!!selectedVehicle}
        onOpenChange={(open) => {
          if (!open) setSelectedVehicle(null);
        }}
      />
    </div>
  );
}
