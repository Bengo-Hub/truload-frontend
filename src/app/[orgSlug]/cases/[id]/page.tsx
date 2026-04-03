"use client";

import { CaseAssignmentLog, ConvictionHistory, EscalateCaseModal, ProsecutionSection } from '@/components/case';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useOrgSlug } from '@/hooks/useOrgSlug';
import { fetchUsers } from '@/lib/api/setup';
import { useQuery } from '@tanstack/react-query';
import { downloadSpecialReleaseCertificate } from '@/lib/api/caseRegister';
import { downloadWeightTicketPdf } from '@/lib/api/weighing';
import { PdfPreviewDialog } from '@/components/shared/PdfPreviewDialog';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    Briefcase,
    Calendar,
    Car,
    CheckCircle,
    Clock,
    Download,
    FileText,
    Gavel,
    Loader2,
    Scale,
    Send,
    Shield,
    TrendingUp,
    User,
    Weight,
    XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

/**
 * Case Register Detail Page
 *
 * Shows the case register view: violation details, vehicle/driver info,
 * special releases, and prosecution initiation. Case management tabs
 * (subfiles, hearings, parties, diary, warrants, documents, closure)
 * are on the Case Management module at /case-management/[id].
 *
 * Actions available here:
 *  - Request Special Release
 *  - Escalate to Case Manager
 *  - Close Case
 */
export default function CaseDetailPage() {
  const params = useParams();
  const orgSlug = useOrgSlug();
  const caseId = params.id as string;

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
  const [showTicketPreview, setShowTicketPreview] = useState(false);
  const [ticketPdfBlob, setTicketPdfBlob] = useState<Blob | null>(null);
  const [ticketPdfLoading, setTicketPdfLoading] = useState(false);

  // Form states
  const [closeDispositionId, setCloseDispositionId] = useState('');
  const [closeReason, setCloseReason] = useState('');
  const [releaseTypeId, setReleaseTypeId] = useState('');
  const [releaseReason, setReleaseReason] = useState('');

  const handleCloseCase = useCallback(async () => {
    if (!closeDispositionId || !closeReason) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      await closeCaseMutation.mutateAsync({
        id: caseId,
        request: { dispositionTypeId: closeDispositionId, closingReason: closeReason },
      });
      toast.success('Case closed successfully');
      setShowCloseModal(false);
      refetch();
    } catch {
      toast.error('Failed to close case');
    }
  }, [caseId, closeDispositionId, closeReason, closeCaseMutation, refetch]);

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
    } catch {
      toast.error('Failed to submit release request');
    }
  }, [caseId, releaseTypeId, releaseReason, releaseTypes, createReleaseMutation, refetch]);

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'OPEN':    return <Badge className="bg-blue-100 text-blue-800">Open</Badge>;
      case 'PENDING': return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'ESCALATED': return <Badge className="bg-orange-100 text-orange-800">Escalated</Badge>;
      case 'CLOSED': return <Badge className="bg-green-100 text-green-800">Closed</Badge>;
      default:        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const isClosed = caseData?.caseStatus?.toUpperCase() === 'CLOSED';
  const isSpecialRelease = caseData?.dispositionType?.toLowerCase().includes('special_release') ||
    caseData?.dispositionType?.toLowerCase().includes('special release');
  const isEscalated = caseData?.escalatedToCaseManager ||
    caseData?.caseStatus?.toUpperCase() === 'ESCALATED';

  const formatWeight = (kg?: number) => {
    if (kg == null) return '-';
    return `${kg.toLocaleString()} kg`;
  };

  const handleViewWeightTicket = useCallback(async (weighingId: string) => {
    setShowTicketPreview(true);
    setTicketPdfLoading(true);
    setTicketPdfBlob(null);
    try {
      const blob = await downloadWeightTicketPdf(weighingId);
      setTicketPdfBlob(blob);
    } catch {
      toast.error('Failed to load weight ticket PDF');
      setShowTicketPreview(false);
    } finally {
      setTicketPdfLoading(false);
    }
  }, []);

  const handleDownloadCertificate = async (releaseId: string, certificateNo: string) => {
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
    } catch {
      toast.error('Failed to download certificate');
    }
  };

  return (
    <AppShell title={caseData ? `Case ${caseData.caseNo}` : isLoading ? 'Loading...' : 'Error'} subtitle="Case register">
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
            <Link href={`/${orgSlug}/cases`}>
              <Button className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Cases
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
                <Link href={`/${orgSlug}/cases`}>
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold">{caseData.caseNo}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(caseData.caseStatus)}
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
                    <Button variant="outline" onClick={() => setShowReleaseModal(true)}>
                      <Shield className="mr-2 h-4 w-4" />
                      Request Release
                    </Button>
                    {!caseData.escalatedToCaseManager && (
                      <Button variant="outline" onClick={() => setShowEscalateModal(true)}>
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Escalate
                      </Button>
                    )}
                    <Button variant="destructive" onClick={() => setShowCloseModal(true)}>
                      <XCircle className="mr-2 h-4 w-4" />
                      Close Case
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Escalated Case Banner – link to full case management */}
            {caseData.escalatedToCaseManager && !isClosed && (
              <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Briefcase className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-medium text-orange-900">
                      This case has been escalated to Case Management
                    </p>
                    <p className="text-sm text-orange-700">
                      Manage hearings, subfiles, diary, warrants, parties, and closure from the Case Management view.
                    </p>
                  </div>
                </div>
                <Button asChild>
                  <Link href={`/${orgSlug}/case-management/${caseId}`}>
                    <Briefcase className="mr-2 h-4 w-4" />
                    Open Case Management
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column – Tabs */}
              <div className="lg:col-span-2 space-y-6">
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className={`grid w-full ${isSpecialRelease ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    {!isSpecialRelease && (
                      <TabsTrigger value="prosecution">Prosecution</TabsTrigger>
                    )}
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
                              <Button variant="link" size="sm" onClick={() => handleViewWeightTicket(caseData.weighingId!)}>
                                View Ticket
                              </Button>
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

                    {/* Overload Analysis */}
                    {caseData.weighingId && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Weight className="h-5 w-5 text-orange-500" />
                            Overload Analysis
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {caseData.actualWeightKg != null ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm text-gray-500">Actual Weight (GVW)</Label>
                                  <p className="font-mono font-bold text-lg">{formatWeight(caseData.actualWeightKg)}</p>
                                </div>
                                <div>
                                  <Label className="text-sm text-gray-500">Permissible Weight</Label>
                                  <p className="font-mono font-medium text-lg">{formatWeight(caseData.permissibleWeightKg)}</p>
                                </div>
                                <div>
                                  <Label className="text-sm text-gray-500">Tolerance Applied</Label>
                                  <p className="font-mono font-medium">{formatWeight(caseData.toleranceAppliedKg)}</p>
                                </div>
                                <div>
                                  <Label className="text-sm text-gray-500">Overload After Tolerance</Label>
                                  <p className={`font-mono font-bold text-lg ${
                                    (caseData.overloadAfterToleranceKg ?? 0) > 0 ? 'text-red-600' : 'text-green-600'
                                  }`}>
                                    {formatWeight(caseData.overloadAfterToleranceKg)}
                                  </p>
                                </div>
                              </div>
                              {caseData.weighingId && (
                                <Button variant="outline" size="sm" className="mt-2" onClick={() => handleViewWeightTicket(caseData.weighingId!)}>
                                  <Scale className="mr-2 h-4 w-4" />
                                  View Full Weight Ticket
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <Scale className="h-5 w-5 text-gray-400" />
                              <div>
                                <p className="text-sm text-gray-600">
                                  Overload details are available on the weight ticket.
                                </p>
                                <Button variant="link" size="sm" className="px-0" onClick={() => handleViewWeightTicket(caseData.weighingId!)}>
                                  View weight ticket for full analysis
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

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
                                      <CheckCircle className="h-3 w-3 mr-1" />Approved
                                    </Badge>
                                  ) : release.isRejected ? (
                                    <Badge className="bg-red-100 text-red-800">
                                      <XCircle className="h-3 w-3 mr-1" />Rejected
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-yellow-100 text-yellow-800">
                                      <Clock className="h-3 w-3 mr-1" />Pending
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                  <p className="text-sm text-gray-500">{release.reason}</p>
                                  {release.isApproved && release.certificateNo && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDownloadCertificate(release.id, release.certificateNo)}
                                    >
                                      <Download className="h-3 w-3 mr-1" />
                                      View Certificate
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* Prosecution Tab (hidden for special release cases) */}
                  {!isSpecialRelease && (
                    <TabsContent value="prosecution">
                      <ProsecutionSection
                        caseId={caseId}
                        caseNo={caseData.caseNo}
                        weighingId={caseData.weighingId}
                        readOnly={false}
                      />
                    </TabsContent>
                  )}
                </Tabs>
              </div>

              {/* Right Column – Sidebar */}
              <div className="space-y-6">
                {/* Timeline */}
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

                {/* Conviction History */}
                <ConvictionHistory vehicleId={caseData.vehicleId} />

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

                {/* Court Information (shown when case is escalated) */}
                {isEscalated && (caseData.courtCaseNo || caseData.policeCaseFileNo || caseData.courtName) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Gavel className="h-5 w-5 text-purple-500" />
                        Court Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {caseData.courtCaseNo && (
                        <div>
                          <Label className="text-sm text-gray-500">Court Case No</Label>
                          <p className="font-mono font-medium">{caseData.courtCaseNo}</p>
                        </div>
                      )}
                      {caseData.policeCaseFileNo && (
                        <>
                          <Separator />
                          <div>
                            <Label className="text-sm text-gray-500">Police Case File No</Label>
                            <p className="font-mono font-medium">{caseData.policeCaseFileNo}</p>
                          </div>
                        </>
                      )}
                      {caseData.courtName && (
                        <>
                          <Separator />
                          <div>
                            <Label className="text-sm text-gray-500">Court Name</Label>
                            <p className="font-medium">{caseData.courtName}</p>
                          </div>
                        </>
                      )}
                      {caseData.nextHearingDate && (
                        <>
                          <Separator />
                          <div>
                            <Label className="text-sm text-gray-500">Next Hearing Date</Label>
                            <p className="font-medium">{formatDate(caseData.nextHearingDate)}</p>
                          </div>
                        </>
                      )}
                      {caseData.obExtractFileUrl && (
                        <>
                          <Separator />
                          <div>
                            <Label className="text-sm text-gray-500">OB Extract</Label>
                            <a
                              href={caseData.obExtractFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="outline" size="sm" className="mt-1">
                                <FileText className="h-3 w-3 mr-1" />
                                View OB Extract
                              </Button>
                            </a>
                          </div>
                        </>
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
                    <SelectTrigger><SelectValue placeholder="Select disposition" /></SelectTrigger>
                    <SelectContent>
                      {dispositionTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
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
                <Button variant="outline" onClick={() => setShowCloseModal(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleCloseCase} disabled={closeCaseMutation.isPending}>
                  {closeCaseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                  Close Case
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Escalate Modal */}
          <EscalateCaseModal
            open={showEscalateModal}
            onOpenChange={setShowEscalateModal}
            caseId={caseId}
            caseData={caseData}
            users={usersData?.items ?? []}
            onSuccess={refetch}
          />

          {/* Weight Ticket PDF Preview */}
          <PdfPreviewDialog
            open={showTicketPreview}
            onOpenChange={setShowTicketPreview}
            blob={ticketPdfBlob}
            fileName={`WeightTicket_${caseData?.weighingTicketNo ?? 'ticket'}.pdf`}
            title="Weight Ticket Preview"
            isLoading={ticketPdfLoading}
          />

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
                    <SelectTrigger><SelectValue placeholder="Select release type" /></SelectTrigger>
                    <SelectContent>
                      {releaseTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          <div>
                            <p>{type.name}</p>
                            {type.description && <p className="text-xs text-gray-500">{type.description}</p>}
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
                <Button variant="outline" onClick={() => setShowReleaseModal(false)}>Cancel</Button>
                <Button onClick={handleRequestRelease} disabled={createReleaseMutation.isPending}>
                  {createReleaseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
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
