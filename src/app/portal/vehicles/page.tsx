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
import { usePortalVehicles, usePortalVehicleTrends, usePortalSubscription, useImportVehiclesCsv } from '@/hooks/queries/usePortalQueries';
import type { PortalVehicle } from '@/types/portal';
import { Eye, Lock, Loader2, Upload, Truck } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { PORTAL_QUERY_KEYS } from '@/hooks/queries/usePortalQueries';

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
  const queryClient = useQueryClient();
  const { data: vehicles, isLoading } = usePortalVehicles();
  const { data: subscription } = usePortalSubscription();
  const importMutation = useImportVehiclesCsv();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<PortalVehicle | null>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so the same file can be re-selected
    e.target.value = '';
    try {
      const result = await importMutation.mutateAsync(file);
      const summary = `Imported ${result.imported} vehicle(s), skipped ${result.skipped}.`;
      if (result.errors.length > 0) {
        toast.warning(`${summary} ${result.errors.length} row error(s) — check console.`);
        console.warn('[Vehicle Import] Row errors:', result.errors);
      } else {
        toast.success(summary);
      }
      await queryClient.invalidateQueries({ queryKey: PORTAL_QUERY_KEYS.vehicles });
    } catch {
      toast.error('Failed to import vehicles. Please check the file format and try again.');
    }
  };

  const maxVehicles = subscription?.maxVehicles ?? 10;
  const vehicleCount = vehicles?.length ?? 0;
  const vehicleTrendsLocked = !subscription?.features?.vehicleTrends;

  return (
    <div className="space-y-4">
      {/* Hidden file input for CSV import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Vehicle Fleet</h2>
          <p className="text-sm text-gray-500">Your registered vehicles and their weight data</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleImportClick}
            variant="outline"
            size="sm"
            className="h-9"
            disabled={importMutation.isPending}
            title="Import vehicles from CSV (registration, make, model, axle_count, tare_weight_kg)"
          >
            {importMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-1" />
            )}
            Import CSV
          </Button>
          {!isLoading && (
            <div className="text-right">
              <Badge variant={maxVehicles !== -1 && vehicleCount >= maxVehicles ? 'destructive' : 'secondary'} className="text-xs">
                {vehicleCount}{maxVehicles === -1 ? '' : ` / ${maxVehicles}`} vehicles
              </Badge>
              {maxVehicles !== -1 && vehicleCount >= maxVehicles && (
                <p className="text-[10px] text-red-600 mt-0.5">
                  <Link href="/portal/subscription" className="underline">Upgrade</Link> to add more
                </p>
              )}
            </div>
          )}
        </div>
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
                      {vehicleTrendsLocked ? (
                        <Link href="/portal/subscription" title="Upgrade to view trends">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-300" disabled>
                            <Lock className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          title="View Weight Trends"
                          onClick={() => setSelectedVehicle(v)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      )}
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
