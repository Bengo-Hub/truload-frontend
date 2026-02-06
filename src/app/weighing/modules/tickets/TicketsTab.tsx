"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination, usePagination } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchInput, StatusBadge } from '@/components/weighing';
import { useHasPermission } from '@/hooks/useAuth';
import { useWeighingTransactions, useMyStation } from '@/hooks/queries/useWeighingQueries';
import type { WeighingTransaction } from '@/lib/api/weighing';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/query/config';
import { Download, Eye, Filter, Loader2, Printer, RefreshCcw, RotateCcw } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';

const WEIGHING_TYPE_LABELS: Record<string, string> = {
  static: 'Static',
  wim: 'WIM',
  axle: 'Axle-by-Axle',
  mobile: 'Mobile',
  multideck: 'Multideck',
};

/**
 * Weight Tickets Tab
 *
 * Displays history of all weight tickets generated at the station.
 * Connected to real backend API with pagination.
 */
export default function TicketsTab() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { page, pageNumber, pageSize, setPage, setPageSize, reset: resetPagination } = usePagination();
  const queryClient = useQueryClient();

  // Permissions
  const canPrint = useHasPermission('weighing.export');
  const canRead = useHasPermission('weighing.read');

  // Get current user's station
  const { data: myStation } = useMyStation();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset pagination when filters change
  useEffect(() => {
    resetPagination();
  }, [debouncedSearch, statusFilter, dateFrom, dateTo, resetPagination]);

  // Build search params
  const searchParams = useMemo(() => {
    const params: Parameters<typeof useWeighingTransactions>[0] = {
      pageNumber,
      pageSize,
      sortBy: 'weighedAt',
      sortOrder: 'desc',
    };

    // Add station filter if user has a station
    if (myStation?.id) {
      params.stationId = myStation.id;
    }

    // Add vehicle search
    if (debouncedSearch) {
      params.vehicleRegNo = debouncedSearch;
    }

    // Add status filter
    if (statusFilter !== 'all') {
      params.controlStatus = statusFilter;
    }

    // Add date filters
    if (dateFrom) {
      params.fromDate = new Date(dateFrom).toISOString();
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      params.toDate = toDate.toISOString();
    }

    return params;
  }, [pageNumber, pageSize, myStation?.id, debouncedSearch, statusFilter, dateFrom, dateTo]);

  // Fetch weighing transactions
  const { data: result, isLoading, isFetching, error } = useWeighingTransactions(searchParams);

  const tickets = result?.items ?? [];
  const totalItems = result?.totalCount ?? 0;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WEIGHING_TRANSACTIONS });
  };

  const handleClearFilters = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setStatusFilter('all');
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

  const getComplianceStatus = (ticket: WeighingTransaction): 'LEGAL' | 'WARNING' | 'OVERLOAD' => {
    if (ticket.isCompliant) return 'LEGAL';
    if (ticket.overloadKg > 2000) return 'OVERLOAD';
    return 'WARNING';
  };

  const hasActiveFilters = dateFrom || dateTo || statusFilter !== 'all' || search;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="border border-gray-200 rounded-xl">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 gap-3 flex-wrap">
                <SearchInput
                  placeholder="Search by vehicle registration..."
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
              </div>
              <div className="flex gap-2">
                {canPrint && (
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                )}
                <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isFetching}>
                  <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
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
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
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
            Weighing Transactions
            {!isLoading && ` (${totalItems.toLocaleString()})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-gray-100">
                <TableHead className="font-semibold text-gray-900 h-12 pl-6">Ticket #</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12">Vehicle</TableHead>
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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading transactions...
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-red-500 py-8">
                    Failed to load transactions. Please try again.
                  </TableCell>
                </TableRow>
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                    No weighing transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => (
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
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                        {WEIGHING_TYPE_LABELS[ticket.weighingType ?? 'static'] ?? ticket.weighingType}
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
        <div className="border-t border-gray-200 px-6 py-3">
          <Pagination
            page={page}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            isLoading={isFetching}
          />
        </div>
      </Card>
    </div>
  );
}
