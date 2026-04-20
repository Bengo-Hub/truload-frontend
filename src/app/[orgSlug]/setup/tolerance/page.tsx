'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  useCargoTypes,
  useCreateToleranceSetting,
  useToleranceSettings,
  useUpdateToleranceSetting,
} from '@/hooks/queries';
import type { CommercialToleranceSetting } from '@/lib/api/weighing';
import { Info, Pencil, Plus, Sliders } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// ─── Tolerance Form Dialog ────────────────────────────────────────────────────

interface ToleranceFormDialogProps {
  existing: CommercialToleranceSetting | null;
  open: boolean;
  onClose: () => void;
}

const emptyForm = (): Omit<CommercialToleranceSetting, 'id'> => ({
  toleranceType: 'percentage',
  toleranceValue: 0,
  maxToleranceKg: undefined,
  cargoTypeId: undefined,
  cargoTypeName: undefined,
  description: '',
});

function ToleranceFormDialog({ existing, open, onClose }: ToleranceFormDialogProps) {
  const [form, setForm] = useState(emptyForm());
  const { data: cargoTypes = [] } = useCargoTypes();
  const create = useCreateToleranceSetting();
  const update = useUpdateToleranceSetting();

  const isEdit = !!existing?.id;

  useEffect(() => {
    if (open) {
      setForm(
        existing
          ? {
              toleranceType: existing.toleranceType,
              toleranceValue: existing.toleranceValue,
              maxToleranceKg: existing.maxToleranceKg,
              cargoTypeId: existing.cargoTypeId,
              cargoTypeName: existing.cargoTypeName,
              description: existing.description ?? '',
            }
          : emptyForm()
      );
    }
  }, [open, existing]);

  const isPending = create.isPending || update.isPending;

  const handleSubmit = () => {
    if (form.toleranceValue <= 0) {
      toast.error('Tolerance value must be greater than 0');
      return;
    }
    if (form.toleranceType === 'percentage' && form.toleranceValue > 100) {
      toast.error('Percentage tolerance cannot exceed 100%');
      return;
    }

    const payload: CommercialToleranceSetting = { ...form };

    if (isEdit) {
      update.mutate(
        { id: existing!.id!, payload },
        {
          onSuccess: () => { toast.success('Tolerance setting updated'); onClose(); },
          onError: () => toast.error('Failed to update tolerance setting'),
        }
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => { toast.success('Tolerance setting created'); onClose(); },
        onError: () => toast.error('Failed to create tolerance setting'),
      });
    }
  };

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Tolerance Setting' : 'New Tolerance Setting'}</DialogTitle>
          <DialogDescription>
            Define how much weight discrepancy is acceptable before a flag is raised.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tolerance type */}
          <div className="space-y-1">
            <Label>Tolerance Type</Label>
            <Select
              value={form.toleranceType}
              onValueChange={(v) => set('toleranceType', v as 'percentage' | 'absolute')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
                <SelectItem value="absolute">Absolute (kg)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tolerance value */}
          <div className="space-y-1">
            <Label>
              Tolerance Value{' '}
              <span className="text-muted-foreground font-normal">
                ({form.toleranceType === 'percentage' ? '%' : 'kg'})
              </span>
            </Label>
            <Input
              type="number"
              min={0}
              step={form.toleranceType === 'percentage' ? 0.1 : 1}
              placeholder={form.toleranceType === 'percentage' ? 'e.g. 0.5' : 'e.g. 200'}
              value={form.toleranceValue || ''}
              onChange={(e) => set('toleranceValue', parseFloat(e.target.value) || 0)}
            />
            {form.toleranceType === 'percentage' && (
              <p className="text-xs text-muted-foreground">
                e.g. 0.5 means ±0.5% of gross weight
              </p>
            )}
          </div>

          {/* Max cap (percentage only) */}
          {form.toleranceType === 'percentage' && (
            <div className="space-y-1">
              <Label>
                Max Cap (kg){' '}
                <span className="text-muted-foreground font-normal">optional</span>
              </Label>
              <Input
                type="number"
                min={1}
                placeholder="e.g. 500"
                value={form.maxToleranceKg ?? ''}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  set('maxToleranceKg', isNaN(v) ? undefined : v);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Caps the percentage tolerance at this absolute kg value
              </p>
            </div>
          )}

          {/* Cargo type scope */}
          <div className="space-y-1">
            <Label>
              Cargo Type{' '}
              <span className="text-muted-foreground font-normal">optional — leave blank for all cargo</span>
            </Label>
            <Select
              value={form.cargoTypeId ?? 'all'}
              onValueChange={(v) => {
                const ct = cargoTypes.find((c) => c.id === v);
                set('cargoTypeId', v === 'all' ? undefined : v);
                set('cargoTypeName', ct?.name);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All cargo types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cargo types</SelectItem>
                {cargoTypes.map((ct) => (
                  <SelectItem key={ct.id} value={ct.id}>
                    {ct.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label>Description <span className="text-muted-foreground font-normal">optional</span></Label>
            <Textarea
              rows={2}
              placeholder="e.g. Standard tolerance for cement cargo"
              value={form.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Saving…' : isEdit ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ToleranceSettingsPage() {
  const { data: settings = [], isLoading } = useToleranceSettings();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CommercialToleranceSetting | null>(null);

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (s: CommercialToleranceSetting) => { setEditing(s); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditing(null); };

  const formatValue = (s: CommercialToleranceSetting) =>
    s.toleranceType === 'percentage'
      ? `${s.toleranceValue}%${s.maxToleranceKg ? ` (max ${s.maxToleranceKg.toLocaleString()} kg)` : ''}`
      : `${s.toleranceValue.toLocaleString()} kg`;

  return (
    <AppShell title="Tolerance Settings" subtitle="Commercial weighing tolerance rules">
      <ProtectedRoute requiredPermissions={['config.read']} moduleKey="setup_tolerance">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tolerance Settings</h1>
              <p className="text-sm text-muted-foreground">
                Configure acceptable weight discrepancy thresholds for commercial weighing operations.
              </p>
            </div>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New Rule
            </Button>
          </div>

          {/* Info card */}
          <Card className="border-blue-100 bg-blue-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800 space-y-1">
                  <p className="font-medium">How tolerance rules work</p>
                  <p>
                    When the actual net weight differs from the expected net weight by more than the
                    configured threshold, the transaction is flagged. Cargo-type–specific rules take
                    precedence over the global rule. If no rule matches, no tolerance check is applied.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sliders className="h-5 w-5" />
                Tolerance Rules
              </CardTitle>
              <CardDescription>
                {settings.length} rule{settings.length !== 1 ? 's' : ''} configured
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Cargo Scope</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {!isLoading && settings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        No tolerance rules configured. Click &quot;New Rule&quot; to add one.
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && settings.map((s, idx) => (
                    <TableRow key={s.id ?? idx}>
                      <TableCell>
                        <Badge variant={s.toleranceType === 'percentage' ? 'default' : 'secondary'}>
                          {s.toleranceType === 'percentage' ? 'Percentage' : 'Absolute'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{formatValue(s)}</TableCell>
                      <TableCell className="text-sm">
                        {s.cargoTypeName ?? (
                          <span className="text-muted-foreground italic">All cargo</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {s.description || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(s)}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <ToleranceFormDialog
          existing={editing}
          open={dialogOpen}
          onClose={closeDialog}
        />
      </ProtectedRoute>
    </AppShell>
  );
}
