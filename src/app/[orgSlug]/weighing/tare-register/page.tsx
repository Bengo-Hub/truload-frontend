'use client';

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination, usePagination } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import {
  useRecordTareWeight,
  useVehiclesPaged,
  useVehicleTareHistory,
} from '@/hooks/queries';
import type { Vehicle } from '@/types/weighing';
import { AlertTriangle, CheckCircle2, Clock, History, Plus, Search, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useDebounce } from 'use-debounce';

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
  const recordTare = useRecordTareWeight();

  useEffect(() => {
    if (open) {
      setTareKg(vehicle?.lastTareWeightKg?.toString() ?? '');
      setSource('measured');
      setNotes('');
      setSetAsDefault(true);
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
        onSuccess: () => {
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
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Tare Weight (kg)</Label>
            <Input
              type="number"
              min={1}
              placeholder="e.g. 8500"
              value={tareKg}
              onChange={(e) => setTareKg(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Source</Label>
            <Select value={source} onValueChange={(v) => setSource(v as 'measured' | 'manual')}>
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
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="set-default"
              type="checkbox"
              checked={setAsDefault}
              onChange={(e) => setSetAsDefault(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="set-default" className="cursor-pointer font-normal">
              Set as vehicle&apos;s stored tare (used in weighing)
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={recordTare.isPending}>
            {recordTare.isPending ? 'Saving…' : 'Record Tare'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tare History Sheet ───────────────────────────────────────────────────────

interface TareHistorySheetProps {
  vehicle: Vehicle | null;
  open: boolean;
  onClose: () => void;
}

function TareHistorySheet({ vehicle, open, onClose }: TareHistorySheetProps) {
  const { data: history, isLoading } = useVehicleTareHistory(vehicle?.id);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[420px] sm:w-[520px]">
        <SheetHeader>
          <SheetTitle>Tare History — {vehicle?.regNo}</SheetTitle>
          <SheetDescription>All recorded tare weights for this vehicle.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          {isLoading && Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
          {!isLoading && (!history || history.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-8">No tare records found.</p>
          )}
          {!isLoading && history?.map((entry) => (
            <div key={entry.id} className="rounded-lg border p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-base">{entry.tareWeightKg.toLocaleString()} kg</span>
                <Badge variant={entry.source === 'measured' ? 'default' : 'secondary'}>
                  {entry.source === 'measured' ? 'Scale' : 'Manual'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{formatDateTime(entry.weighedAt)}</p>
              {entry.stationName && (
                <p className="text-xs text-muted-foreground">Station: {entry.stationName}</p>
              )}
              {entry.notes && <p className="text-xs text-gray-600 italic">{entry.notes}</p>}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TareRegisterPage() {
  const router = useRouter();
  const { isCommercial } = useModuleAccess();
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 300);
  const { page, pageSize, setPage } = usePagination({ defaultPageSize: 20 });

  const { data, isLoading } = useVehiclesPaged({
    search: debouncedSearch || undefined,
    page,
    pageSize,
  });

  const [recordTarget, setRecordTarget] = useState<Vehicle | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Vehicle | null>(null);

  useEffect(() => {
    if (!isCommercial) router.replace('./');
  }, [isCommercial, router]);

  if (!isCommercial) return null;

  const vehicles = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;

  return (
    <AppShell title="Tare Register" subtitle="Manage stored tare weights for commercial weighing">
      <ProtectedRoute requiredPermissions={['weighing.read']}>
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
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search by reg, transporter…"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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
                    currentPage={page}
                    totalPages={Math.ceil(totalCount / pageSize)}
                    onPageChange={setPage}
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
        <TareHistorySheet
          vehicle={historyTarget}
          open={!!historyTarget}
          onClose={() => setHistoryTarget(null)}
        />
      </ProtectedRoute>
    </AppShell>
  );
}
