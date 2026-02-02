"use client";

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Pagination, usePagination } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { SearchInput, StatusBadge, SummaryCard } from '@/components/weighing';
import { useHasPermission } from '@/hooks/useAuth';
import {
  useReleaseYardEntry,
  useUpdateYardEntryStatus,
  useYardEntries,
  YARD_QUERY_KEYS,
} from '@/hooks/queries/useYardQueries';
import type { YardEntryDto } from '@/lib/api/yard';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRightFromLine,
  ArrowUpRight,
  Clock,
  Eye,
  FileCheck,
  Filter,
  Loader2,
  Package,
  RefreshCcw,
  Truck,
  Weight,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const YARD_REASON_LABELS: Record<string, string> = {
  redistribution: 'Redistribution',
  gvw_overload: 'GVW Overload',
  permit_check: 'Permit Check',
  offload: 'Offloading',
};

const YARD_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  released: 'Released',
  escalated: 'Escalated',
};

/**
 * Yard List Tab
 *
 * Displays vehicles currently in the yard awaiting offloading/correction.
 * Connected to YardController backend API with real-time data.
 */
export default function YardListTab() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [viewingEntry, setViewingEntry] = useState<YardEntryDto | null>(null);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<YardEntryDto | null>(null);

  const { page, pageSize, skip, setPage, setPageSize, reset: resetPagination } = usePagination(25);
  const queryClient = useQueryClient();

  // Correct permissions matching backend
  const canRelease = useHasPermission('yard.release');
  const canReweigh = useHasPermission('weighing.create');
  const canRead = useHasPermission('yard.read');
  const canUpdate = useHasPermission('yard.update');
  const canEscalate = useHasPermission('yard.escalate');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      resetPagination();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, resetPagination]);

  // Reset pagination when filters change
  useEffect(() => {
    resetPagination();
  }, [statusFilter, reasonFilter, resetPagination]);

  // Fetch yard entries with server-side filtering and pagination
  const { data: yardResult, isLoading, isFetching, refetch } = useYardEntries({
    vehicleRegNo: debouncedSearch || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    reason: reasonFilter !== 'all' ? reasonFilter : undefined,
    skip,
    take: pageSize,
    sortBy: 'EnteredAt',
    sortOrder: 'desc',
  });

  // Mutations
  const releaseMutation = useReleaseYardEntry();
  const updateStatusMutation = useUpdateYardEntryStatus();

  const entries = yardResult?.items ?? [];
  const totalCount = yardResult?.totalCount ?? 0;

  // Calculate summary counts from all entries (we need separate queries for this)
  // For now, we'll show counts from the current filtered result
  const pendingCount = entries.filter((e) => e.status === 'pending').length;
  const processingCount = entries.filter((e) => e.status === 'processing').length;
  const escalatedCount = entries.filter((e) => e.status === 'escalated').length;

  const formatDuration = (dateStr: string) => {
    const start = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffHours > 24) {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ${diffHours % 24}h`;
    }
    if (diffHours > 0) return `${diffHours}h ${diffMins}m`;
    return `${diffMins}m`;
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-KE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getYardStatusBadge = (status: string): 'PENDING' | 'LEGAL' | 'OVERLOAD' | 'WARNING' => {
    switch (status) {
      case 'released':
        return 'LEGAL';
      case 'escalated':
        return 'OVERLOAD';
      case 'processing':
        return 'WARNING';
      default:
        return 'PENDING';
    }
  };

  const handleRelease = (entry: YardEntryDto) => {
    setSelectedEntry(entry);
    setReleaseDialogOpen(true);
  };

  const handleStartProcessing = async (entry: YardEntryDto) => {
    try {
      await updateStatusMutation.mutateAsync({ id: entry.id, status: 'processing' });
      toast.success('Processing started');
    } catch {
      toast.error('Failed to start processing');
    }
  };

  const handleMarkDone = async (entry: YardEntryDto) => {
    try {
      await updateStatusMutation.mutateAsync({ id: entry.id, status: 'completed' });
      toast.success('Marked as completed');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleEscalate = async (entry: YardEntryDto) => {
    try {
      await updateStatusMutation.mutateAsync({ id: entry.id, status: 'escalated' });
      toast.success('Entry escalated');
    } catch {
      toast.error('Failed to escalate');
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: YARD_QUERY_KEYS.YARD_ENTRIES });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          title="Pending Entry"
          value={pendingCount}
          icon={Package}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-100"
        />
        <SummaryCard
          title="Currently Processing"
          value={processingCount}
          icon={Truck}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
        <SummaryCard
          title="Escalated"
          value={escalatedCount}
          icon={AlertTriangle}
          iconColor="text-red-600"
          iconBgColor="bg-red-100"
        />
      </div>

      {/* Filters */}
      <Card className="border border-gray-200 rounded-xl">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 gap-3 flex-wrap">
              <SearchInput
                placeholder="Search by vehicle, ticket, driver, transporter..."
                value={search}
                onChange={setSearch}
                className="flex-1 max-w-sm"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="released">Released</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                </SelectContent>
              </Select>
              <Select value={reasonFilter} onValueChange={setReasonFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reasons</SelectItem>
                  <SelectItem value="gvw_overload">GVW Overload</SelectItem>
                  <SelectItem value="redistribution">Redistribution</SelectItem>
                  <SelectItem value="offload">Offloading</SelectItem>
                  <SelectItem value="permit_check">Permit Check</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isFetching}>
              <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Yard List Table */}
      <Card className="border border-gray-200 rounded-xl">
        <CardHeader className="pb-2 pt-5 px-6">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            Yard Entries ({totalCount})
            {isFetching && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-gray-100">
                <TableHead className="font-semibold text-gray-900 h-12 pl-6">Ticket</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12">Vehicle</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12">Driver / Transporter</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12">Reason</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12 text-right">Overload</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12 text-right">Fee</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12">Status</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Duration
                </TableHead>
                <TableHead className="font-semibold text-gray-900 h-12 pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading yard entries...
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                    No vehicles in yard.
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-gray-50 border-b border-gray-50">
                    <TableCell className="py-4 pl-6">
                      <div className="font-mono font-medium text-gray-900">
                        {entry.ticketNumber || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="font-mono font-medium text-gray-900">
                        {entry.vehicleRegNumber || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="text-sm text-gray-900">{entry.driverName || '-'}</div>
                      <div className="text-xs text-gray-500">{entry.transporterName || '-'}</div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className="rounded-md">
                        {YARD_REASON_LABELS[entry.reason] || entry.reason}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-red-600 py-4 text-right">
                      {entry.overloadKg ? `+${entry.overloadKg.toLocaleString()} kg` : '-'}
                    </TableCell>
                    <TableCell className="font-mono text-gray-600 py-4 text-right">
                      {entry.totalFeeUsd ? `$${entry.totalFeeUsd.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell className="py-4">
                      <StatusBadge status={getYardStatusBadge(entry.status)} />
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="text-sm text-gray-600">{formatDuration(entry.enteredAt)}</div>
                      <div className="text-xs text-gray-400">{formatDateTime(entry.enteredAt)}</div>
                    </TableCell>
                    <TableCell className="py-4 pr-6 text-right">
                      <div className="flex justify-end gap-1">
                        {canRead && (
                          <Button variant="ghost" size="sm" onClick={() => setViewingEntry(entry)} title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {entry.status === 'pending' && canUpdate && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStartProcessing(entry)}
                            disabled={updateStatusMutation.isPending}
                          >
                            Start
                          </Button>
                        )}
                        {entry.status === 'processing' && canUpdate && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkDone(entry)}
                            disabled={updateStatusMutation.isPending}
                          >
                            <FileCheck className="mr-1 h-4 w-4" />
                            Done
                          </Button>
                        )}
                        {(entry.status === 'pending' || entry.status === 'processing') && canReweigh && (
                          <Button size="sm">
                            <Weight className="mr-1 h-4 w-4" />
                            Reweigh
                          </Button>
                        )}
                        {entry.status !== 'released' && entry.status !== 'escalated' && canEscalate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Escalate"
                            onClick={() => handleEscalate(entry)}
                            disabled={updateStatusMutation.isPending}
                          >
                            <ArrowUpRight className="h-4 w-4 text-orange-600" />
                          </Button>
                        )}
                        {entry.status !== 'released' && canRelease && (
                          <Button variant="ghost" size="sm" onClick={() => handleRelease(entry)} title="Release">
                            <ArrowRightFromLine className="h-4 w-4 text-green-600" />
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

        {/* Pagination */}
        <div className="border-t border-gray-200 px-4 py-3">
          <Pagination
            page={page}
            pageSize={pageSize}
            totalItems={totalCount}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            isLoading={isLoading}
          />
        </div>
      </Card>

      {/* View Entry Dialog */}
      {viewingEntry && (
        <ViewEntryDialog entry={viewingEntry} onClose={() => setViewingEntry(null)} />
      )}

      {/* Release Dialog */}
      {selectedEntry && (
        <ReleaseDialog
          entry={selectedEntry}
          open={releaseDialogOpen}
          onClose={() => {
            setReleaseDialogOpen(false);
            setSelectedEntry(null);
          }}
          onRelease={async (notes) => {
            await releaseMutation.mutateAsync({
              id: selectedEntry.id,
              request: { notes },
            });
            toast.success('Vehicle released from yard');
            setReleaseDialogOpen(false);
            setSelectedEntry(null);
          }}
          isSubmitting={releaseMutation.isPending}
        />
      )}
    </div>
  );
}

interface ViewEntryDialogProps {
  entry: YardEntryDto;
  onClose: () => void;
}

function ViewEntryDialog({ entry, onClose }: ViewEntryDialogProps) {
  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-KE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open onOpenChange={(value) => (!value ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Yard Entry Details
          </DialogTitle>
          <DialogDescription>
            Ticket: {entry.ticketNumber || '-'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-gray-500">Vehicle</Label>
              <p className="font-mono font-medium">{entry.vehicleRegNumber || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Status</Label>
              <p className="text-sm font-medium capitalize">{entry.status}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Driver</Label>
              <p className="text-sm">{entry.driverName || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Transporter</Label>
              <p className="text-sm">{entry.transporterName || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Station</Label>
              <p className="text-sm">{entry.stationName || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Reason</Label>
              <p className="text-sm">{YARD_REASON_LABELS[entry.reason] || entry.reason}</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <Label className="text-xs text-gray-500">Weight Details</Label>
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-500">Measured</p>
                <p className="font-mono font-medium">
                  {entry.gvwMeasuredKg ? `${entry.gvwMeasuredKg.toLocaleString()} kg` : '-'}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-500">Permissible</p>
                <p className="font-mono font-medium">
                  {entry.gvwPermissibleKg ? `${entry.gvwPermissibleKg.toLocaleString()} kg` : '-'}
                </p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <p className="text-xs text-red-500">Overload</p>
                <p className="font-mono font-bold text-red-600">
                  {entry.overloadKg ? `+${entry.overloadKg.toLocaleString()} kg` : '-'}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Entered Yard</Label>
                <p className="text-sm">{formatDateTime(entry.enteredAt)}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Fee</Label>
                <p className="font-mono font-medium">
                  {entry.totalFeeUsd ? `$${entry.totalFeeUsd.toLocaleString()}` : '-'}
                </p>
              </div>
              {entry.releasedAt && (
                <div>
                  <Label className="text-xs text-gray-500">Released</Label>
                  <p className="text-sm">{formatDateTime(entry.releasedAt)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ReleaseDialogProps {
  entry: YardEntryDto;
  open: boolean;
  onClose: () => void;
  onRelease: (notes: string) => Promise<void>;
  isSubmitting: boolean;
}

function ReleaseDialog({ entry, open, onClose, onRelease, isSubmitting }: ReleaseDialogProps) {
  const [releaseNotes, setReleaseNotes] = useState('');

  const handleRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    await onRelease(releaseNotes);
    setReleaseNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Release Vehicle from Yard</DialogTitle>
          <DialogDescription>
            Release {entry.vehicleRegNumber} ({entry.ticketNumber})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleRelease} className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Confirm Release</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Overload: {entry.overloadKg ? `+${entry.overloadKg.toLocaleString()} kg` : '-'} |
                  Fee: ${entry.totalFeeUsd?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="releaseNotes">Release Notes</Label>
            <Textarea
              id="releaseNotes"
              placeholder="Add any notes about the release (e.g., cargo offloaded, fee paid, permit verified)..."
              value={releaseNotes}
              onChange={(e) => setReleaseNotes(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Releasing...
                </>
              ) : (
                <>
                  <ArrowRightFromLine className="mr-2 h-4 w-4" />
                  Release Vehicle
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
