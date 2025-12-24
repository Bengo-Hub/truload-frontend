'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { useHasPermission } from '@/hooks/useAuth';
import { createWorkShift, deleteWorkShift, fetchWorkShifts, updateWorkShift } from '@/lib/api/setup';
import type { CreateWorkShiftRequest, UpdateWorkShiftRequest, WorkShiftDto, WorkShiftScheduleDto } from '@/types/setup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, RefreshCcw, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const defaultSchedule: WorkShiftScheduleDto[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
].map((day) => ({
  day,
  startTime: '06:00',
  endTime: '14:00',
  breakHours: 0.5,
  isWorkingDay: day !== 'Sunday',
}));

type ShiftFormValues = CreateWorkShiftRequest;

export default function ShiftsPage() {
  return (
    <AppShell title="Shift Management" subtitle="Configure work shifts and schedules">
      <ProtectedRoute requiredPermissions={["workshift.view"]}>
        <ShiftsContent />
      </ProtectedRoute>
    </AppShell>
  );
}

function ShiftsContent() {
  const canUpdate = useHasPermission('workshift.update');
  const canCreate = useHasPermission('workshift.create');
  const canEdit = canUpdate || canCreate;
  const canDelete = useHasPermission('workshift.delete');
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WorkShiftDto | null>(null);

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['workShifts'],
    queryFn: () => fetchWorkShifts(true),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateWorkShiftRequest) => createWorkShift(payload),
    onSuccess: () => {
      toast.success('Shift created');
      queryClient.invalidateQueries({ queryKey: ['workShifts'] });
      setDialogOpen(false);
    },
    onError: () => toast.error('Failed to create shift'),
  });

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; payload: UpdateWorkShiftRequest }) =>
      updateWorkShift(input.id, input.payload),
    onSuccess: () => {
      toast.success('Shift updated');
      queryClient.invalidateQueries({ queryKey: ['workShifts'] });
      setDialogOpen(false);
    },
    onError: () => toast.error('Failed to update shift'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWorkShift(id),
    onSuccess: () => {
      toast.success('Shift deleted');
      queryClient.invalidateQueries({ queryKey: ['workShifts'] });
    },
    onError: () => toast.error('Failed to delete shift'),
  });

  const { register, handleSubmit, control, reset, watch } = useForm<ShiftFormValues>({
    defaultValues: {
      name: '',
      description: '',
      totalHoursPerWeek: 40,
      graceMinutes: 0,
      schedules: defaultSchedule,
    },
  });

  const schedules = watch('schedules');

  useEffect(() => {
    if (editing) {
      reset({
        name: editing.name,
        description: editing.description ?? '',
        totalHoursPerWeek: editing.totalHoursPerWeek,
        graceMinutes: editing.graceMinutes,
        schedules: editing.schedules.map((s) => ({
          ...s,
          startTime: s.startTime?.toString().slice(0, 5) ?? '06:00',
          endTime: s.endTime?.toString().slice(0, 5) ?? '14:00',
        })),
      });
    } else {
      reset({
        name: '',
        description: '',
        totalHoursPerWeek: 40,
        graceMinutes: 0,
        schedules: defaultSchedule,
      });
    }
  }, [editing, reset]);

  const onSubmit = async (values: ShiftFormValues) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, payload: values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (shift: WorkShiftDto) => {
    setEditing(shift);
    setDialogOpen(true);
  };

  const handleDelete = (shift: WorkShiftDto) => {
    if (!canDelete) return;
    if (window.confirm(`Delete ${shift.name}?`)) {
      deleteMutation.mutate(shift.id);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Shift Management</h2>
          <p className="text-sm text-gray-500">Define station shifts and schedules.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => queryClient.invalidateQueries({ queryKey: ['workShifts'] })}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
          {canEdit && (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Shift
            </Button>
          )}
        </div>
      </header>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 flex items-center justify-between">
          <span>Shifts</span>
          <span className="text-xs text-gray-500">{shifts.length} entries</span>
        </div>
        <ScrollArea className="max-h-[70vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Grace (min)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-gray-500">
                    Loading shifts...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && shifts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-gray-500">
                    No shifts configured.
                  </TableCell>
                </TableRow>
              )}
              {shifts.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell className="font-medium">{shift.name}</TableCell>
                  <TableCell>{shift.totalHoursPerWeek} hrs/week</TableCell>
                  <TableCell>{shift.graceMinutes} min</TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        shift.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {shift.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {shift.updatedAt ? format(new Date(shift.updatedAt), 'dd MMM yyyy HH:mm') : '—'}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {canEdit && (
                      <Button variant="ghost" size="sm" onClick={() => openEdit(shift)}>
                        Edit
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(shift)}>
                        Delete
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(value) => (!value ? setDialogOpen(false) : null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit shift' : 'Create shift'}</DialogTitle>
            <DialogDescription>Define working hours and grace periods.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Morning Shift" {...register('name', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="graceMinutes">Grace minutes</Label>
                <Input id="graceMinutes" type="number" min={0} {...register('graceMinutes', { valueAsNumber: true })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" placeholder="Notes" {...register('description')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalHoursPerWeek">Total hours/week</Label>
                <Input
                  id="totalHoursPerWeek"
                  type="number"
                  step="0.5"
                  {...register('totalHoursPerWeek', { valueAsNumber: true })}
                />
              </div>
            </div>

            <Tabs defaultValue="schedule">
              <TabsList>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
              </TabsList>
              <TabsContent value="schedule">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {schedules?.map((schedule, idx) => (
                    <div key={schedule.day} className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-gray-800">{schedule.day}</div>
                        {!schedule.isWorkingDay && (
                          <span className="text-xs text-gray-500">Off</span>
                        )}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div className="space-y-1">
                          <Label>Start</Label>
                          <Controller
                            control={control}
                            name={`schedules.${idx}.startTime` as const}
                            render={({ field }) => <Input type="time" value={field.value} onChange={field.onChange} />}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>End</Label>
                          <Controller
                            control={control}
                            name={`schedules.${idx}.endTime` as const}
                            render={({ field }) => <Input type="time" value={field.value} onChange={field.onChange} />}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Break (hrs)</Label>
                          <Controller
                            control={control}
                            name={`schedules.${idx}.breakHours` as const}
                            render={({ field }) => (
                              <Input
                                type="number"
                                step="0.25"
                                value={field.value}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              />
                            )}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Status</Label>
                          <Controller
                            control={control}
                            name={`schedules.${idx}.isWorkingDay` as const}
                            render={({ field }) => (
                              <Select
                                value={field.value ? 'working' : 'off'}
                                onValueChange={(value) => field.onChange(value === 'working')}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="working">Working</SelectItem>
                                  <SelectItem value="off">Off</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="justify-between">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canEdit}>
                <Save className="mr-2 h-4 w-4" />
                {editing ? 'Save changes' : 'Create shift'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
