"use client";

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
    ArrestWarrantList,
    CaseAssignmentLog,
    CasePartyList,
    CaseSubfileList,
    ClosureChecklistPanel,
    CourtHearingList,
    ProsecutionSection,
} from '@/components/case';
import { DocumentsTab } from '@/components/case/DocumentsTab';
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
    useDispositionTypes,
} from '@/hooks/queries';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import {
    AlertTriangle,
    ArrowLeft,
    BookOpen,
    Briefcase,
    Calendar,
    Car,
    CheckCircle2,
    FileStack,
    FileText,
    Gavel,
    Loader2,
    Scale,
    Shield,
    User,
    Users,
    XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

/**
 * Case Management Detail Page
 *
 * Full case management view for escalated cases. Provides access to all
 * case-building tabs: parties, subfiles (A–J), hearings, investigation diary,
 * warrants, prosecution (read-only), documents, and closure checklist.
 *
 * Actions available here:
 *  - Close Case (with disposition)
 */
export default function CaseManagementDetailPage() {
  const params = useParams();
  const orgSlug = useOrgSlug();
  const caseId = params.id as string;

  const { data: caseData, isLoading, error, refetch } = useCaseById(caseId);
  const { data: dispositionTypes = [] } = useDispositionTypes();
  const closeCaseMutation = useCloseCase();

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeDispositionId, setCloseDispositionId] = useState('');
  const [closeReason, setCloseReason] = useState('');

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

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'OPEN':      return <Badge className="bg-blue-100 text-blue-800">Open</Badge>;
      case 'PENDING':   return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'ESCALATED': return <Badge className="bg-orange-100 text-orange-800">Escalated</Badge>;
      case 'CLOSED':    return <Badge className="bg-green-100 text-green-800">Closed</Badge>;
      default:          return <Badge variant="secondary">{status}</Badge>;
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

  return (
    <AppShell
      title={caseData ? `Case ${caseData.caseNo}` : isLoading ? 'Loading...' : 'Error'}
      subtitle="Case management"
    >
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
            <p className="text-gray-500 mt-2">
              The case you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
            </p>
            <Link href={`/${orgSlug}/case-management`}>
              <Button className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Case Management
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
                <Link href={`/${orgSlug}/case-management`}>
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Case Management
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold">{caseData.caseNo}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(caseData.caseStatus)}
                    <Badge variant="outline" className="bg-slate-100 text-slate-700">
                      <Briefcase className="h-3 w-3 mr-1" />
                      Case Management
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isClosed && (
                  <Button variant="destructive" onClick={() => setShowCloseModal(true)}>
                    <XCircle className="mr-2 h-4 w-4" />
                    Close Case
                  </Button>
                )}
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column – Tabs */}
              <div className="lg:col-span-2 space-y-6">
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto gap-1">
                    <TabsTrigger value="overview" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />Overview
                    </TabsTrigger>
                    <TabsTrigger value="parties" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />Parties
                    </TabsTrigger>
                    <TabsTrigger value="subfiles" className="text-xs">
                      <FileStack className="h-3 w-3 mr-1" />Subfiles
                    </TabsTrigger>
                    <TabsTrigger value="hearings" className="text-xs">
                      <Gavel className="h-3 w-3 mr-1" />Hearings
                    </TabsTrigger>
                    <TabsTrigger value="diary" className="text-xs">
                      <BookOpen className="h-3 w-3 mr-1" />Diary
                    </TabsTrigger>
                    <TabsTrigger value="warrants" className="text-xs">
                      <Shield className="h-3 w-3 mr-1" />Warrants
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="text-xs">
                      <FileText className="h-3 w-3 mr-1" />Documents
                    </TabsTrigger>
                    <TabsTrigger value="closure" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />Closure
                    </TabsTrigger>
                  </TabsList>

                  {/* Overview Tab – read-only case summary */}
                  <TabsContent value="overview" className="space-y-6">
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
                              <Link href={`/${orgSlug}/weighing/tickets/${caseData.weighingId}`}>
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

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Car className="h-5 w-5 text-blue-500" />
                          Vehicle & Driver
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
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
                            <Label className="text-sm text-gray-500">OB Number</Label>
                            <p className="font-medium">{caseData.obNo || '-'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Prosecution read-only preview */}
                    <ProsecutionSection
                      caseId={caseId}
                      caseNo={caseData.caseNo}
                      weighingId={caseData.weighingId}
                      readOnly={true}
                    />
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

                  {/* Investigation Diary Tab */}
                  <TabsContent value="diary" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BookOpen className="h-5 w-5 text-slate-500" />
                          Investigation Diary
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground space-y-2">
                          <p className="font-medium text-foreground">Key events</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Created {formatDate(caseData.createdAt)} by {caseData.createdByName || 'System'}</li>
                            {caseData.closedAt && (
                              <li>Closed {formatDate(caseData.closedAt)} by {caseData.closedByName}</li>
                            )}
                          </ul>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Use <strong>Subfile F</strong> in the Subfiles tab to record detailed investigation
                          timelines and findings. Use <strong>Hearings</strong> for court dates and
                          <strong> Documents</strong> for attachments.
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Warrants Tab */}
                  <TabsContent value="warrants">
                    <ArrestWarrantList caseId={caseId} caseNo={caseData.caseNo} />
                  </TabsContent>

                  {/* Documents Tab */}
                  <TabsContent value="documents">
                    <DocumentsTab caseId={caseId} />
                  </TabsContent>

                  {/* Closure Checklist Tab */}
                  <TabsContent value="closure">
                    <ClosureChecklistPanel caseId={caseId} caseNo={caseData.caseNo} />
                  </TabsContent>
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
                  {closeCaseMutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    : <XCircle className="h-4 w-4 mr-2" />}
                  Close Case
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
