"use client";

import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PermissionActionButton } from '@/components/ui/permission-action-button';
import { useWarrantsByCaseId, useCreateWarrant, useExecuteWarrant, useDropWarrant, usePartiesByCaseId } from '@/hooks/queries';
import type { ArrestWarrantDto } from '@/lib/api/arrestWarrant';
import { CheckCircle, ExternalLink, Loader2, Plus, ShieldAlert, ShieldOff, XCircle } from 'lucide-react';
import { useHasPermission } from '@/hooks/useAuth';
import { toast } from 'sonner';

const trackWarrantSchema = z.object({
  accusedName: z.string().min(1, 'Accused name is required'),
  accusedIdNo: z.string().optional(),
  offenceDescription: z.string().optional(),
  issuedBy: z.string().optional(),
  issuedDate: z.string().min(1, 'Issue date is required'),
  executionDate: z.string().optional(),
  warrantFileUrl: z.string().optional(),
  casePartyId: z.string().optional(),
});

type TrackWarrantFormValues = z.infer<typeof trackWarrantSchema>;

const executeWarrantSchema = z.object({
  executionDetails: z.string().min(1, 'Execution details are required'),
  executionDate: z.string().optional(),
});

type ExecuteWarrantFormValues = z.infer<typeof executeWarrantSchema>;

const liftWarrantSchema = z.object({
  liftedReason: z.string().min(1, 'Reason for lifting is required'),
});

type LiftWarrantFormValues = z.infer<typeof liftWarrantSchema>;

function getStatusBadge(status?: string) {
  const s = status?.toLowerCase();
  if (s === 'in force' || s === 'issued') return <Badge className="bg-yellow-100 text-yellow-800">In Force</Badge>;
  if (s === 'executed') return <Badge className="bg-green-100 text-green-800">Executed</Badge>;
  if (s === 'lifted' || s === 'dropped') return <Badge variant="secondary">Lifted</Badge>;
  if (s === 'recalled') return <Badge className="bg-orange-100 text-orange-800">Recalled</Badge>;
  if (s === 'expired') return <Badge className="bg-gray-100 text-gray-600">Expired</Badge>;
  return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
}

/** Check if warrant is still active (can be executed or lifted) */
function isActive(w: ArrestWarrantDto) {
  const s = w.warrantStatusName?.toLowerCase();
  return s === 'in force' || s === 'issued';
}

interface Props {
  caseId: string;
  caseNo: string;
}

export function ArrestWarrantList({ caseId, caseNo }: Props) {
  const canManage = useHasPermission('case.arrest_warrant');
  const { data: warrants = [], isLoading } = useWarrantsByCaseId(caseId);
  const { data: parties = [] } = usePartiesByCaseId(caseId);
  const createMutation = useCreateWarrant();
  const executeMutation = useExecuteWarrant();
  const dropMutation = useDropWarrant();

  const [showTrackModal, setShowTrackModal] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [showLiftModal, setShowLiftModal] = useState(false);
  const [selectedWarrant, setSelectedWarrant] = useState<ArrestWarrantDto | null>(null);

  // Filter defendants from case parties for the dropdown
  const defendants = parties.filter(p =>
    p.partyRole?.startsWith('defendant') || p.partyRole === 'other'
  );

  // Track warrant form
  const trackForm = useForm<TrackWarrantFormValues>({
    resolver: zodResolver(trackWarrantSchema),
    defaultValues: {
      accusedName: '',
      accusedIdNo: '',
      offenceDescription: '',
      issuedBy: '',
      issuedDate: '',
      executionDate: '',
      warrantFileUrl: '',
      casePartyId: '',
    },
  });

  // Execute form
  const executeForm = useForm<ExecuteWarrantFormValues>({
    resolver: zodResolver(executeWarrantSchema),
    defaultValues: { executionDetails: '', executionDate: '' },
  });

  // Lift form
  const liftForm = useForm<LiftWarrantFormValues>({
    resolver: zodResolver(liftWarrantSchema),
    defaultValues: { liftedReason: '' },
  });

  // Auto-fill accused name when defendant selected
  const handleDefendantSelect = (partyId: string) => {
    trackForm.setValue('casePartyId', partyId);
    const party = parties.find(p => p.id === partyId);
    if (party) {
      const name = party.externalName || party.userName || party.driverName || party.vehicleOwnerName || party.transporterName || '';
      if (name) trackForm.setValue('accusedName', name);
      const idNo = party.externalIdNumber || '';
      if (idNo) trackForm.setValue('accusedIdNo', idNo);
    }
  };

  const handleTrack = async (data: TrackWarrantFormValues) => {
    try {
      await createMutation.mutateAsync({
        caseRegisterId: caseId,
        accusedName: data.accusedName,
        accusedIdNo: data.accusedIdNo || undefined,
        offenceDescription: data.offenceDescription || undefined,
        issuedBy: data.issuedBy || undefined,
        issuedDate: data.issuedDate,
        executionDate: data.executionDate || undefined,
        warrantFileUrl: data.warrantFileUrl || undefined,
        casePartyId: data.casePartyId || undefined,
      });
      toast.success('Warrant tracked successfully');
      setShowTrackModal(false);
      trackForm.reset();
    } catch {
      toast.error('Failed to track warrant');
    }
  };

  const handleExecute = async (data: ExecuteWarrantFormValues) => {
    if (!selectedWarrant) return;
    try {
      await executeMutation.mutateAsync({
        id: selectedWarrant.id,
        request: {
          executionDetails: data.executionDetails,
          executionDate: data.executionDate || undefined,
        },
      });
      toast.success('Warrant marked as executed');
      setShowExecuteModal(false);
      executeForm.reset();
    } catch {
      toast.error('Failed to execute warrant');
    }
  };

  const handleLift = async (data: LiftWarrantFormValues) => {
    if (!selectedWarrant) return;
    try {
      await dropMutation.mutateAsync({
        id: selectedWarrant.id,
        request: { droppedReason: data.liftedReason },
      });
      toast.success('Warrant lifted');
      setShowLiftModal(false);
      liftForm.reset();
    } catch {
      toast.error('Failed to lift warrant');
    }
  };

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            Arrest Warrants ({warrants.length})
          </CardTitle>
          {canManage && (
            <Button size="sm" onClick={() => setShowTrackModal(true)}>
              <Plus className="h-4 w-4 mr-1" /> Track Warrant
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : warrants.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShieldAlert className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p>No warrants tracked for this case</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Warrant No</TableHead>
                    <TableHead>Accused</TableHead>
                    <TableHead className="hidden sm:table-cell">Offence</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead className="hidden sm:table-cell">Execution Date</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warrants.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-mono font-medium text-sm">{w.warrantNo}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{w.accusedName}</p>
                          {w.accusedIdNo && <p className="text-xs text-gray-500">ID: {w.accusedIdNo}</p>}
                          {w.casePartyName && <p className="text-xs text-blue-600">Party: {w.casePartyName}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate hidden sm:table-cell">{w.offenceDescription || '-'}</TableCell>
                      <TableCell>{getStatusBadge(w.warrantStatusName)}</TableCell>
                      <TableCell className="text-sm text-gray-500">{formatDate(w.issuedDate || w.issuedAt)}</TableCell>
                      <TableCell className="text-sm text-gray-500 hidden sm:table-cell">{formatDate(w.executionDate)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {w.warrantFileUrl && (
                            <a href={w.warrantFileUrl} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted">
                              <ExternalLink className="h-4 w-4 text-blue-600" />
                            </a>
                          )}
                          <PermissionActionButton
                            permission="case.arrest_warrant"
                            icon={CheckCircle}
                            label="Execute"
                            onClick={() => { setSelectedWarrant(w); setShowExecuteModal(true); }}
                            condition={isActive(w)}
                          />
                          <PermissionActionButton
                            permission="case.arrest_warrant"
                            icon={ShieldOff}
                            label="Lift"
                            onClick={() => { setSelectedWarrant(w); setShowLiftModal(true); }}
                            condition={isActive(w)}
                            destructive
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Track Warrant Modal */}
      <Dialog open={showTrackModal} onOpenChange={(open) => { setShowTrackModal(open); if (!open) trackForm.reset(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Track Arrest Warrant</DialogTitle>
            <DialogDescription>Record a warrant for case {caseNo}</DialogDescription>
          </DialogHeader>
          <form onSubmit={trackForm.handleSubmit(handleTrack)}>
            <div className="space-y-4 py-4">
              {/* Link to defendant */}
              {defendants.length > 0 && (
                <div className="space-y-2">
                  <Label>Link to Defendant (Case Party)</Label>
                  <Select onValueChange={handleDefendantSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select defendant..." />
                    </SelectTrigger>
                    <SelectContent>
                      {defendants.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.externalName || p.userName || p.driverName || p.vehicleOwnerName || 'Unknown'} ({p.partyRole?.replace(/_/g, ' ')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Accused Name *</Label>
                <Input {...trackForm.register('accusedName')} placeholder="Full name" />
                {trackForm.formState.errors.accusedName && <p className="text-sm text-red-500">{trackForm.formState.errors.accusedName.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ID Number</Label>
                  <Input {...trackForm.register('accusedIdNo')} placeholder="ID/Passport" />
                </div>
                <div className="space-y-2">
                  <Label>Issued By (Magistrate)</Label>
                  <Input {...trackForm.register('issuedBy')} placeholder="Magistrate name" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date Issued by Court *</Label>
                  <Input type="date" {...trackForm.register('issuedDate')} />
                  {trackForm.formState.errors.issuedDate && <p className="text-sm text-red-500">{trackForm.formState.errors.issuedDate.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Execution Date (if executed)</Label>
                  <Input type="date" {...trackForm.register('executionDate')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Offence Description</Label>
                <Textarea {...trackForm.register('offenceDescription')} placeholder="Description of the offence..." rows={3} />
              </div>

              <div className="space-y-2">
                <Label>Warrant Document URL</Label>
                <Input {...trackForm.register('warrantFileUrl')} placeholder="URL to warrant document (or upload via subfiles)" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowTrackModal(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Track Warrant
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Execute Warrant Modal */}
      <Dialog open={showExecuteModal} onOpenChange={(open) => { setShowExecuteModal(open); if (!open) executeForm.reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Execute Warrant</DialogTitle>
            <DialogDescription>Record execution details for warrant {selectedWarrant?.warrantNo}</DialogDescription>
          </DialogHeader>
          <form onSubmit={executeForm.handleSubmit(handleExecute)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Execution Date</Label>
                <Input type="date" {...executeForm.register('executionDate')} />
              </div>
              <div className="space-y-2">
                <Label>Execution Details *</Label>
                <Textarea {...executeForm.register('executionDetails')} placeholder="Where, when, and how the warrant was executed..." rows={4} />
                {executeForm.formState.errors.executionDetails && <p className="text-sm text-red-500">{executeForm.formState.errors.executionDetails.message}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowExecuteModal(false)}>Cancel</Button>
              <Button type="submit" disabled={executeMutation.isPending}>
                {executeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Confirm Execution
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lift Warrant Modal */}
      <Dialog open={showLiftModal} onOpenChange={(open) => { setShowLiftModal(open); if (!open) liftForm.reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lift Warrant</DialogTitle>
            <DialogDescription>Provide reason for lifting warrant {selectedWarrant?.warrantNo}</DialogDescription>
          </DialogHeader>
          <form onSubmit={liftForm.handleSubmit(handleLift)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Reason *</Label>
                <Textarea {...liftForm.register('liftedReason')} placeholder="Reason for lifting the warrant..." rows={4} />
                {liftForm.formState.errors.liftedReason && <p className="text-sm text-red-500">{liftForm.formState.errors.liftedReason.message}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowLiftModal(false)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={dropMutation.isPending}>
                {dropMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Lift Warrant
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
