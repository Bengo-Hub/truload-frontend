'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { StationSelectFilter } from '@/components/filters/StationSelectFilter';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination } from '@/components/ui/pagination';
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
import type { CaseRegisterDto, CaseSearchParams } from '@/lib/api/caseRegister';
import {
    AlertCircle,
    BookOpen,
    CheckCircle2,
    Clock,
    FileStack,
    FileText,
    Filter,
    FolderOpen,
    Gavel,
    Loader2,
    RefreshCcw,
    Search,
    Shield,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useState } from 'react';

/**
 * Case Management list: escalated cases only.
 * Separate from Case Register; focus on subfiles A–J, hearings, diary, closure checklist.
 * Case detail is at /case-management/[id] with full 8-tab workflow interface.
 */
export default function CaseManagementPage() {
  const orgSlug = useOrgSlug();
  const [filters, setFilters] = useState<CaseSearchParams>({
    pageNumber: 1,
    pageSize: 10,
    escalatedToCaseManager: true, // only escalated cases
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: caseStats } = useCaseStatistics();
  const { data: caseStatuses = [] } = useCaseStatuses();
  const { data: violationTypes = [] } = useViolationTypes();
  const {
    data: casesResult,
    isLoading: isLoadingCases,
    refetch,
    isFetching,
  } = useCaseSearch(filters);

  const handleSearch = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      generalSearch: searchTerm || undefined,
      caseNo: undefined,
      pageNumber: 1,
    }));
  }, [searchTerm]);

  const handleFilterChange = useCallback((key: keyof CaseSearchParams, value: string | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
      pageNumber: 1,
    }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, pageNumber: page }));
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'OPEN':
        return <Badge className="bg-blue-100 text-blue-800">Open</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'ESCALATED':
        return <Badge className="bg-orange-100 text-orange-800">Escalated</Badge>;
      case 'CLOSED':
        return <Badge className="bg-green-100 text-green-800">Closed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const cases = casesResult?.items ?? [];
  const currentPage = filters.pageNumber ?? 1;

  return (
    <ProtectedRoute requiredPermissions={['case.read']}>
      <AppShell
        title="Case management"
        subtitle="Escalated cases: subfiles, hearings, diary, closure checklist"
      >
        <div className="space-y-6">
          {/* Statistics Overview */}
          {caseStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <FolderOpen className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{caseStats.escalatedCases}</p>
                      <p className="text-xs text-muted-foreground">Total Escalated</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <AlertCircle className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{caseStats.openCases}</p>
                      <p className="text-xs text-muted-foreground">Open Cases</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-100">
                      <Clock className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{caseStats.pendingCases}</p>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{caseStats.closedCases}</p>
                      <p className="text-xs text-muted-foreground">Closed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Escalated cases</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                    <RefreshCcw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/${orgSlug}/cases`}>Case register</Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by case number or vehicle reg..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleSearch} disabled={isFetching}>
                  Search
                </Button>
              </div>

              {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg mb-4">
                  <StationSelectFilter
                    value={filters.stationId ?? undefined}
                    onValueChange={(v) => handleFilterChange('stationId', v)}
                    label="Station"
                    placeholder="All stations"
                    onStationChange={refetch}
                  />
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={filters.caseStatusId ?? 'all'}
                      onValueChange={(v) => handleFilterChange('caseStatusId', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        {caseStatuses.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Violation type</Label>
                    <Select
                      value={filters.violationTypeId ?? 'all'}
                      onValueChange={(v) => handleFilterChange('violationTypeId', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {violationTypes.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Case no</TableHead>
                      <TableHead className="font-semibold">Vehicle</TableHead>
                      <TableHead className="font-semibold">Violation</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Created</TableHead>
                      <TableHead className="font-semibold">Workflows</TableHead>
                      <TableHead className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingCases ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                          <p className="text-muted-foreground mt-2">Loading cases...</p>
                        </TableCell>
                      </TableRow>
                    ) : cases.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                          <p className="text-muted-foreground">No escalated cases found</p>
                          <p className="text-sm text-muted-foreground/80">
                            Escalate cases from the Case register to see them here.
                          </p>
                          <Button asChild variant="outline" className="mt-4">
                            <Link href={`/${orgSlug}/cases`}>Go to Case register</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ) : (
                      cases.map((caseItem: CaseRegisterDto) => (
                        <TableRow key={caseItem.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono font-medium">{caseItem.caseNo}</TableCell>
                          <TableCell>
                            <span className="font-medium">{caseItem.vehicleRegNumber}</span>
                            {caseItem.driverName && (
                              <p className="text-xs text-muted-foreground">{caseItem.driverName}</p>
                            )}
                          </TableCell>
                          <TableCell>{caseItem.violationType}</TableCell>
                          <TableCell>{getStatusBadge(caseItem.caseStatus)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {caseItem.createdAt
                              ? new Date(caseItem.createdAt).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Subfiles" asChild>
                                <Link href={`/${orgSlug}/case-management/${caseItem.id}?tab=subfiles`}>
                                  <FileStack className="h-3.5 w-3.5 text-blue-600" />
                                </Link>
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Hearings" asChild>
                                <Link href={`/${orgSlug}/case-management/${caseItem.id}?tab=hearings`}>
                                  <Gavel className="h-3.5 w-3.5 text-purple-600" />
                                </Link>
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Diary" asChild>
                                <Link href={`/${orgSlug}/case-management/${caseItem.id}?tab=diary`}>
                                  <BookOpen className="h-3.5 w-3.5 text-orange-600" />
                                </Link>
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Warrants" asChild>
                                <Link href={`/${orgSlug}/case-management/${caseItem.id}?tab=warrants`}>
                                  <Shield className="h-3.5 w-3.5 text-red-600" />
                                </Link>
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Closure" asChild>
                                <Link href={`/${orgSlug}/case-management/${caseItem.id}?tab=closure`}>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/${orgSlug}/case-management/${caseItem.id}`}>Manage</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {(casesResult?.totalCount ?? 0) > (filters.pageSize ?? 10) && (
                <Pagination
                  page={currentPage}
                  pageSize={filters.pageSize ?? 10}
                  totalItems={casesResult?.totalCount ?? 0}
                  onPageChange={handlePageChange}
                  className="mt-4"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
