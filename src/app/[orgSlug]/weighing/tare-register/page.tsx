'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { StationSelectFilter } from '@/components/filters/StationSelectFilter';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { Pagination, usePagination } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  useApproveTareAnomaly,
  useFlaggedTareAnomalies,
  useOverrideTareAnomaly,
  useRecordTareWeight,
  useRejectTareAnomaly,
  useVehiclesPaged,
  useVehicleTareHistory,
} from '@/hooks/queries';
import { useAuth, useHasPermission } from '@/hooks/useAuth';
import { hardDeleteTare } from '@/lib/api/weighing';
import type { Vehicle, VehicleTareHistory } from '@/types/weighing';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  History,
  Loader2,
  PencilLine,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Truck,
  X,
  XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function getTareStatus(vehicle: Vehicle): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  if (!vehicle.lastTareWeighedAt) return { label: 'No Tare', variant: 'outline' };
  if (!vehicle.tareExpiryDays) return { label: 'Active', variant: 'default' };
  const weighedAt = new Date(vehicle.lastTareWeighedAt);
  const expiresAt = new Date(weighedAt.getTime() + vehicle.tareExpiryDays * 86_400_000);
  const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000);
  if (daysLeft <= 0) return { label: 'Expired', variant: 'destructive' };
  if (daysLeft <= 7) return { label: `Expires in ${daysLeft}d`, variant: 'secondary' };
  return { label: 'Active', variant: 'default' };
}

// ─── Record Tare Dialog ───────────────────────────────────────────────────────

interface RecordTareDialogProps {
  vehicle: Vehicle | null;
  open: boolean;
  onClose: () => void;
}

function RecordTareDialog({ vehicle, open, onClose }: RecordTareDialogProps) {
  const [tareKg, setTareKg] = useState('');
  const [source, setSource] = useState<'measured' | 'manual'>('measured');
  const [notes, setNotes] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(true);
  const [flaggedResult, setFlaggedResult] = useState<VehicleTareHistory | null>(null);
  const recordTare = useRecordTareWeight();

  useEffect(() => {
    if (open) {
      setTareKg(vehicle?.lastTareWeightKg?.toString() ?? '');
      setSource('measured');
      setNotes('');
      setSetAsDefault(true);
      setFlaggedResult(null);
    }
  }, [open, vehicle]);

  const handleSubmit = () => {
    if (!vehicle || !tareKg) return;
    const kg = parseInt(tareKg, 10);
    if (isNaN(kg) || kg <= 0) {
      toast.error('Enter a valid tare weight in kg');
      return;
    }
    recordTare.mutate(
      { vehicleId: vehicle.id, tareWeightKg: kg, source, notes: notes || undefined, setAsDefault },
      {
        onSuccess: (saved) => {
          if (saved?.tareAnomalyFlaggedAt) {
            // Flagged as an anomaly — keep the dialog open so the operator sees why, but the
            // record has already saved and the flow is not blocked.
            setFlaggedResult(saved);
            toast.warning(`Tare recorded for ${vehicle.regNo}, but flagged for supervisor review.`);
            return;
          }
          toast.success(`Tare recorded for ${vehicle.regNo}`);
          onClose();
        },
        onError: () => toast.error('Failed to record tare weight'),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Tare Weight</DialogTitle>
          <DialogDescription>
            {vehicle ? `Vehicle: ${vehicle.regNo}` : ''}
          </DialogDescription>
        </DialogHeader>
        {flaggedResult && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="text-sm">
              <span className="font-semibold">Tare anomaly flagged.</span>{' '}
              {flaggedResult.tareAnomalyReason || 'This tare drifted significantly from the vehicle’s previously stored tare.'}{' '}
              The record has been saved and is pending supervisor review (see Pending Review below).
            </p>
          </div>
        )}
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Tare Weight (kg)</Label>
            <Input
              type="number"
              min={1}
              placeholder="e.g. 8500"
              value={tareKg}
              onChange={(e) => setTareKg(e.target.value)}
              disabled={!!flaggedResult}
            />
          </div>
          <div className="space-y-1">
            <Label>Source</Label>
            <Select value={source} onValueChange={(v) => setSource(v as 'measured' | 'manual')} disabled={!!flaggedResult}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="measured">Measured on scale</SelectItem>
                <SelectItem value="manual">Manual entry</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="e.g. Post-service weigh, confirmed empty"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!!flaggedResult}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="set-default"
              type="checkbox"
              checked={setAsDefault}
              onChange={(e) => setSetAsDefault(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
              disabled={!!flaggedResult}
            />
            <Label htmlFor="set-default" className="cursor-pointer font-normal">
              Set as vehicle&apos;s stored tare (used in weighing)
            </Label>
          </div>
        </div>
        <DialogFooter>
          {flaggedResult ? (
            <Button onClick={onClose}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={recordTare.isPending}>
                {recordTare.isPending ? 'Saving…' : 'Record Tare'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tare History Dialog ──────────────────────────────────────────────────────

interface TareHistoryDialogProps {
  vehicle: Vehicle | null;
  open: boolean;
  onClose: () => void;
}

function TareHistoryDialog({ vehicle, open, onClose }: TareHistoryDialogProps) {
  const { data: history, isLoading } = useVehicleTareHistory(vehicle?.id);
  const { user } = useAuth();
  const isPlatformOwner = user?.isSuperUser === true;
  const queryClient = useQueryClient();
  const [confirmDeleteEntry, setConfirmDeleteEntry] = useState<VehicleTareHistory | null>(null);

  const hardDeleteMutation = useMutation({
    mutationFn: (id: string) => hardDeleteTare(id),
    onSuccess: () => {
      toast.success('Tare record permanently deleted');
      setConfirmDeleteEntry(null);
      queryClient.invalidateQueries({ queryKey: ['vehicleTareHistory', vehicle?.id] });
    },
    onError: () => toast.error('Failed to delete tare record'),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tare History — {vehicle?.regNo}</DialogTitle>
          <DialogDescription>All recorded tare weights for this vehicle.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {isLoading && Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
          {!isLoading && (!history || history.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-8">No tare records found.</p>
          )}
          {!isLoading && history?.map((entry) => (
            <div key={entry.id} className="rounded-lg border p-3 space-y-1">
              {confirmDeleteEntry?.id === entry.id ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive">Permanently delete this tare record?</p>
                  <p className="text-xs text-muted-foreground">This cannot be undone.</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => hardDeleteMutation.mutate(entry.id)}
                      disabled={hardDeleteMutation.isPending}
                    >
                      {hardDeleteMutation.isPending ? 'Deleting...' : 'Delete'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setConfirmDeleteEntry(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-base">{entry.tareWeightKg.toLocaleString()} kg</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={entry.source === 'measured' ? 'default' : 'secondary'}>
                        {entry.source === 'measured' ? 'Scale' : 'Manual'}
                      </Badge>
                      {isPlatformOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Permanently delete"
                          onClick={() => setConfirmDeleteEntry(entry)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDateTime(entry.weighedAt)}</p>
                  {entry.stationName && (
                    <p className="text-xs text-muted-foreground">Station: {entry.stationName}</p>
                  )}
                  {entry.recordedByName && (
                    <p className="text-xs text-muted-foreground">Recorded by: {entry.recordedByName}</p>
                  )}
                  {entry.notes && <p className="text-xs text-gray-600 italic">{entry.notes}</p>}
                </>
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Pending Review (Flagged Tare Anomalies) ──────────────────────────────────

interface OverrideAnomalyDialogProps {
  entry: VehicleTareHistory | null;
  open: boolean;
  onClose: () => void;
}

function OverrideAnomalyDialog({ entry, open, onClose }: OverrideAnomalyDialogProps) {
  const [correctedTareKg, setCorrectedTareKg] = useState('');
  const [justification, setJustification] = useState('');
  const overrideMutation = useOverrideTareAnomaly();

  useEffect(() => {
    if (open) {
      setCorrectedTareKg(entry?.tareWeightKg?.toString() ?? '');
      setJustification('');
    }
  }, [open, entry]);

  const handleSubmit = () => {
    if (!entry) return;
    const kg = parseInt(correctedTareKg, 10);
    if (isNaN(kg) || kg <= 0) {
      toast.error('Enter a valid corrected tare weight in kg');
      return;
    }
    if (!justification.trim()) {
      toast.error('Justification is required to override a flagged tare');
      return;
    }
    overrideMutation.mutate(
      { id: entry.id, payload: { correctedTareWeightKg: kg, justification: justification.trim() } },
      {
        onSuccess: () => {
          toast.success(`Tare override recorded for ${entry.vehicleRegNo ?? 'vehicle'}`);
          onClose();
        },
        onError: () => toast.error('Failed to override tare anomaly'),
      }
    );
  };

  const isValid = !!correctedTareKg.trim() && !!justification.trim();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Override Flagged Tare</DialogTitle>
          <DialogDescription>
            {entry?.vehicleRegNo ? `Vehicle: ${entry.vehicleRegNo}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Corrected Tare Weight (kg) <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              min={1}
              placeholder="e.g. 8500"
              value={correctedTareKg}
              onChange={(e) => setCorrectedTareKg(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Justification <span className="text-red-500">*</span></Label>
            <Textarea
              placeholder="Explain why this corrected tare weight is being applied..."
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={overrideMutation.isPending || !isValid}>
            {overrideMutation.isPending ? 'Saving…' : 'Confirm Override'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PendingReviewSection() {
  const { data: flagged, isLoading } = useFlaggedTareAnomalies();
  const canReview = useHasPermission('weighing.override');
  const approveMutation = useApproveTareAnomaly();
  const rejectMutation = useRejectTareAnomaly();
  const [overrideTarget, setOverrideTarget] = useState<VehicleTareHistory | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const items = flagged ?? [];
  if (!isLoading && items.length === 0) return null;

  const handleApprove = (entry: VehicleTareHistory) => {
    setActingId(entry.id);
    approveMutation.mutate(entry.id, {
      onSuccess: () => toast.success(`Tare approved for ${entry.vehicleRegNo ?? 'vehicle'}`),
      onError: () => toast.error('Failed to approve tare anomaly'),
      onSettled: () => setActingId(null),
    });
  };

  const handleReject = (entry: VehicleTareHistory) => {
    setActingId(entry.id);
    rejectMutation.mutate(entry.id, {
      onSuccess: () => toast.success(`Tare rejected — ${entry.vehicleRegNo ?? 'vehicle'} needs re-capture`),
      onError: () => toast.error('Failed to reject tare anomaly'),
      onSettled: () => setActingId(null),
    });
  };

  return (
    <>
      <Card className="border-amber-300 bg-amber-50/40">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <h2 className="text-base font-semibold text-gray-900">Pending Review — Flagged Tare Anomalies</h2>
              <p className="text-xs text-muted-foreground">
                Newly-measured tares that drifted too far from the vehicle&apos;s previously stored tare.
              </p>
            </div>
            {!isLoading && <Badge variant="secondary" className="ml-auto">{items.length}</Badge>}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle Reg</TableHead>
                <TableHead>Reason / Drift</TableHead>
                <TableHead>Flagged</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 2 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
              {!isLoading && items.map((entry) => {
                const isActing = actingId === entry.id && (approveMutation.isPending || rejectMutation.isPending);
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono font-semibold">{entry.vehicleRegNo ?? '—'}</TableCell>
                    <TableCell className="text-sm text-amber-800">
                      {entry.tareAnomalyReason || `New tare ${entry.tareWeightKg.toLocaleString()} kg flagged`}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(entry.tareAnomalyFlaggedAt)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {canReview ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" onClick={() => handleApprove(entry)} disabled={isActing}>
                            {isActing && approveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5 mr-1" />}
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleReject(entry)} disabled={isActing}>
                            {isActing && rejectMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
                            Reject
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setOverrideTarget(entry)} disabled={isActing}>
                            <PencilLine className="h-3.5 w-3.5 mr-1" />
                            Override
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Awaiting supervisor review</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <OverrideAnomalyDialog
        entry={overrideTarget}
        open={!!overrideTarget}
        onClose={() => setOverrideTarget(null)}
      />
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TareRegisterPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stationId, setStationId] = useState<string | undefined>(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { pageNumber, pageSize, setPage } = usePagination(20);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const { data, isLoading } = useVehiclesPaged({
    search: debouncedSearch || undefined,
    page: pageNumber,
    pageSize,
    scopeToOrg: true,
  });

  const [recordTarget, setRecordTarget] = useState<Vehicle | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Vehicle | null>(null);

  const vehicles = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;

  return (
    <AppShell title="Tare Register" subtitle="Manage stored tare weights for commercial weighing">
      <ProtectedRoute requiredPermissions={['weighing.read']} moduleKey="tare_register">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tare Register</h1>
              <p className="text-sm text-muted-foreground">
                View and manage stored tare weights. Stored tares are used for single-pass commercial weighing.
              </p>
            </div>
          </div>

          {/* Pending Review — flagged tare anomalies awaiting supervisor action */}
          <PendingReviewSection />

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                label: 'Total Vehicles',
                value: totalCount,
                icon: Truck,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
              },
              {
                label: 'Active Tares',
                value: vehicles.filter((v) => getTareStatus(v).label === 'Active').length,
                icon: CheckCircle2,
                color: 'text-green-600',
                bg: 'bg-green-50',
              },
              {
                label: 'Expired / No Tare',
                value: vehicles.filter((v) => ['Expired', 'No Tare'].includes(getTareStatus(v).label)).length,
                icon: AlertTriangle,
                color: 'text-amber-600',
                bg: 'bg-amber-50',
              },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-2 ${stat.bg}`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Table Card */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search by reg, transporter…"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  />
                </div>
                <div className="min-w-[200px]">
                  <StationSelectFilter
                    value={stationId}
                    onValueChange={(v) => { setStationId(v === 'all' ? undefined : v); setPage(1); }}
                    placeholder="All Stations"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reg No</TableHead>
                    <TableHead>Transporter</TableHead>
                    <TableHead>Vehicle Type</TableHead>
                    <TableHead className="text-right">Stored Tare (kg)</TableHead>
                    <TableHead className="text-right">Default Tare (kg)</TableHead>
                    <TableHead>Last Weighed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {!isLoading && vehicles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                        No vehicles found.
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && vehicles.map((vehicle) => {
                    const status = getTareStatus(vehicle);
                    return (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-mono font-semibold">{vehicle.regNo}</TableCell>
                        <TableCell className="text-sm">{vehicle.transporter?.name ?? '—'}</TableCell>
                        <TableCell className="text-sm">{vehicle.vehicleType ?? '—'}</TableCell>
                        <TableCell className="text-right font-medium">
                          {vehicle.lastTareWeightKg != null
                            ? vehicle.lastTareWeightKg.toLocaleString()
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {vehicle.defaultTareWeightKg != null
                            ? vehicle.defaultTareWeightKg.toLocaleString()
                            : '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDate(vehicle.lastTareWeighedAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setHistoryTarget(vehicle)}
                            >
                              <History className="h-3.5 w-3.5 mr-1" />
                              History
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => setRecordTarget(vehicle)}
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              Record
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {totalCount > pageSize && (
                <div className="border-t px-4 py-3">
                  <Pagination
                    page={pageNumber}
                    pageSize={pageSize}
                    totalItems={totalCount}
                    onPageChange={setPage}
                    showPageSizeSelector={false}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <RecordTareDialog
          vehicle={recordTarget}
          open={!!recordTarget}
          onClose={() => setRecordTarget(null)}
        />
        <TareHistoryDialog
          vehicle={historyTarget}
          open={!!historyTarget}
          onClose={() => setHistoryTarget(null)}
        />
      </ProtectedRoute>
    </AppShell>
  );
}
