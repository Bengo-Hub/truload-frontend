"use client";

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  useCaseByWeighingId,
  useCreateCaseFromWeighing,
  useCreateSpecialRelease,
  useReleaseTypes,
  useSpecialReleasesByCase,
  usePendingSpecialReleases,
  useApproveSpecialRelease,
  useRejectSpecialRelease,
} from '@/hooks/queries';
import { useWeighingTransaction } from '@/hooks/queries/useWeighingQueries';
import { downloadSpecialReleaseCertificate, SpecialReleaseDto } from '@/lib/api/caseRegister';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  FileText,
  Loader2,
  Scale,
  Send,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

/**
 * Special Release Workflow Page
 *
 * This page handles the special release process for overloaded vehicles:
 * 1. Load weighing transaction data
 * 2. Auto-create case from weighing if needed
 * 3. Submit special release request with justification
 * 4. Track approval status and download certificate
 */
export default function SpecialReleasePage() {
  return (
    <Suspense fallback={
      <AppShell title="Special Release" subtitle="Request special release for overloaded vehicles">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-4" />
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      </AppShell>
    }>
      <SpecialReleaseContent />
    </Suspense>
  );
}

function SpecialReleaseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const transactionId = searchParams.get('transactionId');

  // Form state
  const [selectedReleaseTypeId, setSelectedReleaseTypeId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [requiresRedistribution, setRequiresRedistribution] = useState(false);
  const [requiresReweigh, setRequiresReweigh] = useState(false);
  const [isCreatingCase, setIsCreatingCase] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(null);

  // Queries
  const { data: transaction, isLoading: isLoadingTransaction } = useWeighingTransaction(transactionId ?? undefined);
  const { data: existingCase, isLoading: isLoadingCase, refetch: refetchCase } = useCaseByWeighingId(transactionId ?? undefined);
  const { data: releaseTypes = [], isLoading: isLoadingReleaseTypes } = useReleaseTypes();
  const { data: caseReleases = [], isLoading: isLoadingReleases, refetch: refetchReleases } = useSpecialReleasesByCase(existingCase?.id);
  const { data: _pendingReleases = [] } = usePendingSpecialReleases();

  // Mutations
  const createCaseMutation = useCreateCaseFromWeighing();
  const createReleaseMutation = useCreateSpecialRelease();
  const approveReleaseMutation = useApproveSpecialRelease();
  const rejectReleaseMutation = useRejectSpecialRelease();

  // Auto-create case from weighing if it doesn't exist
  useEffect(() => {
    if (transactionId && !existingCase && !isLoadingCase && !isCreatingCase && transaction) {
      // Only auto-create if transaction is non-compliant
      if (!transaction.isCompliant) {
        setIsCreatingCase(true);
        createCaseMutation.mutate(transactionId, {
          onSuccess: (newCase) => {
            toast.success(`Case ${newCase.caseNo} created from weighing`);
            refetchCase();
            setIsCreatingCase(false);
          },
          onError: (error) => {
            console.error('Failed to create case:', error);
            toast.error('Failed to create case from weighing');
            setIsCreatingCase(false);
          },
        });
      }
    }
  }, [transactionId, existingCase, isLoadingCase, isCreatingCase, transaction, createCaseMutation, refetchCase]);

  // Update form when release type is selected
  useEffect(() => {
    if (selectedReleaseTypeId) {
      const selectedType = releaseTypes.find(t => t.id === selectedReleaseTypeId);
      if (selectedType) {
        setRequiresRedistribution(selectedType.requiresRedistribution);
        setRequiresReweigh(selectedType.requiresReweigh);
      }
    }
  }, [selectedReleaseTypeId, releaseTypes]);

  // Handle submit special release request
  const handleSubmitRequest = useCallback(() => {
    if (!existingCase?.id || !selectedReleaseTypeId || !reason.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    createReleaseMutation.mutate({
      caseRegisterId: existingCase.id,
      releaseTypeId: selectedReleaseTypeId,
      reason: reason.trim(),
      requiresRedistribution,
      requiresReweigh,
    }, {
      onSuccess: (release) => {
        toast.success(`Special release request ${release.certificateNo} submitted`);
        setSelectedReleaseTypeId('');
        setReason('');
        refetchReleases();
      },
      onError: (error) => {
        console.error('Failed to submit special release:', error);
        toast.error('Failed to submit special release request');
      },
    });
  }, [existingCase, selectedReleaseTypeId, reason, requiresRedistribution, requiresReweigh, createReleaseMutation, refetchReleases]);

  // Handle approve release
  const handleApprove = useCallback((releaseId: string) => {
    approveReleaseMutation.mutate(releaseId, {
      onSuccess: () => {
        toast.success('Special release approved');
        refetchReleases();
      },
      onError: (error) => {
        console.error('Failed to approve release:', error);
        toast.error('Failed to approve special release');
      },
    });
  }, [approveReleaseMutation, refetchReleases]);

  // Handle reject release
  const handleReject = useCallback(() => {
    if (!selectedReleaseId || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    rejectReleaseMutation.mutate({ id: selectedReleaseId, reason: rejectionReason.trim() }, {
      onSuccess: () => {
        toast.success('Special release rejected');
        setShowRejectModal(false);
        setSelectedReleaseId(null);
        setRejectionReason('');
        refetchReleases();
      },
      onError: (error) => {
        console.error('Failed to reject release:', error);
        toast.error('Failed to reject special release');
      },
    });
  }, [selectedReleaseId, rejectionReason, rejectReleaseMutation, refetchReleases]);

  // Handle download certificate
  const handleDownloadCertificate = useCallback(async (releaseId: string, certificateNo: string) => {
    try {
      const blob = await downloadSpecialReleaseCertificate(releaseId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SpecialRelease_${certificateNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Certificate downloaded');
    } catch (error) {
      console.error('Failed to download certificate:', error);
      toast.error('Failed to download certificate');
    }
  }, []);

  // Get status badge for release
  const getStatusBadge = (release: SpecialReleaseDto) => {
    if (release.isApproved) {
      return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
    }
    if (release.isRejected) {
      return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
  };

  // Loading state
  const isLoading = isLoadingTransaction || isLoadingCase || isCreatingCase;

  // No transaction ID provided
  if (!transactionId) {
    return (
      <AppShell title="Special Release" subtitle="Request special release for overloaded vehicles">
        <ProtectedRoute requiredPermissions={['case.special_release']}>
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="max-w-md">
              <CardContent className="pt-6 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                <p className="text-gray-600 mb-4">No weighing transaction specified.</p>
                <Link href="/weighing">
                  <Button>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Weighing
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </ProtectedRoute>
      </AppShell>
    );
  }

  return (
    <AppShell title="Special Release" subtitle="Request special release for overloaded vehicles">
      <ProtectedRoute requiredPermissions={['case.special_release']}>
        <div className="space-y-6">
          {/* Back Button */}
          <div>
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-4" />
                <p className="text-gray-500">Loading transaction details...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Transaction & Case Info */}
              <div className="lg:col-span-1 space-y-4">
                {/* Transaction Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Scale className="h-5 w-5" />
                      Weighing Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {transaction ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Ticket No:</span>
                          <span className="font-mono font-medium">{transaction.ticketNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Vehicle:</span>
                          <span className="font-medium">{transaction.vehicleRegNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">GVW Measured:</span>
                          <span className="font-medium">{transaction.gvwMeasuredKg.toLocaleString()} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">GVW Permissible:</span>
                          <span className="font-medium">{transaction.gvwPermissibleKg.toLocaleString()} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Overload:</span>
                          <span className="font-medium text-red-600">{transaction.overloadKg.toLocaleString()} kg</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Compliance:</span>
                          {transaction.isCompliant ? (
                            <Badge className="bg-green-100 text-green-800">Compliant</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">Non-Compliant</Badge>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-500 text-center py-4">Transaction not found</p>
                    )}
                  </CardContent>
                </Card>

                {/* Case Info */}
                {existingCase && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Case Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Case No:</span>
                        <span className="font-mono font-medium">{existingCase.caseNo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Violation:</span>
                        <span className="font-medium">{existingCase.violationType}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Status:</span>
                        <Badge variant="secondary">{existingCase.caseStatus}</Badge>
                      </div>
                      <Link href={`/cases/${existingCase.id}`} className="block mt-3">
                        <Button variant="outline" size="sm" className="w-full">
                          View Full Case Details
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Middle Column - New Request Form */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Send className="h-5 w-5" />
                      New Special Release Request
                    </CardTitle>
                    <CardDescription>
                      Submit a request for special release of the overloaded vehicle
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!existingCase ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-4" />
                        <p className="text-gray-500">Creating case from weighing...</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label>Release Type *</Label>
                          <Select
                            value={selectedReleaseTypeId}
                            onValueChange={setSelectedReleaseTypeId}
                            disabled={isLoadingReleaseTypes}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select release type" />
                            </SelectTrigger>
                            <SelectContent>
                              {releaseTypes.map((type) => (
                                <SelectItem key={type.id} value={type.id}>
                                  {type.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedReleaseTypeId && (
                            <p className="text-xs text-gray-500">
                              {releaseTypes.find(t => t.id === selectedReleaseTypeId)?.description}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Reason / Justification *</Label>
                          <Textarea
                            placeholder="Explain the circumstances requiring special release..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={4}
                          />
                        </div>

                        <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="redistribution" className="text-sm font-normal cursor-pointer">
                              Requires load redistribution
                            </Label>
                            <Switch
                              id="redistribution"
                              checked={requiresRedistribution}
                              onCheckedChange={setRequiresRedistribution}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="reweigh" className="text-sm font-normal cursor-pointer">
                              Requires re-weigh after correction
                            </Label>
                            <Switch
                              id="reweigh"
                              checked={requiresReweigh}
                              onCheckedChange={setRequiresReweigh}
                            />
                          </div>
                        </div>

                        <Button
                          className="w-full mt-4"
                          onClick={handleSubmitRequest}
                          disabled={createReleaseMutation.isPending || !selectedReleaseTypeId || !reason.trim()}
                        >
                          {createReleaseMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Submit Request
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Existing Releases */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileCheck className="h-5 w-5" />
                      Release Requests
                    </CardTitle>
                    <CardDescription>
                      Track status of special release requests for this case
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingReleases ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                      </div>
                    ) : caseReleases.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No release requests yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {caseReleases.map((release) => (
                          <div
                            key={release.id}
                            className="border rounded-lg p-4 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-sm font-medium">
                                {release.certificateNo}
                              </span>
                              {getStatusBadge(release)}
                            </div>
                            <div className="text-sm space-y-1">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Type:</span>
                                <span>{release.releaseType}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Created:</span>
                                <span>{new Date(release.createdAt).toLocaleDateString()}</span>
                              </div>
                              {release.isApproved && release.approvedByName && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Approved by:</span>
                                  <span>{release.approvedByName}</span>
                                </div>
                              )}
                              {release.isRejected && release.rejectionReason && (
                                <div className="mt-2 p-2 bg-red-50 rounded text-sm">
                                  <span className="text-red-700 font-medium">Rejection reason: </span>
                                  <span className="text-red-600">{release.rejectionReason}</span>
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2">{release.reason}</p>

                            {/* Action buttons */}
                            <div className="flex gap-2 pt-2">
                              {release.isApproved && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDownloadCertificate(release.id, release.certificateNo)}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Certificate
                                </Button>
                              )}
                              {!release.isApproved && !release.isRejected && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleApprove(release.id)}
                                    disabled={approveReleaseMutation.isPending}
                                  >
                                    {approveReleaseMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <CheckCircle2 className="h-4 w-4 mr-1" />
                                        Approve
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      setSelectedReleaseId(release.id);
                                      setShowRejectModal(true);
                                    }}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Reject Modal */}
          {showRejectModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Card className="w-full max-w-md mx-4">
                <CardHeader>
                  <CardTitle>Reject Special Release</CardTitle>
                  <CardDescription>
                    Provide a reason for rejecting this special release request
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Rejection Reason *</Label>
                    <Textarea
                      placeholder="Explain why this request is being rejected..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowRejectModal(false);
                        setSelectedReleaseId(null);
                        setRejectionReason('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleReject}
                      disabled={rejectReleaseMutation.isPending || !rejectionReason.trim()}
                    >
                      {rejectReleaseMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Confirm Rejection
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </ProtectedRoute>
    </AppShell>
  );
}
