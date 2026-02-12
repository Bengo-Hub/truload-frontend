"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  useClosureChecklist, useClosureTypes, useUpdateChecklist,
  useRequestChecklistReview, useApproveChecklistReview, useRejectChecklistReview,
} from '@/hooks/queries';
import { CheckCircle, ClipboardCheck, Clock, Loader2, Send, XCircle } from 'lucide-react';
import { useHasPermission } from '@/hooks/useAuth';
import { toast } from 'sonner';

const SUBFILE_LABELS: Record<string, string> = {
  subfileAComplete: 'A - Case Summary',
  subfileBComplete: 'B - Evidence',
  subfileCComplete: 'C - Weighing Records',
  subfileDComplete: 'D - Driver Documents',
  subfileEComplete: 'E - Vehicle Documents',
  subfileFComplete: 'F - Legal Notices',
  subfileGComplete: 'G - Court Filings',
  subfileHComplete: 'H - Payment Records',
  subfileIComplete: 'I - Correspondence',
  subfileJComplete: 'J - Miscellaneous',
};

type SubfileKey = keyof typeof SUBFILE_LABELS;

function getReviewBadge(status?: string) {
  switch (status?.toLowerCase()) {
    case 'pending review': return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>;
    case 'approved': return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
    case 'rejected': return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    default: return status ? <Badge variant="secondary">{status}</Badge> : null;
  }
}

interface Props {
  caseId: string;
  caseNo: string;
}

export function ClosureChecklistPanel({ caseId, caseNo }: Props) {
  const canClose = useHasPermission('case.close');
  const { data: checklist, isLoading } = useClosureChecklist(caseId);
  const { data: closureTypes = [] } = useClosureTypes();
  const updateMutation = useUpdateChecklist();
  const requestReviewMutation = useRequestChecklistReview();
  const approveMutation = useApproveChecklistReview();
  const rejectMutation = useRejectChecklistReview();

  const [closureTypeId, setClosureTypeId] = useState('');
  const [subfileChecks, setSubfileChecks] = useState<Record<SubfileKey, boolean>>({
    subfileAComplete: false, subfileBComplete: false, subfileCComplete: false,
    subfileDComplete: false, subfileEComplete: false, subfileFComplete: false,
    subfileGComplete: false, subfileHComplete: false, subfileIComplete: false,
    subfileJComplete: false,
  });

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  // Sync state from fetched checklist
  useEffect(() => {
    if (checklist) {
      setClosureTypeId(checklist.closureTypeId ?? '');
      setSubfileChecks({
        subfileAComplete: checklist.subfileAComplete,
        subfileBComplete: checklist.subfileBComplete,
        subfileCComplete: checklist.subfileCComplete,
        subfileDComplete: checklist.subfileDComplete,
        subfileEComplete: checklist.subfileEComplete,
        subfileFComplete: checklist.subfileFComplete,
        subfileGComplete: checklist.subfileGComplete,
        subfileHComplete: checklist.subfileHComplete,
        subfileIComplete: checklist.subfileIComplete,
        subfileJComplete: checklist.subfileJComplete,
      });
    }
  }, [checklist]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        caseId,
        request: {
          closureTypeId: closureTypeId || undefined,
          ...subfileChecks,
        },
      });
      toast.success('Checklist saved');
    } catch {
      toast.error('Failed to save checklist');
    }
  };

  const handleRequestReview = async () => {
    try {
      await requestReviewMutation.mutateAsync({
        caseId,
        request: { reviewNotes: reviewNotes || undefined },
      });
      toast.success('Review requested');
      setShowReviewModal(false);
      setReviewNotes('');
    } catch {
      toast.error('Failed to request review');
    }
  };

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync({
        caseId,
        request: { reviewNotes: reviewNotes || undefined },
      });
      toast.success('Review approved');
      setShowApproveModal(false);
      setReviewNotes('');
    } catch {
      toast.error('Failed to approve');
    }
  };

  const handleReject = async () => {
    try {
      await rejectMutation.mutateAsync({
        caseId,
        request: { reviewNotes: reviewNotes || undefined },
      });
      toast.success('Review rejected');
      setShowRejectModal(false);
      setReviewNotes('');
    } catch {
      toast.error('Failed to reject');
    }
  };

  const toggleCheck = (key: SubfileKey) => {
    setSubfileChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

  const isPending = checklist?.reviewStatusName?.toLowerCase().includes('pending');
  const isApproved = checklist?.reviewStatusName?.toLowerCase() === 'approved';
  const isRejected = checklist?.reviewStatusName?.toLowerCase() === 'rejected';

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-emerald-500" />
            Closure Checklist
            {checklist?.reviewStatusName && (
              <span className="ml-2">{getReviewBadge(checklist.reviewStatusName)}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Closure Type */}
          <div className="space-y-2">
            <Label>Closure Type</Label>
            <Select value={closureTypeId} onValueChange={setClosureTypeId} disabled={!canClose || isApproved}>
              <SelectTrigger><SelectValue placeholder="Select closure type" /></SelectTrigger>
              <SelectContent>
                {closureTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subfile Checklist */}
          <div className="space-y-2">
            <Label>Subfile Verification</Label>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(SUBFILE_LABELS) as SubfileKey[]).map((key) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={subfileChecks[key]}
                    onCheckedChange={() => toggleCheck(key)}
                    disabled={!canClose || isApproved}
                  />
                  <label htmlFor={key} className="text-sm cursor-pointer">
                    {SUBFILE_LABELS[key]}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Verification Status */}
          {checklist?.allSubfilesVerified && (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">All subfiles verified</span>
            </div>
          )}

          {/* Review Info */}
          {isApproved && checklist?.approvedByName && (
            <div className="p-3 bg-green-50 rounded-lg text-sm">
              <p><strong>Approved by:</strong> {checklist.approvedByName}</p>
              <p><strong>Date:</strong> {formatDate(checklist.approvedAt)}</p>
              {checklist.reviewNotes && <p><strong>Notes:</strong> {checklist.reviewNotes}</p>}
            </div>
          )}
          {isRejected && (
            <div className="p-3 bg-red-50 rounded-lg text-sm">
              <p className="text-red-800 font-medium">Review was rejected</p>
              {checklist?.reviewNotes && <p><strong>Notes:</strong> {checklist.reviewNotes}</p>}
            </div>
          )}

          {/* Action Buttons */}
          {canClose && !isApproved && (
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Checklist
              </Button>
              {!isPending && (
                <Button variant="outline" onClick={() => setShowReviewModal(true)}>
                  <Send className="h-4 w-4 mr-2" /> Request Review
                </Button>
              )}
              {isPending && (
                <>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={() => setShowApproveModal(true)}>
                    <CheckCircle className="h-4 w-4 mr-2" /> Approve
                  </Button>
                  <Button variant="destructive" onClick={() => setShowRejectModal(true)}>
                    <XCircle className="h-4 w-4 mr-2" /> Reject
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Review Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Closure Review</DialogTitle>
            <DialogDescription>Submit checklist for review before closing case {caseNo}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Review Notes</Label>
              <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Notes for the reviewer..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewModal(false)}>Cancel</Button>
            <Button onClick={handleRequestReview} disabled={requestReviewMutation.isPending}>
              {requestReviewMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Submit for Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Modal */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Closure</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Approval notes..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveModal(false)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Closure</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rejection Reason *</Label>
              <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Reason for rejection..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending}>
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
