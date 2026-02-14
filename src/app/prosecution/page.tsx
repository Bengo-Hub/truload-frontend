'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { useHasPermission } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  useProsecutionSearch,
  useProsecutionStatistics,
  useUpdateProsecution,
  useDeleteProsecution,
  useDownloadChargeSheet,
  useStations,
} from '@/hooks/queries';
import type { ProsecutionCaseDto, ProsecutionSearchCriteria } from '@/lib/api/prosecution';
import { useQueryClient } from '@tanstack/react-query';
import { Pagination } from '@/components/ui/pagination';
import {
  AlertTriangle,
  Banknote,
  Download,
  Edit3,
  Eye,
  Filter,
  Gavel,
  RefreshCcw,
  Search,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';

/**
 * Prosecution Management Page
 *
 * Features:
 * - Statistics dashboard cards
 * - Search and filter prosecution cases
 * - Paginated data table
 * - Quick actions (view, edit, download charge sheet)
 * - Status management
 */
export default function ProsecutionPage() {
  return (
    <AppShell title="Prosecution" subtitle="Manage prosecution cases and fines">
      <ProtectedRoute requiredPermissions={['prosecution.read']}>
        <ProsecutionContent />
      </ProtectedRoute>
    </AppShell>
  );
}

function ProsecutionContent() {
  const queryClient = useQueryClient();
  const canEdit = useHasPermission('prosecution.update');
  const canDelete = useHasPermission('prosecution.delete');

  // Search filters state
  const [filters, setFilters] = useState<ProsecutionSearchCriteria>({
    pageNumber: 1,
    pageSize: 10,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<ProsecutionCaseDto | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('');

  // Query hooks
  const { data: statistics, isLoading: isLoadingStats } = useProsecutionStatistics();
  const { data: stations = [] } = useStations();
  const {
    data: searchResult,
    isLoading: isLoadingCases,
    isFetching,
  } = useProsecutionSearch(filters);

  // Mutation hooks
  const updateMutation = useUpdateProsecution();
  const deleteMutation = useDeleteProsecution();
  const downloadChargeSheetMutation = useDownloadChargeSheet();

  // Handle search
  const handleSearch = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      caseNo: searchTerm || undefined,
      vehicleRegNumber: undefined,
      pageNumber: 1,
    }));
  }, [searchTerm]);

  // Handle filter change
  const handleFilterChange = useCallback((key: keyof ProsecutionSearchCriteria, value: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
      pageNumber: 1,
    }));
  }, []);

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, pageNumber: page }));
  }, []);

  // Reset filters
  const handleResetFilters = useCallback(() => {
    setFilters({ pageNumber: 1, pageSize: 10 });
    setSearchTerm('');
  }, []);

  // Open edit dialog
  const handleEditClick = (item: ProsecutionCaseDto) => {
    setSelectedCase(item);
    setEditNotes(item.caseNotes || '');
    setEditStatus(item.status);
    setEditDialogOpen(true);
  };

  // Handle update
  const handleUpdate = async () => {
    if (!selectedCase) return;
    try {
      await updateMutation.mutateAsync({
        id: selectedCase.id,
        request: {
          caseNotes: editNotes,
          status: editStatus,
        },
      });
      toast.success('Prosecution case updated successfully');
      setEditDialogOpen(false);
      setSelectedCase(null);
    } catch {
      toast.error('Failed to update prosecution case');
    }
  };

  // Open delete dialog
  const handleDeleteClick = (item: ProsecutionCaseDto) => {
    setSelectedCase(item);
    setDeleteDialogOpen(true);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedCase) return;
    try {
      await deleteMutation.mutateAsync(selectedCase.id);
      toast.success('Prosecution case deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedCase(null);
    } catch {
      toast.error('Failed to delete prosecution case');
    }
  };

  // Open detail dialog
  const handleViewClick = (item: ProsecutionCaseDto) => {
    setSelectedCase(item);
    setDetailDialogOpen(true);
  };

  // Download charge sheet
  const handleDownloadChargeSheet = async (id: string) => {
    try {
      await downloadChargeSheetMutation.mutateAsync(id);
      toast.success('Charge sheet downloaded');
    } catch {
      toast.error('Failed to download charge sheet');
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case 'INVOICED':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Invoiced</Badge>;
      case 'PAID':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>;
      case 'COURT':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">In Court</Badge>;
      case 'CLOSED':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Closed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'KES') => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const cases = searchResult?.items || [];
  const totalPages = searchResult?.totalPages || 1;
  const currentPage = filters.pageNumber || 1;
  const totalCount = searchResult?.totalCount || 0;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full opacity-50" />
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                <Gavel className="h-5 w-5 text-slate-600" />
              </div>
              <div className="space-y-1">
                <CardDescription className="text-xs">Total Cases</CardDescription>
                <CardTitle className="text-2xl font-bold">
                  {isLoadingStats ? <Skeleton className="h-7 w-16" /> : statistics?.totalCases ?? 0}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-full opacity-50" />
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="space-y-1">
                <CardDescription className="text-xs">Pending</CardDescription>
                <CardTitle className="text-2xl font-bold text-yellow-600">
                  {isLoadingStats ? <Skeleton className="h-7 w-16" /> : statistics?.pendingCases ?? 0}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-gradient-to-br from-green-100 to-green-200 rounded-full opacity-50" />
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <Wallet className="h-5 w-5 text-green-600" />
              </div>
              <div className="space-y-1">
                <CardDescription className="text-xs">Paid</CardDescription>
                <CardTitle className="text-2xl font-bold text-green-600">
                  {isLoadingStats ? <Skeleton className="h-7 w-16" /> : statistics?.paidCases ?? 0}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full opacity-50" />
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <Banknote className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <CardDescription className="text-xs">Collected (KES)</CardDescription>
                <CardTitle className="text-2xl font-bold text-emerald-600">
                  {isLoadingStats ? (
                    <Skeleton className="h-7 w-24" />
                  ) : (
                    formatCurrency(statistics?.collectedFeesKes ?? 0)
                  )}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card className="flex-1">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Search and Filter */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by case number or vehicle..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10 pr-10"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button onClick={handleSearch} disabled={isFetching}>
                Search
              </Button>
            </div>
            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['prosecutions'] })}
                disabled={isFetching}
              >
                <RefreshCcw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-muted/50 rounded-lg mt-4">
              <div className="space-y-2">
                <Label>Station</Label>
                <Select
                  value={filters.stationId || 'all'}
                  onValueChange={(v) => handleFilterChange('stationId', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All stations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stations</SelectItem>
                    {stations.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(v) => handleFilterChange('status', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="INVOICED">Invoiced</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="COURT">In Court</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date From</Label>
                <Input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Date To</Label>
                <Input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>

              <div className="space-y-2 flex items-end">
                <Button variant="outline" onClick={handleResetFilters} className="w-full">
                  Reset Filters
                </Button>
              </div>
            </div>
          )}

          {/* Results summary */}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="font-normal">
              {totalCount} {totalCount === 1 ? 'case' : 'cases'}
            </Badge>
            {(searchTerm || filters.status || filters.dateFrom || filters.dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={handleResetFilters}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-t">
            <ScrollArea className="max-h-[calc(100vh-480px)] min-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold w-[120px]">Case No</TableHead>
                    <TableHead className="font-semibold min-w-[100px]">Vehicle</TableHead>
                    <TableHead className="font-semibold text-center w-[100px]">Status</TableHead>
                    <TableHead className="font-semibold text-right w-[100px]">Overload (kg)</TableHead>
                    <TableHead className="font-semibold text-right w-[130px]">Fine</TableHead>
                    <TableHead className="font-semibold text-center w-[100px]">Framework</TableHead>
                    <TableHead className="font-semibold w-[100px]">Date</TableHead>
                    <TableHead className="font-semibold text-right w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingCases ? (
                    <>
                      {[...Array(6)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell className="text-center"><Skeleton className="h-6 w-16 mx-auto rounded-full" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                          <TableCell className="text-center"><Skeleton className="h-6 w-20 mx-auto rounded-full" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                        </TableRow>
                      ))}
                    </>
                  ) : cases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-48">
                        <div className="flex flex-col items-center justify-center text-center py-8">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                            <Gavel className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <p className="text-base font-medium text-muted-foreground mb-1">
                            {searchTerm || filters.status ? 'No cases match your filters' : 'No prosecution cases yet'}
                          </p>
                          <p className="text-sm text-muted-foreground/70">
                            {searchTerm || filters.status
                              ? 'Try adjusting your search or filter criteria'
                              : 'Prosecution cases will appear here when created from case register'}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    cases.map((item) => (
                      <TableRow key={item.id} className="group">
                        <TableCell className="font-mono font-medium text-primary">
                          {item.caseNo}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{item.vehicleRegNumber || '-'}</span>
                            {item.weighingTicketNo && (
                              <span className="text-xs text-muted-foreground">Ticket: {item.weighingTicketNo}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(item.status)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={item.gvwOverloadKg > 0 ? 'text-red-600 font-semibold' : ''}>
                            {item.gvwOverloadKg > 0 ? `+${item.gvwOverloadKg.toLocaleString()}` : '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatCurrency(
                            item.chargingCurrency === 'USD' ? item.totalFeeUsd : item.totalFeeKes,
                            item.chargingCurrency || 'KES'
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={item.bestChargeBasis === 'GVW' ? 'default' : 'secondary'}>
                            {item.bestChargeBasis || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewClick(item)}
                              title="View Details"
                              className="h-8 w-8"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadChargeSheet(item.id)}
                              title="Download Charge Sheet"
                              className="h-8 w-8"
                              disabled={downloadChargeSheetMutation.isPending}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditClick(item)}
                                title="Edit"
                                className="h-8 w-8"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(item)}
                                title="Delete"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          {/* Pagination */}
          {totalCount > 0 && (
            <Pagination
              page={currentPage}
              pageSize={filters.pageSize || 10}
              totalItems={totalCount}
              onPageChange={handlePageChange}
              onPageSizeChange={(size) => setFilters((prev) => ({ ...prev, pageSize: size, pageNumber: 1 }))}
              isLoading={isLoadingCases}
              className="px-4 py-3 border-t"
            />
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              Prosecution Case Details
            </DialogTitle>
            <DialogDescription>
              Case No: {selectedCase?.caseNo}
            </DialogDescription>
          </DialogHeader>
          {selectedCase && (
            <div className="space-y-6">
              {/* Case Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Vehicle Registration</Label>
                  <p className="font-medium">{selectedCase.vehicleRegNumber || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div>{getStatusBadge(selectedCase.status)}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Weighing Ticket</Label>
                  <p className="font-medium">{selectedCase.weighingTicketNo || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Prosecution Officer</Label>
                  <p className="font-medium">{selectedCase.prosecutionOfficerName || '-'}</p>
                </div>
              </div>

              {/* Charge Breakdown */}
              <div className="rounded-lg border bg-muted/30 p-4">
                <h4 className="text-sm font-semibold mb-3">Charge Breakdown</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GVW Overload:</span>
                    <span className="font-mono">{selectedCase.gvwOverloadKg.toLocaleString()} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GVW Fee ({selectedCase.chargingCurrency || 'KES'}):</span>
                    <span className="font-mono">{formatCurrency(
                      selectedCase.chargingCurrency === 'USD' ? selectedCase.gvwFeeUsd : selectedCase.gvwFeeKes,
                      selectedCase.chargingCurrency || 'KES'
                    )}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Axle Overload:</span>
                    <span className="font-mono">{selectedCase.maxAxleOverloadKg.toLocaleString()} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Axle Fee ({selectedCase.chargingCurrency || 'KES'}):</span>
                    <span className="font-mono">{formatCurrency(
                      selectedCase.chargingCurrency === 'USD' ? selectedCase.maxAxleFeeUsd : selectedCase.maxAxleFeeKes,
                      selectedCase.chargingCurrency || 'KES'
                    )}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Charge Basis:</span>
                    <Badge variant="outline">{selectedCase.bestChargeBasis}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Penalty Multiplier:</span>
                    <span className="font-mono">{selectedCase.penaltyMultiplier}x</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between items-center">
                  <span className="font-semibold">Total Fine:</span>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{formatCurrency(
                      selectedCase.chargingCurrency === 'USD' ? selectedCase.totalFeeUsd : selectedCase.totalFeeKes,
                      selectedCase.chargingCurrency || 'KES'
                    )}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedCase.chargingCurrency === 'USD'
                        ? `(KES ${selectedCase.totalFeeKes.toLocaleString()} @ ${selectedCase.forexRate})`
                        : `(USD ${selectedCase.totalFeeUsd.toLocaleString()} @ ${selectedCase.forexRate})`
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedCase.caseNotes && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Case Notes</Label>
                  <p className="text-sm p-3 bg-muted rounded-md">{selectedCase.caseNotes}</p>
                </div>
              )}

              {/* Dates */}
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Created: {formatDate(selectedCase.createdAt)}</span>
                <span>Updated: {formatDate(selectedCase.updatedAt)}</span>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => handleDownloadChargeSheet(selectedCase.id)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Charge Sheet
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Prosecution Case</DialogTitle>
            <DialogDescription>
              Update status and notes for case {selectedCase?.caseNo}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="INVOICED">Invoiced</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="COURT">In Court</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Case Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Enter case notes..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Prosecution Case?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete case <strong>{selectedCase?.caseNo}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
