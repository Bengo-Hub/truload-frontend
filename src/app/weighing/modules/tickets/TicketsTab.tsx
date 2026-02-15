"use client";

import { Pagination, usePagination } from '@/components/ui/pagination';
import { useHasPermission } from '@/hooks/useAuth';
import {
  useWeighingTransactions,
  useMyStation,
  useStations,
  useAxleConfigurations,
  useWeighingStatistics,
  useDownloadWeightTicket,
} from '@/hooks/queries/useWeighingQueries';
import type { SearchWeighingParams, WeighingTransaction } from '@/lib/api/weighing';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/query/config';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';

import TicketsStatsBar from './TicketsStatsBar';
import TicketsFilterBar, { type ViewMode } from './TicketsFilterBar';
import TicketsListView from './TicketsListView';
import TicketsImageView from './TicketsImageView';
import TicketsLineView from './TicketsLineView';
import TicketDetailSheet from './TicketDetailSheet';
import { PdfPreviewDialog } from '@/components/shared/PdfPreviewDialog';

/**
 * Weight Tickets Tab — Orchestrator
 *
 * Manages all filter state, data fetching, and delegates rendering
 * to TicketsListView, TicketsLineView, or TicketsImageView.
 */
export default function TicketsTab() {
  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Filter state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [stationFilter, setStationFilter] = useState('all');
  const [axleTypeFilter, setAxleTypeFilter] = useState('all');
  const [searchReg, setSearchReg] = useState('');
  const [searchTicketNo, setSearchTicketNo] = useState('');

  // Debounced search values (applied on Search click)
  const [appliedSearchReg, setAppliedSearchReg] = useState('');
  const [appliedSearchTicketNo, setAppliedSearchTicketNo] = useState('');

  // Pagination
  const { page, pageNumber, pageSize, setPage, setPageSize, reset: resetPagination } = usePagination();
  const queryClient = useQueryClient();

  // Permissions
  const canExport = useHasPermission('weighing.export');
  const canRead = useHasPermission('weighing.read');

  // Lookups
  const { data: myStation } = useMyStation();
  const { data: stations = [] } = useStations();
  const { data: axleConfigurations = [] } = useAxleConfigurations();

  // Reset pagination when filters change
  useEffect(() => {
    resetPagination();
  }, [appliedSearchReg, appliedSearchTicketNo, statusFilter, stateFilter, stationFilter, axleTypeFilter, dateFrom, dateTo, timeFrom, timeTo, resetPagination]);

  // Build search params
  const searchParams = useMemo(() => {
    const params: SearchWeighingParams = {
      pageNumber,
      pageSize,
      sortBy: 'weighedAt',
      sortOrder: 'desc',
    };

    // Station filter: explicit selection > user's own station
    if (stationFilter !== 'all') {
      params.stationId = stationFilter;
    } else if (myStation?.id) {
      params.stationId = myStation.id;
    }

    // Status filter
    if (statusFilter !== 'all') {
      params.controlStatus = statusFilter;
    }

    // State filter
    if (stateFilter !== 'all') {
      params.state = stateFilter;
    }

    // Axle type filter
    if (axleTypeFilter !== 'all') {
      params.axleConfiguration = axleTypeFilter;
    }

    // Vehicle reg search
    if (appliedSearchReg) {
      params.vehicleRegNo = appliedSearchReg;
    }

    // Ticket no search
    if (appliedSearchTicketNo) {
      params.searchTicketNo = appliedSearchTicketNo;
    }

    // Date filters
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (timeFrom) {
        const [h, m] = timeFrom.split(':');
        from.setHours(parseInt(h), parseInt(m), 0, 0);
      }
      params.fromDate = from.toISOString();
    }
    if (dateTo) {
      const to = new Date(dateTo);
      if (timeTo) {
        const [h, m] = timeTo.split(':');
        to.setHours(parseInt(h), parseInt(m), 59, 999);
      } else {
        to.setHours(23, 59, 59, 999);
      }
      params.toDate = to.toISOString();
    }

    return params;
  }, [pageNumber, pageSize, myStation?.id, stationFilter, statusFilter, stateFilter, axleTypeFilter, appliedSearchReg, appliedSearchTicketNo, dateFrom, dateTo, timeFrom, timeTo]);

  // Fetch transactions
  const { data: result, isLoading, isFetching, error } = useWeighingTransactions(searchParams);

  // Fetch statistics
  const { data: stats, isLoading: statsLoading } = useWeighingStatistics({
    dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
    dateTo: dateTo ? (() => { const d = new Date(dateTo); d.setHours(23, 59, 59, 999); return d.toISOString(); })() : undefined,
    stationId: stationFilter !== 'all' ? stationFilter : myStation?.id,
  });

  const tickets = result?.items ?? [];
  const totalItems = result?.totalCount ?? 0;

  const hasActiveFilters = !!(dateFrom || dateTo || timeFrom || timeTo || statusFilter !== 'all' || stateFilter !== 'all' || stationFilter !== 'all' || axleTypeFilter !== 'all' || searchReg || searchTicketNo);

  const handleSearch = useCallback(() => {
    setAppliedSearchReg(searchReg);
    setAppliedSearchTicketNo(searchTicketNo);
  }, [searchReg, searchTicketNo]);

  const handleClear = useCallback(() => {
    setDateFrom('');
    setDateTo('');
    setTimeFrom('');
    setTimeTo('');
    setStatusFilter('all');
    setStateFilter('all');
    setStationFilter('all');
    setAxleTypeFilter('all');
    setSearchReg('');
    setSearchTicketNo('');
    setAppliedSearchReg('');
    setAppliedSearchTicketNo('');
  }, []);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WEIGHING_TRANSACTIONS });
  }, [queryClient]);

  const handleExport = useCallback(() => {
    if (!tickets.length) return;
    const headers = ['Ticket No', 'Vehicle Reg', 'GVW Measured (kg)', 'GVW Permissible (kg)', 'Overload (kg)', 'Status', 'Station', 'Weighed At'];
    const rows = tickets.map(t => [
      t.ticketNumber, t.vehicleRegNumber, t.gvwMeasuredKg, t.gvwPermissibleKg,
      t.overloadKg, t.controlStatus, t.stationName ?? '', t.weighedAt,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `weight-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success('Tickets exported to CSV');
  }, [tickets]);

  // View / Print / Preview handlers
  const [selectedTicket, setSelectedTicket] = useState<WeighingTransaction | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewFileName, setPreviewFileName] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const downloadTicketMutation = useDownloadWeightTicket();

  const handleView = useCallback((ticket: WeighingTransaction) => {
    setSelectedTicket(ticket);
  }, []);

  const handlePrint = useCallback(async (ticket: WeighingTransaction) => {
    try {
      setPreviewFileName(`WeightTicket_${ticket.ticketNumber ?? ticket.id}.pdf`);
      setPreviewOpen(true);
      const result = await downloadTicketMutation.mutateAsync(ticket.id);
      setPreviewBlob(result.blob);
    } catch {
      toast.error('Failed to generate weight ticket');
      setPreviewOpen(false);
    }
  }, [downloadTicketMutation]);

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <TicketsStatsBar stats={stats} isLoading={statsLoading} />

      {/* Filter Bar */}
      <TicketsFilterBar
        dateFrom={dateFrom}
        dateTo={dateTo}
        timeFrom={timeFrom}
        timeTo={timeTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onTimeFromChange={setTimeFrom}
        onTimeToChange={setTimeTo}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        stateFilter={stateFilter}
        onStateFilterChange={setStateFilter}
        stationFilter={stationFilter}
        onStationFilterChange={setStationFilter}
        axleTypeFilter={axleTypeFilter}
        onAxleTypeFilterChange={setAxleTypeFilter}
        searchReg={searchReg}
        onSearchRegChange={setSearchReg}
        searchTicketNo={searchTicketNo}
        onSearchTicketNoChange={setSearchTicketNo}
        onSearch={handleSearch}
        onClear={handleClear}
        onRefresh={handleRefresh}
        onExport={handleExport}
        stations={stations}
        axleConfigurations={axleConfigurations}
        isFetching={isFetching}
        canExport={canExport}
        hasActiveFilters={hasActiveFilters}
      />

      {/* View */}
      {viewMode === 'list' && (
        <TicketsListView
          tickets={tickets}
          isLoading={isLoading}
          error={error}
          canRead={canRead}
          canPrint={canExport}
          onView={handleView}
          onPrint={handlePrint}
        />
      )}

      {viewMode === 'line' && (
        <TicketsLineView
          tickets={tickets}
          isLoading={isLoading}
          error={error}
          canRead={canRead}
          canPrint={canExport}
          onView={handleView}
          onPrint={handlePrint}
        />
      )}

      {viewMode === 'images' && (
        <TicketsImageView
          tickets={tickets}
          isLoading={isLoading}
          error={error}
          canRead={canRead}
          canPrint={canExport}
          onView={handleView}
          onPrint={handlePrint}
        />
      )}

      {/* Pagination */}
      {!isLoading && tickets.length > 0 && (
        <div className="border border-gray-200 rounded-xl bg-white px-6 py-3">
          <Pagination
            page={page}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            isLoading={isFetching}
          />
        </div>
      )}

      {/* Ticket Detail Sheet */}
      <TicketDetailSheet
        ticket={selectedTicket}
        open={!!selectedTicket}
        onOpenChange={(open) => { if (!open) setSelectedTicket(null); }}
        onPrint={handlePrint}
        canPrint={canExport}
      />

      {/* PDF Preview Dialog */}
      <PdfPreviewDialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) setPreviewBlob(null);
        }}
        blob={previewBlob}
        fileName={previewFileName}
        title="Weight Ticket Preview"
        isLoading={downloadTicketMutation.isPending && !previewBlob}
        orientation="portrait"
      />
    </div>
  );
}
