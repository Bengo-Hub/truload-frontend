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
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
    useApproveSpecialRelease,
    usePendingSpecialReleases,
    useRejectSpecialRelease,
} from '@/hooks/queries/useCaseRegisterQueries';
import { CheckCircle2, ExternalLink, Loader2, ShieldAlert, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

/**
 * Dedicated Special Release page: list pending requests and approve/reject with permissions.
 * Backend APIs: GET pending, POST approve, POST reject.
 */
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

function SpecialReleasesContent() {
  const { data: pending = [], isLoading, refetch } = usePendingSpecialReleases();
  const approveMutation = useApproveSpecialRelease();
  const rejectMutation = useRejectSpecialRelease();
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = useCallback(
    (id: string) => {
      approveMutation.mutate(id, {
        onSuccess: () => {
          toast.success('Special release approved');
          refetch();
        },
        onError: () => toast.error('Failed to approve'),
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
        onError: () => toast.error('Failed to reject'),
      }
    );
  }, [selectedId, rejectionReason, rejectMutation, refetch]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {pending.length === 0
            ? 'No pending special release requests.'
            : `${pending.length} pending request(s) awaiting approval.`}
        </p>
      </div>

      {pending.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle className="text-lg">No pending requests</CardTitle>
            <CardDescription className="mt-1 text-center max-w-sm">
              When officers request special release for overloaded vehicles, those requests will appear here for approval or rejection.
            </CardDescription>
            <Button asChild variant="outline" className="mt-6">
              <Link href="/cases">View case register</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pending.map((release) => (
            <Card key={release.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base">
                      Case {release.caseNo} · {release.certificateNo}
                    </CardTitle>
                    <Badge variant="secondary">{release.releaseType}</Badge>
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
                <div className="flex flex-wrap items-center gap-2">
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
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/cases/${release.caseRegisterId}`}>
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View case
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
              {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
