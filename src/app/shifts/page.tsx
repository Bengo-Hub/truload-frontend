'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Calendar,
  Clock,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pagination, usePagination } from '@/components/ui/pagination';
import { Card } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useHasPermission } from '@/hooks/useAuth';
import {
  assignUserShift,
  createShiftRotation,
  createWorkShift,
  deleteShiftRotation,
  deleteUserShift,
  deleteWorkShift,
  fetchShiftRotations,
  fetchUsers,
  fetchUserShifts,
  fetchWorkShifts,
  updateShiftRotation,
  updateUserShift,
  updateWorkShift,
} from '@/lib/api/setup';
import type {
  CreateShiftRotationRequest,
  CreateUserShiftRequest,
  CreateWorkShiftRequest,
  ShiftRotationDto,
  UpdateShiftRotationRequest,
  UpdateUserShiftRequest,
  UpdateWorkShiftRequest,
  UserShiftDto,
  UserSummary,
  WorkShiftDto,
  WorkShiftScheduleDto,
} from '@/types/setup';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

const DURATION_UNITS = ['Days', 'Weeks', 'Months'] as const;

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSchedulePreview(schedules: WorkShiftScheduleDto[]): string {
  const workingDays = schedules.filter((s) => s.isWorkingDay !== false);
  if (workingDays.length === 0) return 'No working days';
  const dayAbbrs: Record<string, string> = {
    Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
    Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
  };
  const days = workingDays.map((d) => dayAbbrs[d.day] ?? d.day.slice(0, 3));
  const firstTime = workingDays[0];
  const startStr = firstTime.startTime?.toString().slice(0, 5) ?? '??:??';
  const endStr = firstTime.endTime?.toString().slice(0, 5) ?? '??:??';

  // Detect consecutive ranges
  const allWeekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const allWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const daysStr = days.length === 7 ? 'Daily'
    : days.length === 5 && allWeekdays.every((d) => days.includes(d)) ? 'Mon-Fri'
    : days.length === 6 && allWeek.slice(0, 6).every((d) => days.includes(d)) ? 'Mon-Sat'
    : days.join(', ');

  return `${daysStr} ${startStr}-${endStr}`;
}

function getUserShiftStatus(assignment: UserShiftDto): 'Active' | 'Expired' | 'Future' {
  const now = new Date();
  const start = new Date(assignment.startsOn);
  if (start > now) return 'Future';
  if (assignment.endsOn) {
    const end = new Date(assignment.endsOn);
    if (end < now) return 'Expired';
  }
  return 'Active';
}

function statusBadgeClasses(status: string): string {
  switch (status) {
    case 'Active':
      return 'bg-emerald-50 text-emerald-700 border-0';
    case 'Expired':
      return 'bg-gray-100 text-gray-600 border-0';
    case 'Future':
      return 'bg-blue-50 text-blue-700 border-0';
    case 'Inactive':
      return 'bg-gray-100 text-gray-600 border-0';
    default:
      return 'bg-gray-100 text-gray-600 border-0';
  }
}

// ---------------------------------------------------------------------------
// Page wrapper
// ---------------------------------------------------------------------------

export default function ShiftsPage() {
  return (
    <AppShell title="Shift Management" subtitle="Configure work shifts, rotations, and assignments">
      <ProtectedRoute requiredPermissions={["user.manage_shifts"]}>
        <ShiftsContent />
      </ProtectedRoute>
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// Main content with 3-tab layout
// ---------------------------------------------------------------------------

function ShiftsContent() {
  return (
    <Tabs defaultValue="shifts" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="shifts" className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          <span className="hidden sm:inline">Work Shifts</span>
          <span className="sm:hidden">Shifts</span>
        </TabsTrigger>
        <TabsTrigger value="rotations" className="flex items-center gap-1.5">
          <RotateCcw className="h-4 w-4" />
          <span className="hidden sm:inline">Shift Rotations</span>
          <span className="sm:hidden">Rotations</span>
        </TabsTrigger>
        <TabsTrigger value="assignments" className="flex items-center gap-1.5">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">User Assignments</span>
          <span className="sm:hidden">Assign</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="shifts" className="mt-6">
        <WorkShiftsTab />
      </TabsContent>
      <TabsContent value="rotations" className="mt-6">
        <ShiftRotationsTab />
      </TabsContent>
      <TabsContent value="assignments" className="mt-6">
        <UserAssignmentsTab />
      </TabsContent>
    </Tabs>
  );
}

// ===========================================================================
// TAB 1: Work Shifts
// ===========================================================================

type ShiftFormValues = CreateWorkShiftRequest;

function WorkShiftsTab() {
  const canManage = useHasPermission('user.manage_shifts');
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WorkShiftDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkShiftDto | null>(null);
  const { pageNumber, pageSize, page, setPage, setPageSize, reset: resetPagination } = usePagination(10);

  const { data: shifts = [], isLoading, isRefetching } = useQuery({
    queryKey: ['workShifts'],
    queryFn: () => fetchWorkShifts(true),
  });

  const filtered = useMemo(() => {
    let result = shifts;
    if (statusFilter === 'active') result = result.filter((s) => s.isActive);
    if (statusFilter === 'inactive') result = result.filter((s) => !s.isActive);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.description ?? '').toLowerCase().includes(q),
      );
    }
    return result;
  }, [shifts, search, statusFilter]);

  // Reset pagination when filters change
  useEffect(() => { resetPagination(); }, [search, statusFilter, resetPagination]);

  const paginatedShifts = useMemo(() => {
    const start = (pageNumber - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageNumber, pageSize]);

  const activeCount = useMemo(() => shifts.filter((s) => s.isActive).length, [shifts]);
  const inactiveCount = useMemo(() => shifts.filter((s) => !s.isActive).length, [shifts]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['workShifts'] });
    toast.info('Refreshing shifts...');
  }, [queryClient]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (shift: WorkShiftDto) => {
    setEditing(shift);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="flex items-center gap-3 px-4 py-3">
          <div className="rounded-lg bg-blue-100 p-2">
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Shifts</p>
            <p className="text-lg font-semibold">{isLoading ? '...' : shifts.length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 px-4 py-3">
          <div className="rounded-lg bg-emerald-100 p-2">
            <Clock className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-lg font-semibold">{isLoading ? '...' : activeCount}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 px-4 py-3">
          <div className="rounded-lg bg-gray-100 p-2">
            <Clock className="h-4 w-4 text-gray-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Inactive</p>
            <p className="text-lg font-semibold">{isLoading ? '...' : inactiveCount}</p>
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search shifts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-auto min-w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefetching}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          {canManage && (
            <Button size="sm" onClick={openCreate} className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Shift</span>
              <span className="sm:hidden">New</span>
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white shadow-sm">
        <ScrollArea className="max-h-[65vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden lg:table-cell">Schedule</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead>Hours/Wk</TableHead>
                <TableHead className="hidden sm:table-cell">Grace</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden xl:table-cell">Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`skel-${i}`}>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))}

              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="rounded-full bg-muted p-4 mb-4">
                        <Clock className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {search ? 'No matching shifts' : 'No shifts configured'}
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        {search
                          ? 'Try adjusting your search query or clear the filter.'
                          : 'Get started by creating your first work shift.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                paginatedShifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell className="font-medium">{shift.name}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-xs font-mono text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
                        {getSchedulePreview(shift.schedules)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                      {shift.description || '—'}
                    </TableCell>
                    <TableCell className="font-medium">{shift.totalHoursPerWeek}h</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{shift.graceMinutes}m</TableCell>
                    <TableCell>
                      <Badge className={statusBadgeClasses(shift.isActive ? 'Active' : 'Inactive')}>
                        {shift.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                      {shift.updatedAt ? format(new Date(shift.updatedAt), 'dd MMM yyyy HH:mm') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => openEdit(shift)}
                            title="Edit shift"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        )}
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget(shift)}
                            title="Delete shift"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Pagination */}
        <div className="border-t px-4 py-3">
          <Pagination
            page={page}
            pageSize={pageSize}
            totalItems={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Dialogs */}
      <ShiftFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
      />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Delete Work Shift"
        description="This action cannot be undone. This will permanently delete the work shift."
        itemName={deleteTarget?.name ?? ''}
        queryKey={['workShifts']}
        deleteFn={() => deleteWorkShift(deleteTarget!.id)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Work Shift Form Dialog
// ---------------------------------------------------------------------------

interface ShiftFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: WorkShiftDto | null;
}

function ShiftFormDialog({ open, onOpenChange, editing }: ShiftFormDialogProps) {
  const queryClient = useQueryClient();

  const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm<ShiftFormValues>({
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

  const createMutation = useMutation({
    mutationFn: (payload: CreateWorkShiftRequest) => createWorkShift(payload),
    onSuccess: () => {
      toast.success('Shift created successfully');
      queryClient.invalidateQueries({ queryKey: ['workShifts'] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error('Failed to create shift', { description: err.message }),
  });

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; payload: UpdateWorkShiftRequest }) =>
      updateWorkShift(input.id, input.payload),
    onSuccess: () => {
      toast.success('Shift updated successfully');
      queryClient.invalidateQueries({ queryKey: ['workShifts'] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error('Failed to update shift', { description: err.message }),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: ShiftFormValues) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: values });
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onOpenChange(false); } }}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Work Shift' : 'Create Work Shift'}</DialogTitle>
          <DialogDescription>
            Define working hours, grace periods, and weekly schedules.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 flex flex-col space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="shift-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="shift-name"
                placeholder="Morning Shift"
                {...register('name', { required: 'Shift name is required' })}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift-grace">Grace Minutes</Label>
              <Input
                id="shift-grace"
                type="number"
                min={0}
                {...register('graceMinutes', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="shift-desc">Description</Label>
              <Input
                id="shift-desc"
                placeholder="Brief description of this shift..."
                {...register('description')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift-hours">Total Hours / Week</Label>
              <Input
                id="shift-hours"
                type="number"
                step="0.5"
                {...register('totalHoursPerWeek', { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Schedule grid */}
          <div className="flex-1 min-h-0">
            <Label className="mb-2 block text-sm font-medium">Weekly Schedule</Label>
            <ScrollArea className="h-[340px] pr-2">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {schedules?.map((schedule, idx) => (
                  <div
                    key={schedule.day}
                    className="rounded-lg border border-gray-200 overflow-hidden"
                  >
                    {/* Day card gradient header */}
                    <div className={`h-1.5 bg-gradient-to-r ${schedule.isWorkingDay ? 'from-sky-500 to-sky-400' : 'from-gray-300 to-gray-200'}`} />
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-sm text-gray-800">{schedule.day}</span>
                        {!schedule.isWorkingDay && (
                          <Badge className="bg-gray-100 text-gray-500 border-0 text-[10px]">Off Day</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Start</Label>
                          <Controller
                            control={control}
                            name={`schedules.${idx}.startTime` as const}
                            render={({ field }) => (
                              <Input type="time" className="h-8 text-xs" value={field.value} onChange={field.onChange} />
                            )}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">End</Label>
                          <Controller
                            control={control}
                            name={`schedules.${idx}.endTime` as const}
                            render={({ field }) => (
                              <Input type="time" className="h-8 text-xs" value={field.value} onChange={field.onChange} />
                            )}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Break (hrs)</Label>
                          <Controller
                            control={control}
                            name={`schedules.${idx}.breakHours` as const}
                            render={({ field }) => (
                              <Input
                                type="number"
                                step="0.25"
                                className="h-8 text-xs"
                                value={field.value}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              />
                            )}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Status</Label>
                          <Controller
                            control={control}
                            name={`schedules.${idx}.isWorkingDay` as const}
                            render={({ field }) => (
                              <Select
                                value={field.value ? 'working' : 'off'}
                                onValueChange={(value) => field.onChange(value === 'working')}
                              >
                                <SelectTrigger className="h-8 text-xs">
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
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Shift'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ===========================================================================
// TAB 2: Shift Rotations
// ===========================================================================

interface RotationFormValues {
  title: string;
  runDuration: number;
  runUnit: string;
  breakDuration: number;
  breakUnit: string;
  rotationShifts: { workShiftId: string; sequenceOrder: number }[];
}

function ShiftRotationsTab() {
  const canManage = useHasPermission('user.manage_shifts');
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ShiftRotationDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShiftRotationDto | null>(null);
  const { pageNumber, pageSize, page, setPage, setPageSize, reset: resetPagination } = usePagination(10);

  const { data: rotations = [], isLoading, isRefetching } = useQuery({
    queryKey: ['shiftRotations'],
    queryFn: () => fetchShiftRotations(true),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['workShifts'],
    queryFn: () => fetchWorkShifts(true),
  });

  const filtered = useMemo(() => {
    let result = rotations;
    if (statusFilter === 'active') result = result.filter((r) => r.isActive);
    if (statusFilter === 'inactive') result = result.filter((r) => !r.isActive);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) => r.title.toLowerCase().includes(q));
    }
    return result;
  }, [rotations, search, statusFilter]);

  useEffect(() => { resetPagination(); }, [search, statusFilter, resetPagination]);

  const paginatedRotations = useMemo(() => {
    const start = (pageNumber - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageNumber, pageSize]);

  const activeCount = useMemo(() => rotations.filter((r) => r.isActive).length, [rotations]);
  const inactiveCount = useMemo(() => rotations.filter((r) => !r.isActive).length, [rotations]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['shiftRotations'] });
    toast.info('Refreshing rotations...');
  }, [queryClient]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (rotation: ShiftRotationDto) => {
    setEditing(rotation);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="flex items-center gap-3 px-4 py-3">
          <div className="rounded-lg bg-violet-100 p-2">
            <RotateCcw className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Rotations</p>
            <p className="text-lg font-semibold">{isLoading ? '...' : rotations.length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 px-4 py-3">
          <div className="rounded-lg bg-emerald-100 p-2">
            <RotateCcw className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-lg font-semibold">{isLoading ? '...' : activeCount}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 px-4 py-3">
          <div className="rounded-lg bg-gray-100 p-2">
            <RotateCcw className="h-4 w-4 text-gray-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Inactive</p>
            <p className="text-lg font-semibold">{isLoading ? '...' : inactiveCount}</p>
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search rotations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-auto min-w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefetching}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          {canManage && (
            <Button size="sm" onClick={openCreate} className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Rotation</span>
              <span className="sm:hidden">New</span>
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white shadow-sm">
        <ScrollArea className="max-h-[65vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="hidden sm:table-cell">Shifts</TableHead>
                <TableHead>Run Duration</TableHead>
                <TableHead>Break Duration</TableHead>
                <TableHead className="hidden md:table-cell">Active Shift</TableHead>
                <TableHead className="hidden lg:table-cell">Next Change</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={`skel-${i}`}>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-8 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))}

              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="rounded-full bg-muted p-4 mb-4">
                        <RotateCcw className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {search ? 'No matching rotations' : 'No rotations configured'}
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        {search
                          ? 'Try adjusting your search query or clear the filter.'
                          : 'Get started by creating your first shift rotation.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                paginatedRotations.map((rotation) => (
                  <TableRow key={rotation.id}>
                    <TableCell className="font-medium">{rotation.title}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className="text-xs font-mono">
                        {rotation.rotationShifts?.length ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell>{rotation.runDuration} {rotation.runUnit}</TableCell>
                    <TableCell>{rotation.breakDuration} {rotation.breakUnit}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {rotation.currentActiveShiftName || '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {rotation.nextChangeDate
                        ? format(new Date(rotation.nextChangeDate), 'dd MMM yyyy')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusBadgeClasses(rotation.isActive ? 'Active' : 'Inactive')}>
                        {rotation.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => openEdit(rotation)}
                            title="Edit rotation"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        )}
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget(rotation)}
                            title="Delete rotation"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Pagination */}
        <div className="border-t px-4 py-3">
          <Pagination
            page={page}
            pageSize={pageSize}
            totalItems={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Dialogs */}
      <RotationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        shifts={shifts}
      />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Delete Shift Rotation"
        description="This action cannot be undone. This will permanently delete the shift rotation."
        itemName={deleteTarget?.title ?? ''}
        queryKey={['shiftRotations']}
        deleteFn={() => deleteShiftRotation(deleteTarget!.id)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rotation Form Dialog
// ---------------------------------------------------------------------------

interface RotationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ShiftRotationDto | null;
  shifts: WorkShiftDto[];
}

function RotationFormDialog({ open, onOpenChange, editing, shifts }: RotationFormDialogProps) {
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<RotationFormValues>({
    defaultValues: {
      title: '',
      runDuration: 7,
      runUnit: 'Days',
      breakDuration: 2,
      breakUnit: 'Days',
      rotationShifts: [],
    },
  });

  const rotationShifts = watch('rotationShifts');

  useEffect(() => {
    if (editing) {
      reset({
        title: editing.title,
        runDuration: editing.runDuration,
        runUnit: editing.runUnit,
        breakDuration: editing.breakDuration,
        breakUnit: editing.breakUnit,
        rotationShifts: editing.rotationShifts.map((rs) => ({
          workShiftId: rs.workShiftId,
          sequenceOrder: rs.sequenceOrder,
        })),
      });
    } else {
      reset({
        title: '',
        runDuration: 7,
        runUnit: 'Days',
        breakDuration: 2,
        breakUnit: 'Days',
        rotationShifts: [],
      });
    }
  }, [editing, reset]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateShiftRotationRequest) => createShiftRotation(payload),
    onSuccess: () => {
      toast.success('Rotation created successfully');
      queryClient.invalidateQueries({ queryKey: ['shiftRotations'] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error('Failed to create rotation', { description: err.message }),
  });

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; payload: UpdateShiftRotationRequest }) =>
      updateShiftRotation(input.id, input.payload),
    onSuccess: () => {
      toast.success('Rotation updated successfully');
      queryClient.invalidateQueries({ queryKey: ['shiftRotations'] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error('Failed to update rotation', { description: err.message }),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: RotationFormValues) => {
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        payload: {
          title: values.title,
          runDuration: values.runDuration,
          runUnit: values.runUnit,
          breakDuration: values.breakDuration,
          breakUnit: values.breakUnit,
        },
      });
    } else {
      createMutation.mutate({
        title: values.title,
        runDuration: values.runDuration,
        runUnit: values.runUnit,
        breakDuration: values.breakDuration,
        breakUnit: values.breakUnit,
        rotationShifts: values.rotationShifts,
      });
    }
  };

  const addRotationShift = () => {
    const next = [...(rotationShifts || []), { workShiftId: '', sequenceOrder: (rotationShifts?.length ?? 0) + 1 }];
    setValue('rotationShifts', next);
  };

  const removeRotationShift = (idx: number) => {
    const next = (rotationShifts || []).filter((_, i) => i !== idx).map((rs, i) => ({ ...rs, sequenceOrder: i + 1 }));
    setValue('rotationShifts', next);
  };

  const updateRotationShiftId = (idx: number, shiftId: string) => {
    const next = [...(rotationShifts || [])];
    next[idx] = { ...next[idx], workShiftId: shiftId };
    setValue('rotationShifts', next);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onOpenChange(false); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Shift Rotation' : 'Create Shift Rotation'}</DialogTitle>
          <DialogDescription>
            Define how shifts rotate with run and break durations.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rotation-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="rotation-title"
              placeholder="Weekly Rotation A"
              {...register('title', { required: 'Title is required' })}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Run Duration</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  className="flex-1"
                  {...register('runDuration', { valueAsNumber: true, required: true, min: 1 })}
                />
                <Select
                  value={watch('runUnit')}
                  onValueChange={(v) => setValue('runUnit', v)}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Break Duration</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  className="flex-1"
                  {...register('breakDuration', { valueAsNumber: true, required: true, min: 0 })}
                />
                <Select
                  value={watch('breakUnit')}
                  onValueChange={(v) => setValue('breakUnit', v)}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Rotation Shifts (only for create) */}
          {!editing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Rotation Shifts</Label>
                <Button type="button" variant="outline" size="sm" onClick={addRotationShift} className="gap-1">
                  <Plus className="h-3 w-3" />
                  Add Shift
                </Button>
              </div>
              {(rotationShifts ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No shifts added yet. Add shifts to define the rotation sequence.
                </p>
              )}
              <div className="space-y-2">
                {(rotationShifts ?? []).map((rs, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-6 shrink-0">#{rs.sequenceOrder}</span>
                    <Select
                      value={rs.workShiftId}
                      onValueChange={(v) => updateRotationShiftId(idx, v)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a shift..." />
                      </SelectTrigger>
                      <SelectContent>
                        {shifts.filter((s) => s.isActive).map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => removeRotationShift(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Rotation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ===========================================================================
// TAB 3: User Shift Assignments
// ===========================================================================

function UserAssignmentsTab() {
  const canManage = useHasPermission('user.manage_shifts');
  const queryClient = useQueryClient();

  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<UserShiftDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserShiftDto | null>(null);

  // Search users
  const { data: usersPage, isLoading: loadingUsers } = useQuery({
    queryKey: ['users', 'shiftSearch', userSearch],
    queryFn: () => fetchUsers({ search: userSearch || undefined, pageSize: 20 }),
    enabled: true,
  });

  const users = usersPage?.items ?? [];

  // Fetch assignments for selected user
  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['userShifts', selectedUser?.id],
    queryFn: () => fetchUserShifts(selectedUser!.id, false),
    enabled: !!selectedUser,
  });

  // Fetch shifts and rotations for the assign dialog selects
  const { data: shifts = [] } = useQuery({
    queryKey: ['workShifts'],
    queryFn: () => fetchWorkShifts(true),
  });

  const { data: rotations = [] } = useQuery({
    queryKey: ['shiftRotations'],
    queryFn: () => fetchShiftRotations(true),
  });

  const openAssign = () => {
    setEditingAssignment(null);
    setAssignOpen(true);
  };

  const openEditAssignment = (a: UserShiftDto) => {
    setEditingAssignment(a);
    setAssignOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* User search bar */}
      <Card className="p-4">
        <div className="space-y-3">
          <Label className="text-sm font-medium">Select User</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name or email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* User results */}
          {loadingUsers && userSearch && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching users...
            </div>
          )}
          {!loadingUsers && users.length > 0 && (
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-1">
                {users.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                      selectedUser?.id === user.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="font-medium">{user.fullName || user.email}</div>
                    {user.fullName && (
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
          {!loadingUsers && userSearch && users.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">No users found.</p>
          )}
        </div>
      </Card>

      {/* Selected user's assignments */}
      {selectedUser && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Assignments for {selectedUser.fullName || selectedUser.email}
              </h3>
              <p className="text-xs text-muted-foreground">
                {assignments.length} assignment{assignments.length !== 1 ? 's' : ''} found
              </p>
            </div>
            {canManage && (
              <Button size="sm" onClick={openAssign} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Assign Shift
              </Button>
            )}
          </div>

          <div className="rounded-xl border bg-white shadow-sm">
            <ScrollArea className="max-h-[50vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shift / Rotation</TableHead>
                    <TableHead>Starts On</TableHead>
                    <TableHead>Ends On</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingAssignments &&
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={`skel-${i}`}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                      </TableRow>
                    ))}

                  {!loadingAssignments && assignments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <div className="rounded-full bg-muted p-4 mb-4">
                            <Calendar className="h-10 w-10 text-muted-foreground" />
                          </div>
                          <h3 className="text-lg font-semibold text-foreground mb-1">
                            No shift assignments
                          </h3>
                          <p className="text-sm text-muted-foreground max-w-sm">
                            This user has no shift assignments yet. Assign a shift or rotation to get started.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {!loadingAssignments &&
                    assignments.map((a) => {
                      const status = getUserShiftStatus(a);
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">
                            {a.workShiftName || a.shiftRotationTitle || '—'}
                            {a.shiftRotationTitle && (
                              <Badge variant="outline" className="ml-2 text-[10px]">Rotation</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(a.startsOn), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {a.endsOn ? format(new Date(a.endsOn), 'dd MMM yyyy') : 'Ongoing'}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusBadgeClasses(status)}>
                              {status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              {canManage && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                                  onClick={() => openEditAssignment(a)}
                                  title="Edit assignment"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                              )}
                              {canManage && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => setDeleteTarget(a)}
                                  title="Delete assignment"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Show placeholder if no user selected */}
      {!selectedUser && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Users className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Select a user
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Search for a user above to view and manage their shift assignments.
          </p>
        </div>
      )}

      {/* Dialogs */}
      {selectedUser && (
        <>
          <AssignmentFormDialog
            open={assignOpen}
            onOpenChange={setAssignOpen}
            editing={editingAssignment}
            userId={selectedUser.id}
            shifts={shifts}
            rotations={rotations}
          />
          <DeleteConfirmDialog
            open={!!deleteTarget}
            onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
            title="Delete Shift Assignment"
            description="This action cannot be undone. This will permanently remove this shift assignment from the user."
            itemName={deleteTarget?.workShiftName || deleteTarget?.shiftRotationTitle || 'this assignment'}
            queryKey={['userShifts', selectedUser.id]}
            deleteFn={() => deleteUserShift(deleteTarget!.id)}
          />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Assignment Form Dialog
// ---------------------------------------------------------------------------

interface AssignmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: UserShiftDto | null;
  userId: string;
  shifts: WorkShiftDto[];
  rotations: ShiftRotationDto[];
}

interface AssignmentFormValues {
  workShiftId: string;
  shiftRotationId: string;
  startsOn: string;
  endsOn: string;
}

function AssignmentFormDialog({ open, onOpenChange, editing, userId, shifts, rotations }: AssignmentFormDialogProps) {
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<AssignmentFormValues>({
    defaultValues: {
      workShiftId: '',
      shiftRotationId: '',
      startsOn: '',
      endsOn: '',
    },
  });

  const workShiftId = watch('workShiftId');
  const shiftRotationId = watch('shiftRotationId');

  useEffect(() => {
    if (editing) {
      reset({
        workShiftId: editing.workShiftId ?? '',
        shiftRotationId: editing.shiftRotationId ?? '',
        startsOn: editing.startsOn ? editing.startsOn.slice(0, 10) : '',
        endsOn: editing.endsOn ? editing.endsOn.slice(0, 10) : '',
      });
    } else {
      reset({
        workShiftId: '',
        shiftRotationId: '',
        startsOn: '',
        endsOn: '',
      });
    }
  }, [editing, reset]);

  const assignMutation = useMutation({
    mutationFn: (payload: CreateUserShiftRequest) => assignUserShift(payload),
    onSuccess: () => {
      toast.success('Shift assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['userShifts', userId] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error('Failed to assign shift', { description: err.message }),
  });

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; payload: UpdateUserShiftRequest }) =>
      updateUserShift(input.id, input.payload),
    onSuccess: () => {
      toast.success('Assignment updated successfully');
      queryClient.invalidateQueries({ queryKey: ['userShifts', userId] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error('Failed to update assignment', { description: err.message }),
  });

  const isPending = assignMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: AssignmentFormValues) => {
    const payload = {
      workShiftId: values.workShiftId || undefined,
      shiftRotationId: values.shiftRotationId || undefined,
      startsOn: values.startsOn,
      endsOn: values.endsOn || undefined,
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      assignMutation.mutate({ userId, ...payload });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onOpenChange(false); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Assignment' : 'Assign Shift'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Update this shift assignment.'
              : 'Assign a work shift or rotation to this user.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Work Shift</Label>
            <Select
              value={workShiftId}
              onValueChange={(v) => {
                setValue('workShiftId', v);
                if (v) setValue('shiftRotationId', '');
              }}
              disabled={!!shiftRotationId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a work shift..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">None</SelectItem>
                {shifts.filter((s) => s.isActive).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 border-t" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="flex-1 border-t" />
          </div>

          <div className="space-y-2">
            <Label>Shift Rotation</Label>
            <Select
              value={shiftRotationId}
              onValueChange={(v) => {
                setValue('shiftRotationId', v);
                if (v) setValue('workShiftId', '');
              }}
              disabled={!!workShiftId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a rotation..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">None</SelectItem>
                {rotations.filter((r) => r.isActive).map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!workShiftId && !shiftRotationId && (
            <p className="text-xs text-muted-foreground">
              Select either a work shift or a rotation to assign.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="assign-starts">
                Starts On <span className="text-destructive">*</span>
              </Label>
              <Input
                id="assign-starts"
                type="date"
                {...register('startsOn', { required: 'Start date is required' })}
              />
              {errors.startsOn && (
                <p className="text-xs text-destructive">{errors.startsOn.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="assign-ends">Ends On</Label>
              <Input
                id="assign-ends"
                type="date"
                {...register('endsOn')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || (!workShiftId && !shiftRotationId)}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Assign'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ===========================================================================
// Shared: Delete Confirmation Dialog
// ===========================================================================

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  itemName: string;
  queryKey: string[];
  deleteFn: () => Promise<void>;
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  itemName,
  queryKey,
  deleteFn,
}: DeleteConfirmDialogProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: deleteFn,
    onSuccess: () => {
      toast.success('Deleted successfully');
      queryClient.invalidateQueries({ queryKey });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error('Failed to delete', { description: err.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-foreground">
            You are about to delete:
          </p>
          <p className="mt-1 text-sm font-semibold">{itemName}</p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
