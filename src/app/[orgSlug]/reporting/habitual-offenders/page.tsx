'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ConvictionHistory } from '@/components/case';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useHabitualOffenders } from '@/hooks/queries';
import { useCurrency } from '@/hooks/useCurrency';
import type { HabitualOffenderDto, HabitualOffendersParams } from '@/lib/api/prosecution';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpDown,
  Filter,
  Gavel,
  RefreshCcw,
  Truck,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import { useQueryClient } from '@tanstack/react-query';

type SortField = 'totalConvictions' | 'firstConvictionDate' | 'lastConvictionDate' | 'totalFinesKes';
type SortDir = 'asc' | 'desc';

export default function HabitualOffendersPage() {
  return (
    <AppShell
      title="Habitual Offenders Report"
      subtitle="Vehicles with multiple prosecutions"
    >
      <ProtectedRoute requiredPermissions={['prosecution.read']}>
        <HabitualOffendersContent />
      </ProtectedRoute>
    </AppShell>
  );
}

function HabitualOffendersContent() {
  const orgSlug = useOrgSlug();
  const queryClient = useQueryClient();
  const { formatAmount } = useCurrency();

  const [params, setParams] = useState<HabitualOffendersParams>({
    minConvictions: 2,
    pageNumber: 1,
    pageSize: 20,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [minConvInput, setMinConvInput] = useState('2');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortField, setSortField] = useState<SortField>('totalConvictions');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Detail dialog
  const [selectedVehicle, setSelectedVehicle] = useState<HabitualOffenderDto | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data, isLoading, isFetching } = useHabitualOffenders(params);

  const handleApplyFilters = useCallback(() => {
    setParams((prev) => ({
      ...prev,
      minConvictions: parseInt(minConvInput, 10) || 2,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      pageNumber: 1,
    }));
  }, [minConvInput, fromDate, toDate]);

  const handleResetFilters = useCallback(() => {
    setMinConvInput('2');
    setFromDate('');
    setToDate('');
    setParams({ minConvictions: 2, pageNumber: 1, pageSize: 20 });
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setParams((prev) => ({ ...prev, pageNumber: page }));
  }, []);

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDir('desc');
      }
    },
    [sortField]
  );

  const handleRowClick = useCallback((offender: HabitualOffenderDto) => {
    setSelectedVehicle(offender);
    setDetailOpen(true);
  }, []);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  // Client-side sort the current page
  const items = [...(data?.items ?? [])].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    }
    const aStr = String(aVal);
    const bStr = String(bVal);
    return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
  });

  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const SortableHead = ({
    field,
    children,
    className = '',
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) => (
    <TableHead
      className={`font-semibold whitespace-nowrap cursor-pointer select-none hover:bg-muted/50 ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className={`h-3 w-3 ${sortField === field ? 'text-primary' : 'text-muted-foreground/50'}`} />
      </div>
    </TableHead>
  );

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Back link */}
      <div className="flex items-center gap-2">
        <Link href={`/${orgSlug}/reporting`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Reports
          </Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-gradient-to-br from-red-100 to-red-200 rounded-full opacity-50" />
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="space-y-1">
                <CardDescription className="text-xs">Habitual Offenders</CardDescription>
                <CardTitle className="text-2xl font-bold text-red-600">
                  {isLoading ? <Skeleton className="h-7 w-16" /> : totalCount}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full opacity-50" />
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <Gavel className="h-5 w-5 text-amber-600" />
              </div>
              <div className="space-y-1">
                <CardDescription className="text-xs">Min. Convictions Filter</CardDescription>
                <CardTitle className="text-2xl font-bold text-amber-600">
                  {params.minConvictions ?? 2}+
                </CardTitle>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full opacity-50" />
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Truck className="h-5 w-5 text-blue-600" />
              </div>
              <div className="space-y-1">
                <CardDescription className="text-xs">Vehicles on Page</CardDescription>
                <CardTitle className="text-2xl font-bold text-blue-600">
                  {isLoading ? <Skeleton className="h-7 w-16" /> : items.length}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Main table card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-lg">Habitual Offenders</CardTitle>
              <CardDescription>
                Vehicles with {params.minConvictions ?? 2} or more prosecution cases
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  queryClient.invalidateQueries({
                    queryKey: ['prosecutions', 'habitual-offenders'],
                  })
                }
                disabled={isFetching}
              >
                <RefreshCcw
                  className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
                />
                Refresh
              </Button>
            </div>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg mt-4">
              <div className="space-y-2">
                <Label>Min. Convictions</Label>
                <Input
                  type="number"
                  min="1"
                  value={minConvInput}
                  onChange={(e) => setMinConvInput(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
              <div className="space-y-2 flex items-end gap-2">
                <Button onClick={handleApplyFilters} className="flex-1">
                  Apply
                </Button>
                <Button variant="outline" onClick={handleResetFilters}>
                  Reset
                </Button>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <div className="border-t overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-semibold whitespace-nowrap">Vehicle Reg</TableHead>
                  <SortableHead field="totalConvictions" className="text-center">
                    Total Convictions
                  </SortableHead>
                  <SortableHead field="firstConvictionDate">
                    First Conviction
                  </SortableHead>
                  <SortableHead field="lastConvictionDate">
                    Last Conviction
                  </SortableHead>
                  <SortableHead field="totalFinesKes" className="text-right">
                    Total Fines (KES)
                  </SortableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <>
                    {[...Array(6)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell className="text-center"><Skeleton className="h-6 w-8 mx-auto" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48">
                      <div className="flex flex-col items-center justify-center text-center py-8">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                          <Truck className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-base font-medium text-muted-foreground mb-1">
                          No habitual offenders found
                        </p>
                        <p className="text-sm text-muted-foreground/70">
                          Try lowering the minimum convictions threshold or expanding the date range.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((offender) => (
                    <TableRow
                      key={offender.vehicleId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(offender)}
                    >
                      <TableCell className="font-mono font-bold">
                        {offender.vehicleRegNumber}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={
                            offender.totalConvictions >= 3
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {offender.totalConvictions}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(offender.firstConvictionDate)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(offender.lastConvictionDate)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatAmount(offender.totalFinesKes, 'KES')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalCount > 0 && (
            <Pagination
              page={params.pageNumber ?? 1}
              pageSize={params.pageSize ?? 20}
              totalItems={totalCount}
              onPageChange={handlePageChange}
              onPageSizeChange={(size) =>
                setParams((prev) => ({ ...prev, pageSize: size, pageNumber: 1 }))
              }
              isLoading={isLoading}
              className="px-4 py-3 border-t"
            />
          )}
        </CardContent>
      </Card>

      {/* Vehicle conviction history detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Conviction History: {selectedVehicle?.vehicleRegNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedVehicle && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Convictions</span>
                  <p className="font-bold text-lg">{selectedVehicle.totalConvictions}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Fines (KES)</span>
                  <p className="font-bold font-mono">
                    {formatAmount(selectedVehicle.totalFinesKes, 'KES')}
                  </p>
                </div>
              </div>
              <ConvictionHistory vehicleId={selectedVehicle.vehicleId} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
