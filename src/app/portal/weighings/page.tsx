/**
 * Portal Weighing History
 *
 * Paginated table of weighing tickets across all organizations.
 * Filters: date range, vehicle, organization.
 * Click for detail sheet, download ticket PDF.
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pagination, usePagination } from '@/components/ui/pagination';
import { usePortalWeighings, useDownloadPortalTicket } from '@/hooks/queries/usePortalQueries';
import type { PortalWeighing, PortalWeighingFilters } from '@/types/portal';
import { Download, Eye, FileText, Loader2, Search, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

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
  const variant =
    status === 'completed' ? 'default' : status === 'first_weight' ? 'secondary' : 'destructive';
  const label =
    status === 'completed' ? 'Completed' : status === 'first_weight' ? 'Pending 2nd' : 'Voided';
  return <Badge variant={variant}>{label}</Badge>;
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

export default function PortalWeighingsPage() {
  const { page, pageNumber, pageSize, setPage, setPageSize } = usePagination();

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [appliedVehicle, setAppliedVehicle] = useState('');

  const filters = useMemo<PortalWeighingFilters>(
    () => ({
      pageNumber,
      pageSize,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      vehicleRegNo: appliedVehicle || undefined,
      sortBy: 'weighedAt',
      sortOrder: 'desc',
    }),
    [pageNumber, pageSize, dateFrom, dateTo, appliedVehicle]
  );

  const { data, isLoading } = usePortalWeighings(filters);
  const downloadMutation = useDownloadPortalTicket();
  const [selectedWeighing, setSelectedWeighing] = useState<PortalWeighing | null>(null);

  const handleSearch = useCallback(() => {
    setAppliedVehicle(vehicleSearch);
  }, [vehicleSearch]);

  const handleClear = useCallback(() => {
    setDateFrom('');
    setDateTo('');
    setVehicleSearch('');
    setAppliedVehicle('');
  }, []);

  const handleDownloadPdf = useCallback(
    async (weighingId: string) => {
      try {
        const result = await downloadMutation.mutateAsync(weighingId);
        const url = window.URL.createObjectURL(result.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('Ticket PDF downloaded');
      } catch {
        toast.error('Failed to download ticket PDF');
      }
    },
    [downloadMutation]
  );

  const tickets = data?.items ?? [];
  const totalItems = data?.totalCount ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Weighing History</h2>
        <p className="text-sm text-gray-500">All your weighing tickets across organizations</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Vehicle Reg</Label>
              <Input
                placeholder="e.g. KBZ 123A"
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleSearch} size="sm" className="h-9">
                <Search className="h-4 w-4 mr-1" />
                Search
              </Button>
              <Button onClick={handleClear} variant="outline" size="sm" className="h-9">
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border border-gray-200 rounded-xl">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-gray-200 bg-gray-50">
                <TableHead className="text-xs font-semibold text-gray-700 h-10">Ticket #</TableHead>
                <TableHead className="text-xs font-semibold text-gray-700 h-10">Date</TableHead>
                <TableHead className="text-xs font-semibold text-gray-700 h-10">Vehicle</TableHead>
                <TableHead className="text-xs font-semibold text-gray-700 h-10 hidden md:table-cell">Org / Weighbridge</TableHead>
                <TableHead className="text-xs font-semibold text-gray-700 h-10 text-right">Tare (kg)</TableHead>
                <TableHead className="text-xs font-semibold text-gray-700 h-10 text-right">Gross (kg)</TableHead>
                <TableHead className="text-xs font-semibold text-gray-700 h-10 text-right">Net (kg)</TableHead>
                <TableHead className="text-xs font-semibold text-gray-700 h-10 hidden lg:table-cell">Cargo</TableHead>
                <TableHead className="text-xs font-semibold text-gray-700 h-10">Status</TableHead>
                <TableHead className="text-xs font-semibold text-gray-700 h-10 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 10 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-gray-500 py-8">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No weighing records found
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((t) => (
                  <TableRow key={t.id} className="hover:bg-gray-50/50">
                    <TableCell className="text-xs font-mono text-blue-600">{t.ticketNumber}</TableCell>
                    <TableCell className="text-xs text-gray-600 whitespace-nowrap">
                      {formatDateTime(t.weighedAt)}
                    </TableCell>
                    <TableCell className="text-xs font-mono font-semibold">{t.vehicleRegNumber}</TableCell>
                    <TableCell className="text-xs text-gray-600 hidden md:table-cell">
                      <div className="truncate max-w-[140px]">{t.organizationName}</div>
                      <div className="text-[10px] text-gray-400">{t.stationName}</div>
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">{t.tareWeightKg.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{t.grossWeightKg.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-right font-mono font-semibold">{t.netWeightKg.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-gray-600 hidden lg:table-cell">
                      <div className="truncate max-w-[100px]">{t.cargoType ?? '--'}</div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          title="View Details"
                          onClick={() => setSelectedWeighing(t)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {t.pdfAvailable && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="Download PDF"
                            disabled={downloadMutation.isPending}
                            onClick={() => handleDownloadPdf(t.id)}
                          >
                            {downloadMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {!isLoading && tickets.length > 0 && (
        <div className="border border-gray-200 rounded-xl bg-white px-6 py-3">
          <Pagination
            page={page}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Detail Sheet */}
      <Dialog
        open={!!selectedWeighing}
        onOpenChange={(open) => {
          if (!open) setSelectedWeighing(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedWeighing && (
            <>
              <DialogHeader>
                <DialogTitle>Ticket #{selectedWeighing.ticketNumber}</DialogTitle>
                <DialogDescription>
                  {selectedWeighing.vehicleRegNumber} &mdash;{' '}
                  {formatDateTime(selectedWeighing.weighedAt)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="bg-gray-50 rounded-lg p-3">
                  <DetailRow label="Tare Weight" value={formatWeight(selectedWeighing.tareWeightKg)} />
                  <DetailRow label="Gross Weight" value={formatWeight(selectedWeighing.grossWeightKg)} />
                  <DetailRow
                    label="Net Weight"
                    value={
                      <span className="font-bold text-blue-700">
                        {formatWeight(selectedWeighing.netWeightKg)}
                      </span>
                    }
                  />
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <DetailRow label="Organization" value={selectedWeighing.organizationName} />
                  <DetailRow label="Weighbridge" value={selectedWeighing.stationName} />
                  <DetailRow label="Cargo" value={selectedWeighing.cargoType} />
                  <DetailRow label="Consignment" value={selectedWeighing.consignmentNumber} />
                  <DetailRow label="Driver" value={selectedWeighing.driverName} />
                </div>
                <div className="flex items-center justify-between">
                  <StatusBadge status={selectedWeighing.status} />
                  {selectedWeighing.pdfAvailable && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPdf(selectedWeighing.id)}
                      disabled={downloadMutation.isPending}
                    >
                      {downloadMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-1" />
                      )}
                      Download PDF
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
