"use client";

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
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
import { PermissionActionButton } from '@/components/ui/permission-action-button';
import {
  useHearingsByCaseId,
  useScheduleHearing,
  useAdjournHearing,
  useCompleteHearing,
  useDeleteHearing,
  useDownloadCourtMinutes,
  useCourts,
  useHearingTypes,
  useHearingOutcomes,
} from '@/hooks/queries';
import type { CourtHearingDto } from '@/lib/api/courtHearing';
import {
  Calendar,
  Clock,
  Download,
  Gavel,
  Loader2,
  Pause,
  Plus,
  Trash2,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useCanDelete } from '@/hooks/useCanDelete';

interface CourtHearingListProps {
  caseId: string;
  caseNo: string;
}

export function CourtHearingList({ caseId, caseNo }: CourtHearingListProps) {
  const canDelete = useCanDelete();
  // Queries
  const { data: hearings = [], isLoading, refetch } = useHearingsByCaseId(caseId);
  const { data: courts = [] } = useCourts();
  const { data: hearingTypes = [] } = useHearingTypes();
  const { data: hearingOutcomes = [] } = useHearingOutcomes();

  // Mutations
  const scheduleHearingMutation = useScheduleHearing();
  const adjournHearingMutation = useAdjournHearing();
  const completeHearingMutation = useCompleteHearing();
  const deleteHearingMutation = useDeleteHearing();
  const downloadMinutesMutation = useDownloadCourtMinutes();

  // Modal states
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showAdjournModal, setShowAdjournModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedHearing, setSelectedHearing] = useState<CourtHearingDto | null>(null);
  const [deleteHearingTarget, setDeleteHearingTarget] = useState<string | null>(null);

  // Form states for scheduling
  const [scheduleForm, setScheduleForm] = useState({
    courtId: '',
    hearingDate: '',
    hearingTime: '',
    hearingTypeId: '',
    presidingOfficer: '',
    minuteNotes: '',
  });

  // Form states for adjourn
  const [adjournForm, setAdjournForm] = useState({
    nextHearingDate: '',
    adjournmentReason: '',
  });

  // Form states for complete
  const [completeForm, setCompleteForm] = useState({
    hearingOutcomeId: '',
    minuteNotes: '',
  });

  // Get status badge
  const getStatusBadge = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'SCHEDULED':
        return <Badge className="bg-blue-100 text-blue-800">Scheduled</Badge>;
      case 'HELD':
        return <Badge className="bg-green-100 text-green-800">Held</Badge>;
      case 'ADJOURNED':
        return <Badge className="bg-yellow-100 text-yellow-800">Adjourned</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Pending'}</Badge>;
    }
  };

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'dd MMM yyyy');
  };

  // Format time
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '-';
    return timeStr;
  };

  // Handle schedule hearing
  const handleScheduleHearing = useCallback(async () => {
    if (!scheduleForm.hearingDate) {
      toast.error('Please select a hearing date');
      return;
    }

    try {
      await scheduleHearingMutation.mutateAsync({
        caseId,
        request: {
          courtId: scheduleForm.courtId || undefined,
          hearingDate: scheduleForm.hearingDate,
          hearingTime: scheduleForm.hearingTime || undefined,
          hearingTypeId: scheduleForm.hearingTypeId || undefined,
          presidingOfficer: scheduleForm.presidingOfficer || undefined,
          minuteNotes: scheduleForm.minuteNotes || undefined,
        },
      });
      toast.success('Hearing scheduled successfully');
      setShowScheduleModal(false);
      setScheduleForm({
        courtId: '',
        hearingDate: '',
        hearingTime: '',
        hearingTypeId: '',
        presidingOfficer: '',
        minuteNotes: '',
      });
      refetch();
    } catch (_error) {
      toast.error('Failed to schedule hearing');
    }
  }, [caseId, scheduleForm, scheduleHearingMutation, refetch]);

  // Handle adjourn hearing
  const handleAdjournHearing = useCallback(async () => {
    if (!selectedHearing || !adjournForm.nextHearingDate || !adjournForm.adjournmentReason) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await adjournHearingMutation.mutateAsync({
        id: selectedHearing.id,
        request: {
          nextHearingDate: adjournForm.nextHearingDate,
          adjournmentReason: adjournForm.adjournmentReason,
        },
      });
      toast.success('Hearing adjourned successfully');
      setShowAdjournModal(false);
      setSelectedHearing(null);
      setAdjournForm({ nextHearingDate: '', adjournmentReason: '' });
      refetch();
    } catch (_error) {
      toast.error('Failed to adjourn hearing');
    }
  }, [selectedHearing, adjournForm, adjournHearingMutation, refetch]);

  // Handle complete hearing
  const handleCompleteHearing = useCallback(async () => {
    if (!selectedHearing || !completeForm.hearingOutcomeId) {
      toast.error('Please select an outcome');
      return;
    }

    try {
      await completeHearingMutation.mutateAsync({
        id: selectedHearing.id,
        request: {
          hearingOutcomeId: completeForm.hearingOutcomeId,
          minuteNotes: completeForm.minuteNotes || undefined,
        },
      });
      toast.success('Hearing completed successfully');
      setShowCompleteModal(false);
      setSelectedHearing(null);
      setCompleteForm({ hearingOutcomeId: '', minuteNotes: '' });
      refetch();
    } catch (_error) {
      toast.error('Failed to complete hearing');
    }
  }, [selectedHearing, completeForm, completeHearingMutation, refetch]);

  // Handle delete hearing
  const handleDeleteHearing = useCallback((hearingId: string) => {
    setDeleteHearingTarget(hearingId);
  }, []);

  const confirmDeleteHearing = useCallback(async () => {
    if (!deleteHearingTarget) return;
    try {
      await deleteHearingMutation.mutateAsync(deleteHearingTarget);
      toast.success('Hearing deleted successfully');
      refetch();
    } catch {
      toast.error('Failed to delete hearing');
    }
    setDeleteHearingTarget(null);
  }, [deleteHearingTarget, deleteHearingMutation, refetch]);

  // Handle download minutes
  const handleDownloadMinutes = useCallback(async (hearingId: string) => {
    try {
      await downloadMinutesMutation.mutateAsync(hearingId);
      toast.success('Court minutes downloaded');
    } catch (_error) {
      toast.error('Failed to download court minutes');
    }
  }, [downloadMinutesMutation]);

  // Open adjourn modal
  const openAdjournModal = (hearing: CourtHearingDto) => {
    setSelectedHearing(hearing);
    setShowAdjournModal(true);
  };

  // Open complete modal
  const openCompleteModal = (hearing: CourtHearingDto) => {
    setSelectedHearing(hearing);
    setShowCompleteModal(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5 text-purple-500" />
                Court Hearings
              </CardTitle>
              <CardDescription>
                Manage court hearings for case {caseNo}
              </CardDescription>
            </div>
            <Button onClick={() => setShowScheduleModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Hearing
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {hearings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Gavel className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hearings scheduled for this case</p>
              <p className="text-sm mt-1">Click &quot;Schedule Hearing&quot; to add one</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Court</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hearings.map((hearing) => (
                  <TableRow key={hearing.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatDate(hearing.hearingDate)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        {formatTime(hearing.hearingTime)}
                      </div>
                    </TableCell>
                    <TableCell>{hearing.hearingTypeName || '-'}</TableCell>
                    <TableCell>{hearing.courtName || '-'}</TableCell>
                    <TableCell>{getStatusBadge(hearing.hearingStatusName)}</TableCell>
                    <TableCell>
                      {hearing.hearingOutcomeName ? (
                        <Badge variant="outline">{hearing.hearingOutcomeName}</Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <PermissionActionButton
                          permission="case.update"
                          icon={Pause}
                          label="Adjourn"
                          onClick={() => openAdjournModal(hearing)}
                          condition={hearing.hearingStatusName?.toUpperCase() === 'SCHEDULED'}
                        />
                        <PermissionActionButton
                          permission="case.update"
                          icon={CheckCircle}
                          label="Complete"
                          onClick={() => openCompleteModal(hearing)}
                          condition={hearing.hearingStatusName?.toUpperCase() === 'SCHEDULED'}
                        />
                        <PermissionActionButton
                          permission="case.read"
                          icon={Download}
                          label="Download Minutes"
                          onClick={() => handleDownloadMinutes(hearing.id)}
                          disabled={downloadMinutesMutation.isPending}
                          condition={!!hearing.minuteNotes}
                        />
                        <PermissionActionButton
                          permission="case.delete"
                          icon={Trash2}
                          label="Delete"
                          onClick={() => handleDeleteHearing(hearing.id)}
                          destructive
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Schedule Hearing Modal */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="max-w-md">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Schedule Hearing</DialogTitle>
            <DialogDescription>
              Schedule a new court hearing for this case.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0 space-y-4 -mx-4 sm:-mx-6 px-4 sm:px-6 py-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hearing Date *</Label>
                <Input
                  type="date"
                  value={scheduleForm.hearingDate}
                  onChange={(e) =>
                    setScheduleForm((prev) => ({ ...prev, hearingDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Hearing Time</Label>
                <Input
                  type="time"
                  value={scheduleForm.hearingTime}
                  onChange={(e) =>
                    setScheduleForm((prev) => ({ ...prev, hearingTime: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Court</Label>
              <Select
                value={scheduleForm.courtId}
                onValueChange={(value) =>
                  setScheduleForm((prev) => ({ ...prev, courtId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select court" />
                </SelectTrigger>
                <SelectContent>
                  {courts.map((court) => (
                    <SelectItem key={court.id} value={court.id}>
                      {court.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hearing Type</Label>
              <Select
                value={scheduleForm.hearingTypeId}
                onValueChange={(value) =>
                  setScheduleForm((prev) => ({ ...prev, hearingTypeId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select hearing type" />
                </SelectTrigger>
                <SelectContent>
                  {hearingTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Presiding Officer</Label>
              <Input
                value={scheduleForm.presidingOfficer}
                onChange={(e) =>
                  setScheduleForm((prev) => ({ ...prev, presidingOfficer: e.target.value }))
                }
                placeholder="Enter magistrate/judge name"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={scheduleForm.minuteNotes}
                onChange={(e) =>
                  setScheduleForm((prev) => ({ ...prev, minuteNotes: e.target.value }))
                }
                placeholder="Enter any notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setShowScheduleModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleScheduleHearing}
              disabled={scheduleHearingMutation.isPending}
            >
              {scheduleHearingMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjourn Hearing Modal */}
      <Dialog open={showAdjournModal} onOpenChange={setShowAdjournModal}>
        <DialogContent>
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Adjourn Hearing</DialogTitle>
            <DialogDescription>
              Set a new date and provide a reason for adjournment.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0 space-y-4 -mx-4 sm:-mx-6 px-4 sm:px-6 py-1">
            <div className="space-y-2">
              <Label>Next Hearing Date *</Label>
              <Input
                type="date"
                value={adjournForm.nextHearingDate}
                onChange={(e) =>
                  setAdjournForm((prev) => ({ ...prev, nextHearingDate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Reason for Adjournment *</Label>
              <Textarea
                value={adjournForm.adjournmentReason}
                onChange={(e) =>
                  setAdjournForm((prev) => ({ ...prev, adjournmentReason: e.target.value }))
                }
                placeholder="Enter the reason for adjournment..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setShowAdjournModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdjournHearing}
              disabled={adjournHearingMutation.isPending}
            >
              {adjournHearingMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Pause className="h-4 w-4 mr-2" />
              )}
              Adjourn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Hearing Modal */}
      <Dialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
        <DialogContent>
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Complete Hearing</DialogTitle>
            <DialogDescription>
              Record the outcome of this hearing.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0 space-y-4 -mx-4 sm:-mx-6 px-4 sm:px-6 py-1">
            <div className="space-y-2">
              <Label>Outcome *</Label>
              <Select
                value={completeForm.hearingOutcomeId}
                onValueChange={(value) =>
                  setCompleteForm((prev) => ({ ...prev, hearingOutcomeId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select outcome" />
                </SelectTrigger>
                <SelectContent>
                  {hearingOutcomes.map((outcome) => (
                    <SelectItem key={outcome.id} value={outcome.id}>
                      {outcome.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Minute Notes</Label>
              <Textarea
                value={completeForm.minuteNotes}
                onChange={(e) =>
                  setCompleteForm((prev) => ({ ...prev, minuteNotes: e.target.value }))
                }
                placeholder="Enter minute notes..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setShowCompleteModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCompleteHearing}
              disabled={completeHearingMutation.isPending}
            >
              {completeHearingMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Hearing Confirmation */}
      <AlertDialog open={!!deleteHearingTarget} onOpenChange={(open) => !open && setDeleteHearingTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Hearing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this hearing? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteHearing} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
