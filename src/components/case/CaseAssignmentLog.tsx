"use client";

import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  useAssignmentsByCaseId, useCurrentAssignment, useLogAssignment, useOfficersList,
} from '@/hooks/queries';
import { Loader2, Plus, Shield, User, ArrowRight } from 'lucide-react';
import { useHasPermission } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

const assignmentSchema = z.object({
  newOfficerId: z.string().min(1, 'Officer is required'),
  assignmentType: z.string().min(1, 'Assignment type is required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  officerRank: z.string().optional(),
});

type AssignmentFormValues = z.infer<typeof assignmentSchema>;

const ASSIGNMENT_TYPES = [
  { value: 'INITIAL', label: 'Initial Assignment' },
  { value: 'REASSIGNMENT', label: 'Reassignment' },
  { value: 'ESCALATION', label: 'Escalation' },
  { value: 'TEMPORARY', label: 'Temporary Cover' },
];

interface Props {
  caseId: string;
  caseNo: string;
}

export function CaseAssignmentLog({ caseId, caseNo }: Props) {
  const canAssign = useHasPermission('case.update');
  const { data: assignments = [], isLoading } = useAssignmentsByCaseId(caseId);
  const { data: currentAssignment } = useCurrentAssignment(caseId);
  const assignMutation = useLogAssignment();
  const { data: officers = [] } = useOfficersList();

  const [showAssignModal, setShowAssignModal] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      newOfficerId: '',
      assignmentType: '',
      reason: '',
      officerRank: '',
    },
  });

  const watchedOfficerId = watch('newOfficerId');
  const watchedAssignmentType = watch('assignmentType');

  const handleAssign = async (data: AssignmentFormValues) => {
    try {
      await assignMutation.mutateAsync({
        caseId,
        request: {
          newOfficerId: data.newOfficerId,
          assignmentType: data.assignmentType,
          reason: data.reason,
          officerRank: data.officerRank || undefined,
        },
      });
      toast.success('Officer assigned successfully');
      setShowAssignModal(false);
      reset();
    } catch {
      toast.error('Failed to assign officer');
    }
  };

  const formatDate = (d?: string) =>
    d ? format(new Date(d), 'dd MMM yyyy HH:mm') : '-';

  const getTypeBadge = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'INITIAL': return <Badge className="bg-blue-100 text-blue-800">Initial</Badge>;
      case 'REASSIGNMENT': return <Badge className="bg-yellow-100 text-yellow-800">Reassignment</Badge>;
      case 'ESCALATION': return <Badge className="bg-red-100 text-red-800">Escalation</Badge>;
      case 'TEMPORARY': return <Badge className="bg-purple-100 text-purple-800">Temporary</Badge>;
      default: return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
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
                <Shield className="h-5 w-5 text-indigo-500" />
                Assignment Log
              </CardTitle>
              <CardDescription>Officer assignment history</CardDescription>
            </div>
            {canAssign && (
              <Button size="sm" onClick={() => setShowAssignModal(true)}>
                <Plus className="h-4 w-4 mr-1" /> Assign
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Current IO */}
          {currentAssignment && (
            <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <p className="text-xs font-medium text-indigo-600 mb-1">Current Investigating Officer</p>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-600" />
                <span className="font-medium text-sm">{currentAssignment.newOfficerName}</span>
                {currentAssignment.officerRank && (
                  <Badge variant="outline" className="text-xs">{currentAssignment.officerRank}</Badge>
                )}
              </div>
            </div>
          )}

          {/* Timeline */}
          {assignments.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Shield className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No assignment history</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className={`relative pl-6 pb-3 border-l-2 ${
                    a.isCurrent ? 'border-indigo-400' : 'border-gray-200'
                  }`}
                >
                  <div className={`absolute -left-[5px] top-1 h-2 w-2 rounded-full ${
                    a.isCurrent ? 'bg-indigo-500' : 'bg-gray-300'
                  }`} />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{a.newOfficerName}</span>
                    {getTypeBadge(a.assignmentType)}
                    {a.isCurrent && <Badge className="bg-indigo-100 text-indigo-800 text-xs">Current</Badge>}
                  </div>
                  {a.previousOfficerName && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <span>{a.previousOfficerName}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span>{a.newOfficerName}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">{a.reason}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(a.assignedAt)} &middot; by {a.assignedByName}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Officer Modal */}
      <Dialog open={showAssignModal} onOpenChange={(open) => { setShowAssignModal(open); if (!open) reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Officer</DialogTitle>
            <DialogDescription>Assign an investigating officer to case {caseNo}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleAssign)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Officer *</Label>
                <Select
                  value={watchedOfficerId}
                  onValueChange={(v) => {
                    const officer = officers.find(o => o.id === v);
                    setValue('newOfficerId', v, { shouldValidate: true });
                    if (officer?.roles?.[0]) {
                      setValue('officerRank', officer.roles[0]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an officer" />
                  </SelectTrigger>
                  <SelectContent>
                    {officers.map((officer) => (
                      <SelectItem key={officer.id} value={officer.id}>
                        <div className="flex items-center gap-2">
                          <span>{officer.fullName || officer.email}</span>
                          {officer.roles?.[0] && (
                            <span className="text-xs text-gray-500">({officer.roles[0]})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.newOfficerId && <p className="text-sm text-red-500">{errors.newOfficerId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Rank</Label>
                <Input
                  {...register('officerRank')}
                  placeholder="e.g. Inspector, Sergeant"
                />
              </div>
              <div className="space-y-2">
                <Label>Assignment Type *</Label>
                <Select
                  value={watchedAssignmentType}
                  onValueChange={(v) => setValue('assignmentType', v, { shouldValidate: true })}
                >
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {ASSIGNMENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.assignmentType && <p className="text-sm text-red-500">{errors.assignmentType.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Reason *</Label>
                <Textarea
                  {...register('reason')}
                  placeholder="Reason for assignment..."
                  rows={3}
                />
                {errors.reason && <p className="text-sm text-red-500">{errors.reason.message}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAssignModal(false)}>Cancel</Button>
              <Button type="submit" disabled={assignMutation.isPending}>
                {assignMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Assign Officer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
