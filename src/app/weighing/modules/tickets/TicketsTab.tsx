"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchInput, StatusBadge } from '@/components/weighing';
import { useHasPermission } from '@/hooks/useAuth';
import { Download, Eye, Filter, Printer, RefreshCcw, RotateCcw } from 'lucide-react';
import { useState } from 'react';

/**
 * WeighingTransaction interface matching backend model
 * @see TruLoad.Backend.Models.Weighing.WeighingTransaction
 */
interface WeighingTicket {
  id: string;
  ticketNumber: string;
  vehicleId?: string;
  vehicleRegNumber: string;
  driverId?: string;
  driverName?: string;
  transporterId?: string;
  transporterName?: string;
  stationId: string;
  stationName?: string;
  weighedByUserId: string;
  operatorName?: string;
  weighingType: 'static' | 'wim' | 'axle';
  actId?: string;
  bound?: string;
  gvwMeasuredKg: number;
  gvwPermissibleKg: number;
  overloadKg: number;
  controlStatus: 'Pending' | 'Compliant' | 'Overload' | 'Charged' | 'Released';
  totalFeeUsd: number;
  weighedAt: string;
  isSync: boolean;
  isCompliant: boolean;
  isSentToYard: boolean;
  violationReason?: string;
  reweighCycleNo: number;
  originalWeighingId?: string;
  hasPermit: boolean;
  originId?: string;
  originName?: string;
  destinationId?: string;
  destinationName?: string;
  cargoId?: string;
  cargoName?: string;
  toleranceApplied: boolean;
}

const CONTROL_STATUS_LABELS: Record<string, string> = {
  Pending: 'Pending',
  Compliant: 'Compliant',
  Overload: 'Overload',
  Charged: 'Charged',
  Released: 'Released',
};

const WEIGHING_TYPE_LABELS: Record<string, string> = {
  static: 'Static',
  wim: 'WIM',
  axle: 'Axle-by-Axle',
};

/**
 * Weight Tickets Tab
 *
 * Displays history of all weight tickets generated at the station.
 * Maps to WeighingTransaction backend model.
 */
export default function TicketsTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [weighingTypeFilter, setWeighingTypeFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Correct permissions matching backend
  const canPrint = useHasPermission('weighing.export');
  const canRead = useHasPermission('weighing.read');

  // Mock data matching WeighingTransaction model structure
  const mockTickets: WeighingTicket[] = [
    {
      id: '1',
      ticketNumber: 'WT-2026-00125',
      vehicleRegNumber: 'KAA 123A',
      transporterName: 'ABC Transport Ltd',
      driverName: 'Peter Kamau',
      stationId: 'station-1',
      stationName: 'Mariakani',
      weighedByUserId: 'user-1',
      operatorName: 'John Doe',
      weighingType: 'static',
      gvwMeasuredKg: 48100,
      gvwPermissibleKg: 48000,
      overloadKg: 100,
      controlStatus: 'Compliant',
      totalFeeUsd: 0,
      weighedAt: '2026-01-23T10:15:00Z',
      isSync: true,
      isCompliant: true,
      isSentToYard: false,
      reweighCycleNo: 1,
      hasPermit: false,
      toleranceApplied: true,
      originName: 'Mombasa Port',
      destinationName: 'Nairobi CBD',
      cargoName: 'Cement',
    },
    {
      id: '2',
      ticketNumber: 'WT-2026-00124',
      vehicleRegNumber: 'KBB 456B',
      transporterName: 'XYZ Logistics',
      driverName: 'James Omondi',
      stationId: 'station-1',
      stationName: 'Mariakani',
      weighedByUserId: 'user-2',
      operatorName: 'Jane Smith',
      weighingType: 'static',
      gvwMeasuredKg: 52300,
      gvwPermissibleKg: 48000,
      overloadKg: 4300,
      controlStatus: 'Overload',
      totalFeeUsd: 850,
      weighedAt: '2026-01-23T09:45:00Z',
      isSync: true,
      isCompliant: false,
      isSentToYard: true,
      violationReason: 'GVW exceeded by 4,300kg',
      reweighCycleNo: 1,
      hasPermit: false,
      toleranceApplied: true,
      originName: 'Mombasa Port',
      destinationName: 'Kampala',
      cargoName: 'Steel Bars',
    },
    {
      id: '3',
      ticketNumber: 'WT-2026-00123',
      vehicleRegNumber: 'KCC 789C',
      transporterName: 'Fast Movers Kenya',
      driverName: 'David Mwangi',
      stationId: 'station-1',
      stationName: 'Mariakani',
      weighedByUserId: 'user-1',
      operatorName: 'John Doe',
      weighingType: 'wim',
      gvwMeasuredKg: 35200,
      gvwPermissibleKg: 35000,
      overloadKg: 200,
      controlStatus: 'Charged',
      totalFeeUsd: 40,
      weighedAt: '2026-01-23T08:30:00Z',
      isSync: true,
      isCompliant: false,
      isSentToYard: false,
      violationReason: 'Minor GVW overload',
      reweighCycleNo: 1,
      hasPermit: false,
      toleranceApplied: true,
      originName: 'Nairobi',
      destinationName: 'Kisumu',
      cargoName: 'Agricultural Produce',
    },
    {
      id: '4',
      ticketNumber: 'WT-2026-00122',
      vehicleRegNumber: 'KDD 012D',
      transporterName: 'Cargo Express',
      driverName: 'Samuel Kibet',
      stationId: 'station-1',
      stationName: 'Mariakani',
      weighedByUserId: 'user-2',
      operatorName: 'Jane Smith',
      weighingType: 'static',
      gvwMeasuredKg: 45000,
      gvwPermissibleKg: 48000,
      overloadKg: -3000,
      controlStatus: 'Compliant',
      totalFeeUsd: 0,
      weighedAt: '2026-01-22T16:20:00Z',
      isSync: true,
      isCompliant: true,
      isSentToYard: false,
      reweighCycleNo: 1,
      hasPermit: false,
      toleranceApplied: false,
      originName: 'Eldoret',
      destinationName: 'Mombasa',
      cargoName: 'Tea',
    },
    {
      id: '5',
      ticketNumber: 'WT-2026-00121',
      vehicleRegNumber: 'KBB 456B',
      transporterName: 'XYZ Logistics',
      driverName: 'James Omondi',
      stationId: 'station-1',
      stationName: 'Mariakani',
      weighedByUserId: 'user-2',
      operatorName: 'Jane Smith',
      weighingType: 'static',
      gvwMeasuredKg: 47500,
      gvwPermissibleKg: 48000,
      overloadKg: -500,
      controlStatus: 'Released',
      totalFeeUsd: 850,
      weighedAt: '2026-01-23T14:30:00Z',
      isSync: true,
      isCompliant: true,
      isSentToYard: false,
      reweighCycleNo: 2,
      originalWeighingId: '2',
      hasPermit: false,
      toleranceApplied: true,
      originName: 'Mombasa Port',
      destinationName: 'Kampala',
      cargoName: 'Steel Bars',
    },
  ];

  const filteredTickets = mockTickets.filter((ticket) => {
    const matchesSearch =
      ticket.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
      ticket.vehicleRegNumber.toLowerCase().includes(search.toLowerCase()) ||
      (ticket.transporterName?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (ticket.driverName?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || ticket.controlStatus === statusFilter;
    const matchesType = weighingTypeFilter === 'all' || ticket.weighingType === weighingTypeFilter;

    // Date range filter
    let matchesDateRange = true;
    if (dateFrom) {
      matchesDateRange = matchesDateRange && new Date(ticket.weighedAt) >= new Date(dateFrom);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      matchesDateRange = matchesDateRange && new Date(ticket.weighedAt) <= toDate;
    }

    return matchesSearch && matchesStatus && matchesType && matchesDateRange;
  });

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-KE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getComplianceStatus = (ticket: WeighingTicket): 'LEGAL' | 'WARNING' | 'OVERLOAD' => {
    if (ticket.isCompliant) return 'LEGAL';
    if (ticket.overloadKg > 2000) return 'OVERLOAD';
    return 'WARNING';
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="border border-gray-200 rounded-xl">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 gap-3 flex-wrap">
                <SearchInput
                  placeholder="Search by ticket, vehicle, transporter, driver..."
                  value={search}
                  onChange={setSearch}
                  className="flex-1 max-w-sm"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Compliant">Compliant</SelectItem>
                    <SelectItem value="Overload">Overload</SelectItem>
                    <SelectItem value="Charged">Charged</SelectItem>
                    <SelectItem value="Released">Released</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={weighingTypeFilter} onValueChange={setWeighingTypeFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="static">Static</SelectItem>
                    <SelectItem value="wim">WIM</SelectItem>
                    <SelectItem value="axle">Axle-by-Axle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                {canPrint && (
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                )}
                <Button variant="outline" size="icon">
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {/* Date Range Filters */}
            <div className="flex gap-3 flex-wrap items-end">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">From Date</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-[150px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">To Date</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-[150px]"
                />
              </div>
              {(dateFrom || dateTo || statusFilter !== 'all' || weighingTypeFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                    setStatusFilter('all');
                    setWeighingTypeFilter('all');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card className="border border-gray-200 rounded-xl">
        <CardHeader className="pb-2 pt-5 px-6">
          <CardTitle className="text-base font-semibold text-gray-900">
            Weighing Transactions ({filteredTickets.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-gray-100">
                <TableHead className="font-semibold text-gray-900 h-12 pl-6">Ticket #</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12">Vehicle</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12">Driver</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12">Transporter</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12">Origin → Dest</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12">Type</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12 text-right">GVW (kg)</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12 text-right">Overload</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12 text-right">Fee (USD)</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12">Status</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12">Weighed</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12 pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-gray-500 py-8">
                    No weighing transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id} className="hover:bg-gray-50 border-b border-gray-50">
                    <TableCell className="font-mono font-medium text-gray-900 py-4 pl-6">
                      <div className="flex items-center gap-2">
                        {ticket.ticketNumber}
                        {ticket.reweighCycleNo > 1 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                            <RotateCcw className="h-3 w-3 mr-0.5" />
                            R{ticket.reweighCycleNo}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="font-mono text-gray-900">{ticket.vehicleRegNumber}</div>
                      {ticket.cargoName && (
                        <div className="text-xs text-gray-500">{ticket.cargoName}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-600 py-4">{ticket.driverName || '-'}</TableCell>
                    <TableCell className="text-gray-600 py-4">{ticket.transporterName || '-'}</TableCell>
                    <TableCell className="text-gray-600 py-4 text-sm">
                      {ticket.originName && ticket.destinationName ? (
                        <span>{ticket.originName} → {ticket.destinationName}</span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                        {WEIGHING_TYPE_LABELS[ticket.weighingType]}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-gray-600 py-4 text-right">
                      <div>{ticket.gvwMeasuredKg.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">/ {ticket.gvwPermissibleKg.toLocaleString()}</div>
                    </TableCell>
                    <TableCell className="font-mono py-4 text-right">
                      {ticket.overloadKg > 0 ? (
                        <span className="text-red-600 font-bold">+{ticket.overloadKg.toLocaleString()}</span>
                      ) : (
                        <span className="text-green-600">{ticket.overloadKg.toLocaleString()}</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-gray-600 py-4 text-right">
                      {ticket.totalFeeUsd > 0 ? `$${ticket.totalFeeUsd.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={getComplianceStatus(ticket)} />
                        {ticket.isSentToYard && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                            In Yard
                          </span>
                        )}
                        {ticket.hasPermit && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                            Permit
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="text-sm text-gray-600">{formatDateTime(ticket.weighedAt)}</div>
                      <div className="text-xs text-gray-500">by {ticket.operatorName}</div>
                    </TableCell>
                    <TableCell className="py-4 pr-6 text-right">
                      <div className="flex justify-end gap-1">
                        {canRead && (
                          <Button variant="ghost" size="sm" title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {canPrint && (
                          <Button variant="ghost" size="sm" title="Print Ticket">
                            <Printer className="h-4 w-4" />
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
    </div>
  );
}
