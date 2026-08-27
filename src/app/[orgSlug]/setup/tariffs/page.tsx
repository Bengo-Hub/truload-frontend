'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
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
import {
  useCreateTariffRule,
  useDeleteTariffRule,
  useTariffRules,
  useTransporters,
  useUpdateTariffRule,
} from '@/hooks/queries';
import type { CommercialTariffRule } from '@/lib/api/weighing';
import { Banknote, Info, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// ─── Tariff Rule Form Dialog ────────────────────────────────────────────────

interface TariffFormDialogProps {
  existing: CommercialTariffRule | null;
  open: boolean;
  onClose: () => void;
}

const emptyForm = (): CommercialTariffRule => ({
  transporterId: undefined,
  vehicleType: undefined,
  axleCountMin: undefined,
  axleCountMax: undefined,
  weightBracketMinKg: undefined,
  weightBracketMaxKg: undefined,
  feeKes: 0,
  label: '',
});

function TariffFormDialog({ existing, open, onClose }: TariffFormDialogProps) {
  const [form, setForm] = useState(emptyForm());
  const { data: transporters = [] } = useTransporters();
  const create = useCreateTariffRule();
  const update = useUpdateTariffRule();

  const isEdit = !!existing?.id;
  const isPending = create.isPending || update.isPending;

  useEffect(() => {
    if (open) {
      setForm(
        existing
          ? {
              transporterId: existing.transporterId,
              vehicleType: existing.vehicleType,
              axleCountMin: existing.axleCountMin,
              axleCountMax: existing.axleCountMax,
              weightBracketMinKg: existing.weightBracketMinKg,
              weightBracketMaxKg: existing.weightBracketMaxKg,
              feeKes: existing.feeKes,
              label: existing.label ?? '',
            }
          : emptyForm()
      );
    }
  }, [open, existing]);

  const set = <K extends keyof CommercialTariffRule>(k: K, v: CommercialTariffRule[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = () => {
    if (!form.feeKes || form.feeKes < 0) {
      toast.error('Fee must be zero or greater');
      return;
    }

    if (isEdit) {
      update.mutate(
        { id: existing!.id!, payload: form },
        {
          onSuccess: () => { toast.success('Tariff rule updated'); onClose(); },
          onError: () => toast.error('Failed to update tariff rule'),
        }
      );
    } else {
      create.mutate(form, {
        onSuccess: () => { toast.success('Tariff rule created'); onClose(); },
        onError: () => toast.error('Failed to create tariff rule'),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Tariff Rule' : 'New Tariff Rule'}</DialogTitle>
          <DialogDescription>
            Set a fee for a transporter contract, or a bracket by vehicle type / axle count / gross
            weight. Leave fields blank to match any value. The most specific matching rule wins; a
            transporter contract rule always takes priority over a bracket rule.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Label <span className="text-muted-foreground font-normal">optional</span></Label>
            <Input
              placeholder="e.g. Heavy trucks (5+ axles)"
              value={form.label ?? ''}
              onChange={(e) => set('label', e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Transporter Contract Rate <span className="text-muted-foreground font-normal">optional</span></Label>
            <Select
              value={form.transporterId ?? 'none'}
              onValueChange={(v) => set('transporterId', v === 'none' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Applies to all transporters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All transporters (bracket rule)</SelectItem>
                {transporters.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              When set, this rule applies only to that transporter and ignores the bracket fields below.
            </p>
          </div>

          {!form.transporterId && (
            <>
              <div className="space-y-1">
                <Label>Vehicle Type <span className="text-muted-foreground font-normal">optional</span></Label>
                <Input
                  placeholder="e.g. Truck, Trailer"
                  value={form.vehicleType ?? ''}
                  onChange={(e) => set('vehicleType', e.target.value || undefined)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Min Axle Count <span className="text-muted-foreground font-normal">optional</span></Label>
                  <Input
                    type="number" min={0}
                    value={form.axleCountMin ?? ''}
                    onChange={(e) => set('axleCountMin', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Max Axle Count <span className="text-muted-foreground font-normal">optional</span></Label>
                  <Input
                    type="number" min={0}
                    value={form.axleCountMax ?? ''}
                    onChange={(e) => set('axleCountMax', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Min Gross Weight (kg) <span className="text-muted-foreground font-normal">optional</span></Label>
                  <Input
                    type="number" min={0}
                    value={form.weightBracketMinKg ?? ''}
                    onChange={(e) => set('weightBracketMinKg', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Max Gross Weight (kg) <span className="text-muted-foreground font-normal">optional</span></Label>
                  <Input
                    type="number" min={0}
                    value={form.weightBracketMaxKg ?? ''}
                    onChange={(e) => set('weightBracketMaxKg', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1">
            <Label>Fee (KES)</Label>
            <Input
              type="number" min={0} step={1}
              placeholder="e.g. 500"
              value={form.feeKes || ''}
              onChange={(e) => set('feeKes', parseFloat(e.target.value) || 0)}
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

export default function TariffRulesPage() {
  const { data: rules = [], isLoading } = useTariffRules();
  const deleteRule = useDeleteTariffRule();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CommercialTariffRule | null>(null);

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (r: CommercialTariffRule) => { setEditing(r); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditing(null); };

  const handleDelete = (r: CommercialTariffRule) => {
    if (!r.id) return;
    if (!confirm(`Delete tariff rule "${r.label || 'Untitled rule'}"?`)) return;
    deleteRule.mutate(r.id, {
      onSuccess: () => toast.success('Tariff rule deleted'),
      onError: () => toast.error('Failed to delete tariff rule'),
    });
  };

  const formatScope = (r: CommercialTariffRule) => {
    if (r.transporterName) return `Contract: ${r.transporterName}`;
    const parts: string[] = [];
    if (r.vehicleType) parts.push(r.vehicleType);
    if (r.axleCountMin || r.axleCountMax) {
      parts.push(`${r.axleCountMin ?? '0'}–${r.axleCountMax ?? '∞'} axles`);
    }
    if (r.weightBracketMinKg || r.weightBracketMaxKg) {
      parts.push(`${(r.weightBracketMinKg ?? 0).toLocaleString()}–${r.weightBracketMaxKg?.toLocaleString() ?? '∞'} kg`);
    }
    return parts.length > 0 ? parts.join(' · ') : 'All vehicles (default bracket)';
  };

  return (
    <ProtectedRoute requiredPermissions={['billing.tariffs.view']} moduleKey="billing">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Commercial Weighing Tariffs</h1>
            <p className="text-sm text-muted-foreground">
              Configure fee rules by transporter contract or by vehicle type / axle count / weight
              bracket. Falls back to the default fee (Commercial Settings) when nothing matches.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Rule
          </Button>
        </div>

        <Card className="border-blue-100 bg-blue-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 space-y-1">
                <p className="font-medium">How tariff rules are resolved</p>
                <p>
                  A matching transporter contract rate always wins. Otherwise, the most specific
                  matching bracket rule (vehicle type + axle count + weight) is used. If nothing
                  matches, the org&apos;s default commercial weighing fee applies.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Tariff Rules
            </CardTitle>
            <CardDescription>
              {rules.length} rule{rules.length !== 1 ? 's' : ''} configured
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Fee (KES)</TableHead>
                  <TableHead>Status</TableHead>
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
                {!isLoading && rules.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      No tariff rules configured — every weighing uses the default commercial fee.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && rules.map((r, idx) => (
                  <TableRow key={r.id ?? idx}>
                    <TableCell className="font-medium">{r.label || '—'}</TableCell>
                    <TableCell className="text-sm">{formatScope(r)}</TableCell>
                    <TableCell className="font-medium">{r.feeKes.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={r.isActive === false ? 'secondary' : 'default'}>
                        {r.isActive === false ? 'Inactive' : 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(r)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <TariffFormDialog existing={editing} open={dialogOpen} onClose={closeDialog} />
    </ProtectedRoute>
  );
}
