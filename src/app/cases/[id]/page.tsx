"use client";

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
    ArrestWarrantList,
    CaseAssignmentLog,
    CasePartyList,
    CaseSubfileList,
    ClosureChecklistPanel,
    CourtHearingList,
    EscalateCaseModal,
    ProsecutionSection,
} from '@/components/case';
import { DocumentsTab } from '@/components/case/DocumentsTab';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
    useCaseById,
    useCloseCase,
    useCreateSpecialRelease,
    useDispositionTypes,
    useReleaseTypes,
    useSpecialReleasesByCase,
} from '@/hooks/queries';
import { fetchUsers } from '@/lib/api/setup';
import { useQuery } from '@tanstack/react-query';
import {
    AlertTriangle,
    ArrowLeft,
    Calendar,
    Car,
    CheckCircle,
    Clock,
    FileText,
    Loader2,
    Scale,
    Send,
    Shield,
    TrendingUp,
    User,
    XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

/**
 * Case Detail Page
 *
 * Displays full case details. When opened from Case management (?from=case-management),
 * register-only actions (Escalate, Create prosecution / Pay) are hidden.
 * - Case register: view, escalate, create prosecution, request release, close
 * - Case management: view, subfiles, hearings, documents, closure; no escalate/prosecution create
 */
export default function CaseDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const caseId = params.id as string;
  const isCaseManagementView = searchParams.get('from') === 'case-management';

  // Queries
  const { data: caseData, isLoading, error, refetch } = useCaseById(caseId);
  const { data: specialReleases = [] } = useSpecialReleasesByCase(caseId);
  const { data: dispositionTypes = [] } = useDispositionTypes();
  const { data: releaseTypes = [] } = useReleaseTypes();
  const { data: usersData } = useQuery({
    queryKey: ['users-for-escalation'],
    queryFn: () => fetchUsers({ pageSize: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  // Mutations
  const closeCaseMutation = useCloseCase();
  const createReleaseMutation = useCreateSpecialRelease();

  // Modal states
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);

  // Form states (close + release only; escalate uses EscalateCaseModal)
  const [closeDispositionId, setCloseDispositionId] = useState('');
  const [closeReason, setCloseReason] = useState('');
  const [releaseTypeId, setReleaseTypeId] = useState('');
  const [releaseReason, setReleaseReason] = useState('');

  // Handle close case
  const handleCloseCase = useCallback(async () => {
    if (!closeDispositionId || !closeReason) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await closeCaseMutation.mutateAsync({
        id: caseId,
        request: {
          dispositionTypeId: closeDispositionId,
          closingReason: closeReason,
        },
      });
      toast.success('Case closed successfully');
      setShowCloseModal(false);
      refetch();
    } catch (_error) {
      toast.error('Failed to close case');
    }
  }, [caseId, closeDispositionId, closeReason, closeCaseMutation, refetch]);

  // Handle request special release
  const handleRequestRelease = useCallback(async () => {
    if (!releaseTypeId || !releaseReason) {
      toast.error('Please fill in all required fields');
      return;
    }

    const selectedType = releaseTypes.find(t => t.id === releaseTypeId);

    try {
      await createReleaseMutation.mutateAsync({
        caseRegisterId: caseId,
        releaseTypeId,
        reason: releaseReason,
        requiresRedistribution: selectedType?.requiresRedistribution,
        requiresReweigh: selectedType?.requiresReweigh,
      });
      toast.success('Special release request submitted');
      setShowReleaseModal(false);
      refetch();
    } catch (_error) {
      toast.error('Failed to submit release request');
    }
  }, [caseId, releaseTypeId, releaseReason, releaseTypes, createReleaseMutation, refetch]);

  // Get status badge
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

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isClosed = caseData?.caseStatus?.toUpperCase() === 'CLOSED';

  return (
    <AppShell title={caseData ? `Case ${caseData.caseNo}` : isLoading ? 'Loading...' : 'Error'} subtitle="Case details">
      <ProtectedRoute requiredPermissions={['case.read']}>
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          </div>
        ) : error || !caseData ? (
          <Card className="max-w-md mx-auto mt-12">
            <CardContent className="pt-6 text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Case Not Found</h3>
              <p className="text-gray-500 mt-2">The case you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.</p>
              <Link href={isCaseManagementView ? '/case-management' : '/cases'}>
                <Button className="mt-4">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {isCaseManagementView ? 'Back to case management' : 'Back to Cases'}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
        <>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={isCaseManagementView ? '/case-management' : '/cases'}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {isCaseManagementView ? 'Back to case management' : 'Back'}
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">{caseData.caseNo}</h1>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(caseData.caseStatus)}
                  {isCaseManagementView && (
                    <Badge variant="outline" className="bg-slate-100 text-slate-700">
                      Case management
                    </Badge>
                  )}
                  {caseData.escalatedToCaseManager && (
                    <Badge variant="outline" className="bg-orange-50">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Escalated
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isClosed && (
                <>
                  {!isCaseManagementView && (
                    <Button
                      variant="outline"
                      onClick={() => setShowReleaseModal(true)}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Request Release
                    </Button>
                  )}
                  {!isCaseManagementView && !caseData.escalatedToCaseManager && (
                    <Button
                      variant="outline"
                      onClick={() => setShowEscalateModal(true)}
                    >
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Escalate
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    onClick={() => setShowCloseModal(true)}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Close Case
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Tabbed Case Details */}
            <div className="lg:col-span-2 space-y-6">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:grid-cols-9">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="parties">Parties</TabsTrigger>
                  <TabsTrigger value="subfiles">Subfiles (A–J)</TabsTrigger>
                  <TabsTrigger value="hearings">Hearings</TabsTrigger>
                  <TabsTrigger value="diary">Diary</TabsTrigger>
                  <TabsTrigger value="warrants">Warrants</TabsTrigger>
                  <TabsTrigger value="prosecution">Prosecution</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="closure">Closure</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                  {/* Violation Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        Violation Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-gray-500">Violation Type</Label>
                          <p className="font-medium">{caseData.violationType}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-500">Applicable Act</Label>
                          <p className="font-medium">{caseData.actName || 'Not specified'}</p>
                        </div>
                      </div>
                      {caseData.violationDetails && (
                        <div>
                          <Label className="text-sm text-gray-500">Details</Label>
                          <p className="font-medium">{caseData.violationDetails}</p>
                        </div>
                      )}
                      {caseData.weighingTicketNo && (
                        <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
                          <Scale className="h-5 w-5 text-blue-600" />
                          <div>
                            <Label className="text-sm text-gray-500">Weighing Ticket</Label>
                            <p className="font-mono font-medium">{caseData.weighingTicketNo}</p>
                          </div>
                          {caseData.weighingId && (
                            <Link href={`/weighing/tickets/${caseData.weighingId}`}>
                              <Button variant="link" size="sm">View Ticket</Button>
                            </Link>
                          )}
                        </div>
                      )}
                      {caseData.prohibitionNo && (
                        <div className="flex items-center gap-4 p-3 bg-red-50 rounded-lg">
                          <FileText className="h-5 w-5 text-red-600" />
                          <div>
                            <Label className="text-sm text-gray-500">Prohibition Order</Label>
                            <p className="font-mono font-medium">{caseData.prohibitionNo}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Vehicle & Driver */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Car className="h-5 w-5 text-blue-500" />
                        Vehicle & Driver
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-gray-500">Vehicle Registration</Label>
                          <p className="font-mono font-bold text-lg">{caseData.vehicleRegNumber}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-500">Driver Name</Label>
                          <p className="font-medium">{caseData.driverName || 'Not recorded'}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-500">Driver License</Label>
                          <p className="font-medium">{caseData.driverLicenseNo || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-500">Driver NTAC No</Label>
                          <p className="font-medium">{caseData.driverNtacNo || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-500">Transporter NTAC No</Label>
                          <p className="font-medium">{caseData.transporterNtacNo || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-500">OB Number</Label>
                          <p className="font-medium">{caseData.obNo || '-'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Special Releases */}
                  {specialReleases.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-green-500" />
                          Special Releases
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {specialReleases.map((release) => (
                            <div
                              key={release.id}
                              className={`p-3 rounded-lg border ${
                                release.isApproved
                                  ? 'bg-green-50 border-green-200'
                                  : release.isRejected
                                  ? 'bg-red-50 border-red-200'
                                  : 'bg-yellow-50 border-yellow-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-mono font-medium">{release.certificateNo}</p>
                                  <p className="text-sm text-gray-600">{release.releaseType}</p>
                                </div>
                                {release.isApproved ? (
                                  <Badge className="bg-green-100 text-green-800">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Approved
                                  </Badge>
                                ) : release.isRejected ? (
                                  <Badge className="bg-red-100 text-red-800">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Rejected
                                  </Badge>
                                ) : (
                                  <Badge className="bg-yellow-100 text-yellow-800">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pending
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 mt-2">{release.reason}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Parties Tab */}
                <TabsContent value="parties">
                  <CasePartyList caseId={caseId} caseNo={caseData.caseNo} />
                </TabsContent>

                {/* Subfiles Tab */}
                <TabsContent value="subfiles">
                  <CaseSubfileList caseId={caseId} caseNo={caseData.caseNo} />
                </TabsContent>

                {/* Hearings Tab */}
                <TabsContent value="hearings">
                  <CourtHearingList caseId={caseId} caseNo={caseData.caseNo} />
                </TabsContent>

                {/* Case diary – notes, timeline summary, link to hearings/documents */}
                <TabsContent value="diary" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-slate-500" />
                        Case diary & notes
                      </CardTitle>
                      <CardDescription>
                        Timeline, internal notes, and references to hearings and documents
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground mb-1">Key events</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Created {formatDate(caseData.createdAt)} by {caseData.createdByName || 'System'}</li>
                          {caseData.closedAt && (
                            <li>Closed {formatDate(caseData.closedAt)} by {caseData.closedByName}</li>
                          )}
                        </ul>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Use the <strong>Hearings</strong> tab for court dates and minute sheets. Use <strong>Subfiles (A–J)</strong> for evidence and document categories, and <strong>Documents</strong> for file attachments.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Warrants Tab */}
                <TabsContent value="warrants">
                  <ArrestWarrantList caseId={caseId} caseNo={caseData.caseNo} />
                </TabsContent>

                {/* Prosecution Tab – create/pay only from Case register */}
                <TabsContent value="prosecution">
                  <ProsecutionSection
                    caseId={caseId}
                    caseNo={caseData.caseNo}
                    weighingId={caseData.weighingId}
                    readOnly={isCaseManagementView}
                  />
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents">
                  <DocumentsTab caseId={caseId} />
                </TabsContent>

                {/* Closure Tab */}
                <TabsContent value="closure">
                  <ClosureChecklistPanel caseId={caseId} caseNo={caseData.caseNo} />
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Column - Timeline & Officers */}
            <div className="space-y-6">
              {/* Case Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-gray-500" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                    <div>
                      <p className="text-sm font-medium">Created</p>
                      <p className="text-sm text-gray-500">{formatDate(caseData.createdAt)}</p>
                      <p className="text-xs text-gray-400">by {caseData.createdByName || 'System'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-gray-300 mt-2" />
                    <div>
                      <p className="text-sm font-medium">Last Updated</p>
                      <p className="text-sm text-gray-500">{formatDate(caseData.updatedAt)}</p>
                    </div>
                  </div>
                  {caseData.closedAt && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                      <div>
                        <p className="text-sm font-medium">Closed</p>
                        <p className="text-sm text-gray-500">{formatDate(caseData.closedAt)}</p>
                        <p className="text-xs text-gray-400">by {caseData.closedByName}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Officers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-gray-500" />
                    Assigned Officers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm text-gray-500">Complainant Officer</Label>
                    <p className="font-medium">{caseData.complainantOfficerName || 'Not assigned'}</p>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-sm text-gray-500">Investigating Officer</Label>
                    <p className="font-medium">{caseData.investigatingOfficerName || 'Not assigned'}</p>
                  </div>
                  {caseData.caseManagerName && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-sm text-gray-500">Case Manager</Label>
                        <p className="font-medium">{caseData.caseManagerName}</p>
                      </div>
                    </>
                  )}
                  {caseData.prosecutorName && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-sm text-gray-500">Prosecutor</Label>
                        <p className="font-medium">{caseData.prosecutorName}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Assignment Log */}
              <CaseAssignmentLog caseId={caseId} caseNo={caseData.caseNo} />

              {/* Disposition */}
              {caseData.dispositionType && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-gray-500" />
                      Disposition
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm text-gray-500">Type</Label>
                      <p className="font-medium">{caseData.dispositionType}</p>
                    </div>
                    {caseData.closingReason && (
                      <div>
                        <Label className="text-sm text-gray-500">Reason</Label>
                        <p className="text-sm">{caseData.closingReason}</p>
                      </div>
                    )}
                    {caseData.courtName && (
                      <div>
                        <Label className="text-sm text-gray-500">Court</Label>
                        <p className="font-medium">{caseData.courtName}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Close Case Modal */}
        <Dialog open={showCloseModal} onOpenChange={setShowCloseModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Close Case</DialogTitle>
              <DialogDescription>
                Select a disposition type and provide a reason for closing this case.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Disposition Type *</Label>
                <Select value={closeDispositionId} onValueChange={setCloseDispositionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select disposition" />
                  </SelectTrigger>
                  <SelectContent>
                    {dispositionTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Closing Reason *</Label>
                <Textarea
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value)}
                  placeholder="Enter the reason for closing this case..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCloseModal(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleCloseCase}
                disabled={closeCaseMutation.isPending}
              >
                {closeCaseMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Close Case
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Escalate Modal – Case register only; hidden in case management view */}
        {!isCaseManagementView && (
          <EscalateCaseModal
            open={showEscalateModal}
            onOpenChange={setShowEscalateModal}
            caseId={caseId}
            caseData={caseData}
            users={usersData?.items ?? []}
            onSuccess={refetch}
          />
        )}

        {/* Special Release Modal */}
        <Dialog open={showReleaseModal} onOpenChange={setShowReleaseModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Special Release</DialogTitle>
              <DialogDescription>
                Submit a request for special release of this vehicle.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Release Type *</Label>
                <Select value={releaseTypeId} onValueChange={setReleaseTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select release type" />
                  </SelectTrigger>
                  <SelectContent>
                    {releaseTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <div>
                          <p>{type.name}</p>
                          {type.description && (
                            <p className="text-xs text-gray-500">{type.description}</p>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reason *</Label>
                <Textarea
                  value={releaseReason}
                  onChange={(e) => setReleaseReason(e.target.value)}
                  placeholder="Enter the reason for this release request..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReleaseModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleRequestRelease}
                disabled={createReleaseMutation.isPending}
              >
                {createReleaseMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </>
        )}
      </ProtectedRoute>
    </AppShell>
  );
}
