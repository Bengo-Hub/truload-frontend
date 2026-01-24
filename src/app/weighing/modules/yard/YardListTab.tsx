"use client";

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { SearchInput, StatusBadge, SummaryCard } from '@/components/weighing';
import { useHasPermission } from '@/hooks/useAuth';
import {
  AlertTriangle,
  ArrowRightFromLine,
  ArrowUpRight,
  Clock,
  Eye,
  FileCheck,
  Filter,
  Package,
  RefreshCcw,
  Truck,
  Weight,
} from 'lucide-react';
import { useState } from 'react';

/**
 * YardEntry interface matching backend model
 * @see TruLoad.Backend.Models.Yard.YardEntry
 */
interface YardEntryDto {
  id: string;
  weighingId: string;
  stationId: string;
  stationName?: string;
  reason: 'redistribution' | 'gvw_overload' | 'permit_check' | 'offload';
  status: 'pending' | 'processing' | 'released' | 'escalated';
  enteredAt: string;
  releasedAt?: string;
  // Denormalized from WeighingTransaction for display
  weighing?: {
    ticketNumber: string;
    vehicleRegNumber: string;
    driverName?: string;
    transporterName?: string;
    cargoName?: string;
    gvwMeasuredKg: number;
    gvwPermissibleKg: number;
    overloadKg: number;
    totalFeeUsd: number;
    reweighCycleNo: number;
  };
}

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
 * Maps to YardEntry backend model with denormalized WeighingTransaction data.
 */
export default function YardListTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [viewingEntry, setViewingEntry] = useState<YardEntryDto | null>(null);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<YardEntryDto | null>(null);

  // Correct permissions matching backend
  const canRelease = useHasPermission('yard.release');
  const canReweigh = useHasPermission('weighing.create');
  const canRead = useHasPermission('yard.read');
  const canUpdate = useHasPermission('yard.update');
  const canEscalate = useHasPermission('yard.escalate');

  // Mock data matching YardEntry model structure with denormalized weighing data
  const mockYardEntries: YardEntryDto[] = [
    {
      id: '1',
      weighingId: 'weighing-2',
      stationId: 'station-1',
      stationName: 'Mariakani',
      reason: 'gvw_overload',
      status: 'pending',
      enteredAt: '2026-01-23T09:50:00Z',
      weighing: {
        ticketNumber: 'WT-2026-00124',
        vehicleRegNumber: 'KBB 456B',
        driverName: 'Peter Kamau',
        transporterName: 'XYZ Logistics',
        cargoName: 'Cement (50kg bags)',
        gvwMeasuredKg: 52300,
        gvwPermissibleKg: 48000,
        overloadKg: 4300,
        totalFeeUsd: 850,
        reweighCycleNo: 1,
      },
    },
    {
      id: '2',
      weighingId: 'weighing-5',
      stationId: 'station-1',
      stationName: 'Mariakani',
      reason: 'redistribution',
      status: 'processing',
      enteredAt: '2026-01-23T07:30:00Z',
      weighing: {
        ticketNumber: 'WT-2026-00120',
        vehicleRegNumber: 'KEE 555E',
        driverName: 'James Omondi',
        transporterName: 'Heavy Haulers Ltd',
        cargoName: 'Steel bars',
        gvwMeasuredKg: 54500,
        gvwPermissibleKg: 48000,
        overloadKg: 6500,
        totalFeeUsd: 1250,
        reweighCycleNo: 1,
      },
    },
    {
      id: '3',
      weighingId: 'weighing-8',
      stationId: 'station-1',
      stationName: 'Mariakani',
      reason: 'offload',
      status: 'pending',
      enteredAt: '2026-01-22T16:00:00Z',
      weighing: {
        ticketNumber: 'WT-2026-00118',
        vehicleRegNumber: 'KFF 666F',
        driverName: 'David Mwangi',
        transporterName: 'Fast Cargo Kenya',
        cargoName: 'Agricultural produce',
        gvwMeasuredKg: 50100,
        gvwPermissibleKg: 48000,
        overloadKg: 2100,
        totalFeeUsd: 420,
        reweighCycleNo: 2,
      },
    },
    {
      id: '4',
      weighingId: 'weighing-10',
      stationId: 'station-1',
      stationName: 'Mariakani',
      reason: 'permit_check',
      status: 'escalated',
      enteredAt: '2026-01-22T14:00:00Z',
      weighing: {
        ticketNumber: 'WT-2026-00115',
        vehicleRegNumber: 'KGG 777G',
        driverName: 'Michael Njoroge',
        transporterName: 'Permit Haulers Ltd',
        cargoName: 'Abnormal Load - Machinery',
        gvwMeasuredKg: 62000,
        gvwPermissibleKg: 56000,
        overloadKg: 6000,
        totalFeeUsd: 0,
        reweighCycleNo: 1,
      },
    },
  ];

  const filteredEntries = mockYardEntries.filter((entry) => {
    const matchesSearch =
      (entry.weighing?.vehicleRegNumber.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (entry.weighing?.transporterName?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (entry.weighing?.driverName?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (entry.weighing?.ticketNumber.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
    const matchesReason = reasonFilter === 'all' || entry.reason === reasonFilter;
    return matchesSearch && matchesStatus && matchesReason;
  });

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

  // Summary counts
  const pendingCount = mockYardEntries.filter((e) => e.status === 'pending').length;
  const processingCount = mockYardEntries.filter((e) => e.status === 'processing').length;
  const escalatedCount = mockYardEntries.filter((e) => e.status === 'escalated').length;

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
            <Button variant="outline" size="icon">
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Yard List Table */}
      <Card className="border border-gray-200 rounded-xl">
        <CardHeader className="pb-2 pt-5 px-6">
          <CardTitle className="text-base font-semibold text-gray-900">
            Yard Entries ({filteredEntries.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-gray-100">
                <TableHead className="font-semibold text-gray-900 h-12 pl-6">Ticket</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12">Vehicle</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12">Driver / Transporter</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12">Cargo</TableHead>
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
              {filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-gray-500 py-8">
                    No vehicles in yard.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-gray-50 border-b border-gray-50">
                    <TableCell className="py-4 pl-6">
                      <div className="font-mono font-medium text-gray-900">
                        {entry.weighing?.ticketNumber}
                      </div>
                      {entry.weighing && entry.weighing.reweighCycleNo > 1 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 mt-1">
                          Reweigh #{entry.weighing.reweighCycleNo}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="font-mono font-medium text-gray-900">
                        {entry.weighing?.vehicleRegNumber}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="text-sm text-gray-900">{entry.weighing?.driverName || '-'}</div>
                      <div className="text-xs text-gray-500">{entry.weighing?.transporterName}</div>
                    </TableCell>
                    <TableCell className="text-gray-600 py-4 text-sm max-w-[150px] truncate">
                      {entry.weighing?.cargoName || '-'}
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className="rounded-md">
                        {YARD_REASON_LABELS[entry.reason]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-red-600 py-4 text-right">
                      +{entry.weighing?.overloadKg.toLocaleString()} kg
                    </TableCell>
                    <TableCell className="font-mono text-gray-600 py-4 text-right">
                      {entry.weighing?.totalFeeUsd ? `$${entry.weighing.totalFeeUsd.toLocaleString()}` : '-'}
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
                          <Button variant="outline" size="sm">
                            Start
                          </Button>
                        )}
                        {entry.status === 'processing' && canUpdate && (
                          <Button variant="outline" size="sm">
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
                          <Button variant="ghost" size="sm" title="Escalate">
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
            Ticket: {entry.weighing?.ticketNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-gray-500">Vehicle</Label>
              <p className="font-mono font-medium">{entry.weighing?.vehicleRegNumber}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Status</Label>
              <p className="text-sm font-medium capitalize">{entry.status}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Driver</Label>
              <p className="text-sm">{entry.weighing?.driverName || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Transporter</Label>
              <p className="text-sm">{entry.weighing?.transporterName || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Cargo</Label>
              <p className="text-sm">{entry.weighing?.cargoName || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Reason</Label>
              <p className="text-sm">{YARD_REASON_LABELS[entry.reason]}</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <Label className="text-xs text-gray-500">Weight Details</Label>
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-500">Measured</p>
                <p className="font-mono font-medium">{entry.weighing?.gvwMeasuredKg.toLocaleString()} kg</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-500">Permissible</p>
                <p className="font-mono font-medium">{entry.weighing?.gvwPermissibleKg.toLocaleString()} kg</p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <p className="text-xs text-red-500">Overload</p>
                <p className="font-mono font-bold text-red-600">+{entry.weighing?.overloadKg.toLocaleString()} kg</p>
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
                  {entry.weighing?.totalFeeUsd ? `$${entry.weighing.totalFeeUsd.toLocaleString()}` : '-'}
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
}

function ReleaseDialog({ entry, open, onClose }: ReleaseDialogProps) {
  const [releaseNotes, setReleaseNotes] = useState('');

  const handleRelease = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement yard release API call
    console.log('Releasing yard entry:', entry.id, { notes: releaseNotes });
    onClose();
    setReleaseNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Release Vehicle from Yard</DialogTitle>
          <DialogDescription>
            Release {entry.weighing?.vehicleRegNumber} ({entry.weighing?.ticketNumber})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleRelease} className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Confirm Release</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Overload: +{entry.weighing?.overloadKg.toLocaleString()} kg |
                  Fee: ${entry.weighing?.totalFeeUsd?.toLocaleString() || 0}
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
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              <ArrowRightFromLine className="mr-2 h-4 w-4" />
              Release Vehicle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
