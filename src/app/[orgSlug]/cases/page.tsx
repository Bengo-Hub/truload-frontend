"use client";

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { StationSelectFilter } from '@/components/filters/StationSelectFilter';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination } from '@/components/ui/pagination';
import { PermissionActionButton } from '@/components/ui/permission-action-button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    useCaseSearch,
    useCaseStatistics,
    useCaseStatuses,
    useViolationTypes,
} from '@/hooks/queries';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import { CaseRegisterDto, CaseSearchParams } from '@/lib/api/caseRegister';
import {
    AlertCircle,
    ArrowUpRight,
    Eye,
    FileText,
    Filter,
    Loader2,
    RefreshCcw,
    Search,
    TrendingUp,
    XCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

/**
 * Case Register List Page
 *
 * Features:
 * - Case statistics dashboard cards
 * - Search and filter cases
 * - Paginated data table
 * - Quick actions (view, escalate)
 */
export default function CaseRegisterPage() {
  const router = useRouter();
  const orgSlug = useOrgSlug();

  // Search filters state
  const [filters, setFilters] = useState<CaseSearchParams>({
    pageNumber: 1,
    pageSize: 10,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleRegTerm, setVehicleRegTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Query hooks
  const { data: statistics, isLoading: isLoadingStats } = useCaseStatistics(filters.stationId);
  const { data: violationTypes = [] } = useViolationTypes();
  const { data: caseStatuses = [] } = useCaseStatuses();
  const {
    data: casesResult,
    isLoading: isLoadingCases,
    refetch,
    isFetching,
  } = useCaseSearch(filters);

  // Handle search
  const handleSearch = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      caseNo: searchTerm || undefined,
      vehicleRegNumber: vehicleRegTerm || undefined,
      pageNumber: 1,
    }));
  }, [searchTerm, vehicleRegTerm]);

  // Handle filter change
  const handleFilterChange = useCallback((key: keyof CaseSearchParams, value: string | undefined) => {
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
    setVehicleRegTerm('');
  }, []);

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'OPEN':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Open</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case 'ESCALATED':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Escalated</Badge>;
      case 'CLOSED':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Closed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Get violation severity badge
  const getSeverityBadge = (violationType: string) => {
    const type = violationTypes.find(v => v.name === violationType);
    const severity = type?.severity || 'medium';

    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'high':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Medium</Badge>;
      case 'low':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Low</Badge>;
      default:
        return null;
    }
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

  const cases = casesResult?.items || [];
  const totalPages = casesResult?.totalPages || 1;
  const currentPage = filters.pageNumber || 1;

  return (
    <AppShell title="Case Register" subtitle="Violation case management">
      <ProtectedRoute requiredPermissions={['case.read']}>
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Cases</p>
                    <p className="text-2xl font-bold">
                      {isLoadingStats ? <Loader2 className="h-5 w-5 animate-spin" /> : statistics?.totalCases ?? 0}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-500 opacity-75" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Open</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {isLoadingStats ? <Loader2 className="h-5 w-5 animate-spin" /> : statistics?.openCases ?? 0}
                    </p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-blue-500 opacity-75" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Escalated</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {isLoadingStats ? <Loader2 className="h-5 w-5 animate-spin" /> : statistics?.escalatedCases ?? 0}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-500 opacity-75" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Closed</p>
                    <p className="text-2xl font-bold text-green-600">
                      {isLoadingStats ? <Loader2 className="h-5 w-5 animate-spin" /> : statistics?.closedCases ?? 0}
                    </p>
                  </div>
                  <XCircle className="h-8 w-8 text-green-500 opacity-75" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Cases</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isFetching}
                  >
                    <RefreshCcw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  {/* Cases are created through the weighing workflow (violations), not manually */}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search Bar */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="flex-1 min-w-[180px] relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Case number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10"
                  />
                </div>
                <div className="flex-1 min-w-[180px] relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Vehicle reg (e.g. KCX091X)..."
                    value={vehicleRegTerm}
                    onChange={(e) => setVehicleRegTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleSearch} disabled={isFetching}>
                  Search
                </Button>
              </div>

              {/* Filters Panel */}
              {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg mb-4">
                  <StationSelectFilter
                    value={filters.stationId ?? undefined}
                    onValueChange={(v) => handleFilterChange('stationId', v)}
                    label="Station"
                    placeholder="All Stations"
                    onStationChange={refetch}
                  />

                  <div className="space-y-2">
                    <Label>Violation Type</Label>
                    <Select
                      value={filters.violationTypeId || 'all'}
                      onValueChange={(v) => handleFilterChange('violationTypeId', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {violationTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={filters.caseStatusId || 'all'}
                      onValueChange={(v) => handleFilterChange('caseStatusId', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        {caseStatuses.map((status) => (
                          <SelectItem key={status.id} value={status.id}>
                            {status.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Escalated</Label>
                    <Select
                      value={filters.escalatedToCaseManager === true ? 'yes' : filters.escalatedToCaseManager === false ? 'no' : 'all'}
                      onValueChange={(v) => {
                        setFilters(prev => ({
                          ...prev,
                          escalatedToCaseManager: v === 'yes' ? true : v === 'no' ? false : undefined,
                          pageNumber: 1,
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="yes">Escalated</SelectItem>
                        <SelectItem value="no">Not Escalated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 flex items-end">
                    <Button variant="outline" onClick={handleResetFilters} className="w-full">
                      Reset Filters
                    </Button>
                  </div>
                </div>
              )}

              {/* Data Table */}
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Case No</TableHead>
                      <TableHead className="font-semibold">Vehicle</TableHead>
                      <TableHead className="font-semibold">Violation</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Created</TableHead>
                      <TableHead className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingCases ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                          <p className="text-gray-500 mt-2">Loading cases...</p>
                        </TableCell>
                      </TableRow>
                    ) : cases.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <FileText className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                          <p className="text-gray-500">No cases found</p>
                          <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      cases.map((caseItem: CaseRegisterDto) => (
                        <TableRow key={caseItem.id} className="hover:bg-gray-50">
                          <TableCell className="font-mono font-medium">
                            {caseItem.caseNo}
                          </TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium">{caseItem.vehicleRegNumber}</span>
                              {caseItem.driverName && (
                                <p className="text-xs text-gray-500">{caseItem.driverName}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{caseItem.violationType}</span>
                              {getSeverityBadge(caseItem.violationType)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {getStatusBadge(caseItem.caseStatus)}
                              {caseItem.escalatedToCaseManager && (
                                <Badge variant="outline" className="text-xs">
                                  Escalated
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-500">
                            {formatDate(caseItem.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <PermissionActionButton
                                permission="case.read"
                                icon={Eye}
                                label="View"
                                onClick={() => router.push(`/${orgSlug}/cases/${caseItem.id}`)}
                              />
                              <PermissionActionButton
                                permission="case.escalate"
                                icon={ArrowUpRight}
                                label="Escalate"
                                onClick={() => router.push(`/${orgSlug}/cases/${caseItem.id}?tab=prosecution`)}
                                condition={!caseItem.escalatedToCaseManager && caseItem.caseStatus !== 'closed'}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {casesResult && casesResult.totalCount > 0 && (
                <Pagination
                  page={currentPage}
                  pageSize={filters.pageSize || 10}
                  totalItems={casesResult.totalCount}
                  onPageChange={handlePageChange}
                  onPageSizeChange={(size) => setFilters((prev) => ({ ...prev, pageSize: size, pageNumber: 1 }))}
                  isLoading={isLoadingCases}
                  className="mt-4"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    </AppShell>
  );
}
