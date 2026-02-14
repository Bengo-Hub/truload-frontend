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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PermissionActionButton } from '@/components/ui/permission-action-button';
import { useWarrantsByCaseId, useCreateWarrant, useExecuteWarrant, useDropWarrant } from '@/hooks/queries';
import type { ArrestWarrantDto } from '@/lib/api/arrestWarrant';
import { CheckCircle, Loader2, Plus, ShieldAlert, XCircle } from 'lucide-react';
import { useHasPermission } from '@/hooks/useAuth';
import { toast } from 'sonner';

const issueWarrantSchema = z.object({
  accusedName: z.string().min(1, 'Accused name is required'),
  accusedIdNo: z.string().optional(),
  offenceDescription: z.string().optional(),
  issuedBy: z.string().optional(),
});

type IssueWarrantFormValues = z.infer<typeof issueWarrantSchema>;

const executeWarrantSchema = z.object({
  executionDetails: z.string().min(1, 'Execution details are required'),
});

type ExecuteWarrantFormValues = z.infer<typeof executeWarrantSchema>;

const dropWarrantSchema = z.object({
  droppedReason: z.string().min(1, 'Reason for dropping is required'),
});

type DropWarrantFormValues = z.infer<typeof dropWarrantSchema>;

function getStatusBadge(status?: string) {
  switch (status?.toLowerCase()) {
    case 'issued': return <Badge className="bg-yellow-100 text-yellow-800">Issued</Badge>;
    case 'executed': return <Badge className="bg-green-100 text-green-800">Executed</Badge>;
    case 'dropped': return <Badge variant="secondary">Dropped</Badge>;
    default: return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
  }
}

interface Props {
  caseId: string;
  caseNo: string;
}

export function ArrestWarrantList({ caseId, caseNo }: Props) {
  const canManage = useHasPermission('case.arrest_warrant');
  const { data: warrants = [], isLoading } = useWarrantsByCaseId(caseId);
  const createMutation = useCreateWarrant();
  const executeMutation = useExecuteWarrant();
  const dropMutation = useDropWarrant();

  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [showDropModal, setShowDropModal] = useState(false);
  const [selectedWarrant, setSelectedWarrant] = useState<ArrestWarrantDto | null>(null);

  // Issue form
  const issueForm = useForm<IssueWarrantFormValues>({
    resolver: zodResolver(issueWarrantSchema),
    defaultValues: {
      accusedName: '',
      accusedIdNo: '',
      offenceDescription: '',
      issuedBy: '',
    },
  });

  // Execute form
  const executeForm = useForm<ExecuteWarrantFormValues>({
    resolver: zodResolver(executeWarrantSchema),
    defaultValues: { executionDetails: '' },
  });

  // Drop form
  const dropForm = useForm<DropWarrantFormValues>({
    resolver: zodResolver(dropWarrantSchema),
    defaultValues: { droppedReason: '' },
  });

  const handleIssue = async (data: IssueWarrantFormValues) => {
    try {
      await createMutation.mutateAsync({
        caseRegisterId: caseId,
        accusedName: data.accusedName,
        accusedIdNo: data.accusedIdNo || undefined,
        offenceDescription: data.offenceDescription || undefined,
        issuedBy: data.issuedBy || undefined,
      });
      toast.success('Warrant issued successfully');
      setShowIssueModal(false);
      issueForm.reset();
    } catch {
      toast.error('Failed to issue warrant');
    }
  };

  const handleExecute = async (data: ExecuteWarrantFormValues) => {
    if (!selectedWarrant) return;
    try {
      await executeMutation.mutateAsync({
        id: selectedWarrant.id,
        request: { executionDetails: data.executionDetails },
      });
      toast.success('Warrant executed');
      setShowExecuteModal(false);
      executeForm.reset();
    } catch {
      toast.error('Failed to execute warrant');
    }
  };

  const handleDrop = async (data: DropWarrantFormValues) => {
    if (!selectedWarrant) return;
    try {
      await dropMutation.mutateAsync({
        id: selectedWarrant.id,
        request: { droppedReason: data.droppedReason },
      });
      toast.success('Warrant dropped');
      setShowDropModal(false);
      dropForm.reset();
    } catch {
      toast.error('Failed to drop warrant');
    }
  };

  const isIssued = (w: ArrestWarrantDto) => w.warrantStatusName?.toLowerCase() === 'issued';

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
            <Button size="sm" onClick={() => setShowIssueModal(true)}>
              <Plus className="h-4 w-4 mr-1" /> Issue Warrant
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
              <p>No warrants issued for this case</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Warrant No</TableHead>
                    <TableHead>Accused</TableHead>
                    <TableHead>Offence</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warrants.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-mono font-medium">{w.warrantNo}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{w.accusedName}</p>
                          {w.accusedIdNo && <p className="text-xs text-gray-500">ID: {w.accusedIdNo}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{w.offenceDescription || '-'}</TableCell>
                      <TableCell>{getStatusBadge(w.warrantStatusName)}</TableCell>
                      <TableCell className="text-sm text-gray-500">{formatDate(w.issuedAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <PermissionActionButton
                            permission="case.arrest_warrant"
                            icon={CheckCircle}
                            label="Execute"
                            onClick={() => { setSelectedWarrant(w); setShowExecuteModal(true); }}
                            condition={isIssued(w)}
                          />
                          <PermissionActionButton
                            permission="case.arrest_warrant"
                            icon={XCircle}
                            label="Drop"
                            onClick={() => { setSelectedWarrant(w); setShowDropModal(true); }}
                            condition={isIssued(w)}
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

      {/* Issue Warrant Modal */}
      <Dialog open={showIssueModal} onOpenChange={(open) => { setShowIssueModal(open); if (!open) issueForm.reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Arrest Warrant</DialogTitle>
            <DialogDescription>Issue a warrant for case {caseNo}</DialogDescription>
          </DialogHeader>
          <form onSubmit={issueForm.handleSubmit(handleIssue)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Accused Name *</Label>
                <Input {...issueForm.register('accusedName')} placeholder="Full name" />
                {issueForm.formState.errors.accusedName && <p className="text-sm text-red-500">{issueForm.formState.errors.accusedName.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ID Number</Label>
                  <Input {...issueForm.register('accusedIdNo')} placeholder="ID/Passport" />
                </div>
                <div className="space-y-2">
                  <Label>Issued By (Magistrate)</Label>
                  <Input {...issueForm.register('issuedBy')} placeholder="Magistrate name" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Offence Description</Label>
                <Textarea {...issueForm.register('offenceDescription')} placeholder="Description of the offence..." rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowIssueModal(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Issue Warrant
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
                <Label>Execution Details *</Label>
                <Textarea {...executeForm.register('executionDetails')} placeholder="Where, when, and how the warrant was executed..." rows={4} />
                {executeForm.formState.errors.executionDetails && <p className="text-sm text-red-500">{executeForm.formState.errors.executionDetails.message}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowExecuteModal(false)}>Cancel</Button>
              <Button type="submit" disabled={executeMutation.isPending}>
                {executeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Execute
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Drop Warrant Modal */}
      <Dialog open={showDropModal} onOpenChange={(open) => { setShowDropModal(open); if (!open) dropForm.reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Drop Warrant</DialogTitle>
            <DialogDescription>Provide reason for dropping warrant {selectedWarrant?.warrantNo}</DialogDescription>
          </DialogHeader>
          <form onSubmit={dropForm.handleSubmit(handleDrop)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Reason *</Label>
                <Textarea {...dropForm.register('droppedReason')} placeholder="Reason for dropping the warrant..." rows={4} />
                {dropForm.formState.errors.droppedReason && <p className="text-sm text-red-500">{dropForm.formState.errors.droppedReason.message}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDropModal(false)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={dropMutation.isPending}>
                {dropMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Drop Warrant
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
