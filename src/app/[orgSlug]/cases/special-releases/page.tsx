'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  useApproveSpecialRelease,
  usePendingSpecialReleases,
  useRejectSpecialRelease,
} from '@/hooks/queries/useCaseRegisterQueries';
import type { PendingSpecialReleasesParams } from '@/lib/api/caseRegister';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  Loader2,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { AxiosError } from 'axios';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export default function SpecialReleasesListPage() {
  return (
    <ProtectedRoute requiredPermissions={['case.special_release']}>
      <AppShell
        title="Special releases"
        subtitle="Review and approve or reject pending special release requests"
      >
        <SpecialReleasesContent />
      </AppShell>
    </ProtectedRoute>
  );
}

const PAGE_SIZE = 15;

function SpecialReleasesContent() {
  const orgSlug = useOrgSlug();
  const approveMutation = useApproveSpecialRelease();
  const rejectMutation = useRejectSpecialRelease();

  // Search / filter state
  const [caseNo, setCaseNo] = useState('');
  const [releaseType, setReleaseType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const params: PendingSpecialReleasesParams = {
    caseNo: caseNo.trim() || undefined,
    releaseType: releaseType.trim() || undefined,
    from: from || undefined,
    to: to || undefined,
    pageNumber: page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading, refetch } = usePendingSpecialReleases(params);

  const pending = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // Reject modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleSearch = useCallback(() => {
    setPage(1);
    refetch();
  }, [refetch]);

  const handleClearFilters = useCallback(() => {
    setCaseNo('');
    setReleaseType('');
    setFrom('');
    setTo('');
    setPage(1);
  }, []);

  const handleApprove = useCallback(
    (id: string) => {
      approveMutation.mutate(id, {
        onSuccess: () => {
          toast.success('Special release approved');
          refetch();
        },
        onError: (err) => {
          const axiosErr = err as AxiosError<string>;
          const msg =
            axiosErr.response?.data && typeof axiosErr.response.data === 'string'
              ? axiosErr.response.data
              : 'Failed to approve special release';
          toast.error(msg);
        },
      });
    },
    [approveMutation, refetch]
  );

  const openRejectModal = useCallback((id: string) => {
    setSelectedId(id);
    setRejectionReason('');
    setRejectModalOpen(true);
  }, []);

  const handleRejectSubmit = useCallback(() => {
    if (!selectedId || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    rejectMutation.mutate(
      { id: selectedId, reason: rejectionReason.trim() },
      {
        onSuccess: () => {
          toast.success('Special release rejected');
          setRejectModalOpen(false);
          setSelectedId(null);
          setRejectionReason('');
          refetch();
        },
        onError: (err) => {
          const axiosErr = err as AxiosError<string>;
          const msg =
            axiosErr.response?.data && typeof axiosErr.response.data === 'string'
              ? axiosErr.response.data
              : 'Failed to reject special release';
          toast.error(msg);
        },
      }
    );
  }, [selectedId, rejectionReason, rejectMutation, refetch]);

  return (
    <div className="space-y-6">
      {/* Search / filter bar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Case No.</Label>
              <Input
                placeholder="e.g. CAS-2024-00001"
                value={caseNo}
                onChange={(e) => setCaseNo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Release Type</Label>
              <Input
                placeholder="e.g. Tolerance"
                value={releaseType}
                onChange={(e) => setReleaseType(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date From</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date To</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={handleSearch}>Search</Button>
            <Button size="sm" variant="ghost" onClick={handleClearFilters}>Clear</Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? 'Loading...'
            : totalCount === 0
            ? 'No pending special release requests match your filters.'
            : `${totalCount} pending request(s) awaiting approval.`}
        </p>
        {totalPages > 1 && (
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
        )}
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
              <CardContent><Skeleton className="h-16 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && pending.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle className="text-lg">No pending requests</CardTitle>
            <CardDescription className="mt-1 text-center max-w-sm">
              When officers request special release for overloaded vehicles, those requests will appear here for approval or rejection.
            </CardDescription>
            <Button asChild variant="outline" className="mt-6">
              <Link href={`/${orgSlug}/cases`}>View case register</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Release list */}
      {!isLoading && pending.length > 0 && (
        <div className="space-y-4">
          {pending.map((release) => {
            const isPending = !release.isApproved && !release.isRejected;
            return (
              <Card key={release.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base">
                        Case {release.caseNo} · {release.certificateNo}
                      </CardTitle>
                      <Badge variant="secondary">{release.releaseType}</Badge>
                      {release.isApproved && (
                        <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>
                      )}
                      {release.isRejected && (
                        <Badge variant="destructive">Rejected</Badge>
                      )}
                      {isPending && (
                        <Badge variant="outline" className="text-amber-600 border-amber-400">Pending</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Requested by {release.createdByName} ·{' '}
                      {release.createdAt ? new Date(release.createdAt).toLocaleString() : '—'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {release.reason && (
                    <p className="text-sm text-muted-foreground">{release.reason}</p>
                  )}
                  {release.isRejected && release.rejectionReason && (
                    <p className="text-sm text-red-600">Rejection reason: {release.rejectionReason}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {isPending && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(release.id)}
                          disabled={approveMutation.isPending}
                        >
                          {approveMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openRejectModal(release.id)}
                          disabled={rejectMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/${orgSlug}/cases/${release.caseRegisterId}`}>
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View case
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Reject dialog */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject special release</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this request. The requester may see this reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">Reason</Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Documentation incomplete, overload exceeds policy limit..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectSubmit}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
