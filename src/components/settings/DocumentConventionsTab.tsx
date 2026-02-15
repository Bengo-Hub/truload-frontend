'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  useDocumentConventions,
  useUpdateDocumentConvention,
  useDocumentNumberPreview,
} from '@/hooks/queries/useDocumentConventionQueries';
import type {
  DocumentConvention,
  UpdateDocumentConventionRequest,
} from '@/lib/api/documentConventions';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';

import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Loader2,
  Save,
} from 'lucide-react';

// ============================================================================
// Document type display metadata
// ============================================================================

const DOC_TYPE_META: Record<string, { label: string; description: string; color: string }> = {
  weight_ticket: {
    label: 'Weight Ticket',
    description: 'Weighbridge measurement certificates',
    color: 'bg-blue-100 text-blue-700',
  },
  invoice: {
    label: 'Invoice',
    description: 'Overload charge invoices',
    color: 'bg-green-100 text-green-700',
  },
  receipt: {
    label: 'Receipt',
    description: 'Payment receipts',
    color: 'bg-emerald-100 text-emerald-700',
  },
  charge_sheet: {
    label: 'Charge Sheet',
    description: 'Prosecution charge documents',
    color: 'bg-red-100 text-red-700',
  },
  compliance_certificate: {
    label: 'Compliance Certificate',
    description: 'Vehicle compliance certificates',
    color: 'bg-teal-100 text-teal-700',
  },
  prohibition_order: {
    label: 'Prohibition Order',
    description: 'Vehicle prohibition documents',
    color: 'bg-orange-100 text-orange-700',
  },
  special_release: {
    label: 'Special Release',
    description: 'Conditional release certificates',
    color: 'bg-amber-100 text-amber-700',
  },
  load_correction_memo: {
    label: 'Load Correction Memo',
    description: 'Offloading/redistribution records',
    color: 'bg-purple-100 text-purple-700',
  },
  court_minutes: {
    label: 'Court Minutes',
    description: 'Court session records',
    color: 'bg-slate-100 text-slate-700',
  },
};

const DATE_FORMAT_OPTIONS = [
  { value: 'yyyyMMdd', label: 'YYYYMMDD (20260215)' },
  { value: 'ddMMyy', label: 'DDMMYY (150226)' },
  { value: 'ddMMyyyy', label: 'DDMMYYYY (15022026)' },
  { value: 'yyMMdd', label: 'YYMMDD (260215)' },
  { value: 'MMyyyy', label: 'MMYYYY (022026)' },
];

const RESET_FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'never', label: 'Never' },
];

// ============================================================================
// Main Component
// ============================================================================

interface DocumentConventionsTabProps {
  canEdit: boolean;
}

export function DocumentConventionsTab({ canEdit }: DocumentConventionsTabProps) {
  const { data: conventions, isLoading } = useDocumentConventions();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <Skeleton className="h-10 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  if (!conventions?.length) {
    return (
      <Card className="p-12 text-center">
        <div className="rounded-full bg-muted p-4 mx-auto w-fit mb-3">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-gray-700">No document conventions configured</p>
        <p className="text-xs text-muted-foreground mt-1">
          Run the database seeder to create default conventions.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-200 p-4 mb-2">
        <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Document Numbering Conventions</p>
          <p className="text-xs leading-relaxed">
            Configure how document numbers are generated across the system. Each document type
            can have its own prefix, date format, sequence padding, and reset frequency.
            Changes take effect on the next generated document.
          </p>
        </div>
      </div>

      {conventions.map((convention) => (
        <ConventionCard key={convention.id} convention={convention} canEdit={canEdit} />
      ))}
    </div>
  );
}

// ============================================================================
// Convention Card
// ============================================================================

function ConventionCard({
  convention,
  canEdit,
}: {
  convention: DocumentConvention;
  canEdit: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<UpdateDocumentConventionRequest>(() => toDraft(convention));
  const updateMutation = useUpdateDocumentConvention();

  const meta = DOC_TYPE_META[convention.documentType] ?? {
    label: convention.displayName || convention.documentType,
    description: '',
    color: 'bg-gray-100 text-gray-700',
  };

  // Reset draft when convention data changes (e.g., after save)
  useEffect(() => {
    setDraft(toDraft(convention));
  }, [convention]);

  const isDirty = useMemo(() => {
    return (
      draft.prefix !== convention.prefix ||
      draft.includeStationCode !== convention.includeStationCode ||
      draft.includeBound !== convention.includeBound ||
      draft.includeDate !== convention.includeDate ||
      draft.dateFormat !== convention.dateFormat ||
      draft.includeVehicleReg !== convention.includeVehicleReg ||
      draft.sequencePadding !== convention.sequencePadding ||
      draft.separator !== convention.separator ||
      draft.resetFrequency !== convention.resetFrequency
    );
  }, [draft, convention]);

  // Live preview
  const previewParams = useMemo(
    () => ({
      documentType: convention.documentType,
      stationCode: draft.includeStationCode ? 'NRBM01' : undefined,
      bound: draft.includeBound ? 'A' : undefined,
      vehicleReg: draft.includeVehicleReg ? 'KDG606L' : undefined,
    }),
    [convention.documentType, draft.includeStationCode, draft.includeBound, draft.includeVehicleReg]
  );
  const { data: preview, isFetching: previewLoading } = useDocumentNumberPreview(previewParams);

  const handleSave = useCallback(async () => {
    try {
      await updateMutation.mutateAsync({ id: convention.id, data: draft });
      toast.success(`${meta.label} convention updated`);
    } catch {
      toast.error('Failed to update convention');
    }
  }, [convention.id, draft, meta.label, updateMutation]);

  // Build a local format preview string from current draft state
  const localPreview = useMemo(() => {
    const parts: string[] = [];
    if (draft.prefix) parts.push(draft.prefix);
    if (draft.includeStationCode) parts.push('NRBM01');
    if (draft.includeBound) parts.push('A');
    if (draft.includeDate) {
      const dateMap: Record<string, string> = {
        yyyyMMdd: '20260215',
        ddMMyy: '150226',
        ddMMyyyy: '15022026',
        yyMMdd: '260215',
        MMyyyy: '022026',
      };
      parts.push(dateMap[draft.dateFormat] ?? '20260215');
    }
    parts.push('0'.repeat(draft.sequencePadding - 1) + '1');
    if (draft.includeVehicleReg) parts.push('KDG606L');
    return parts.join(draft.separator || '-');
  }, [draft]);

  return (
    <Card className="overflow-hidden">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.color}`}>
            <FileText className="h-4.5 w-4.5" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 text-sm">{meta.label}</h3>
              <Badge variant="outline" className="text-[10px] font-mono">
                {convention.documentType}
              </Badge>
            </div>
            {meta.description && (
              <p className="text-xs text-muted-foreground">{meta.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Preview badge */}
          <div className="hidden sm:flex items-center gap-1.5 bg-gray-100 rounded-md px-3 py-1.5">
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            <code className="text-xs font-mono text-gray-700">{localPreview}</code>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Mobile preview */}
      <div className="sm:hidden px-4 pb-2">
        <div className="flex items-center gap-1.5 bg-gray-100 rounded-md px-3 py-1.5 w-fit">
          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          <code className="text-xs font-mono text-gray-700">{localPreview}</code>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t px-4 sm:px-6 py-5 space-y-5">
          {/* Format preview bar */}
          <div className="bg-gray-50 border rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Generated format preview</p>
              <code className="text-sm font-mono font-semibold text-gray-900">
                {previewLoading ? '...' : (preview?.previewNumber ?? localPreview)}
              </code>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              Reset: {draft.resetFrequency}
            </Badge>
          </div>

          {/* Settings grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Prefix */}
            <div className="space-y-1.5">
              <Label className="text-xs">Prefix</Label>
              <Input
                value={draft.prefix}
                onChange={(e) => setDraft((d) => ({ ...d, prefix: e.target.value.toUpperCase() }))}
                disabled={!canEdit}
                placeholder="e.g. WT, INV"
                className="font-mono text-sm"
                maxLength={10}
              />
            </div>

            {/* Separator */}
            <div className="space-y-1.5">
              <Label className="text-xs">Separator</Label>
              <Select
                value={draft.separator}
                onValueChange={(v) => setDraft((d) => ({ ...d, separator: v }))}
                disabled={!canEdit}
              >
                <SelectTrigger className="font-mono text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">Hyphen (-)</SelectItem>
                  <SelectItem value="/">Slash (/)</SelectItem>
                  <SelectItem value=".">Dot (.)</SelectItem>
                  <SelectItem value="_">Underscore (_)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date format */}
            <div className="space-y-1.5">
              <Label className="text-xs">Date Format</Label>
              <Select
                value={draft.dateFormat}
                onValueChange={(v) => setDraft((d) => ({ ...d, dateFormat: v }))}
                disabled={!canEdit || !draft.includeDate}
              >
                <SelectTrigger className="font-mono text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMAT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sequence padding */}
            <div className="space-y-1.5">
              <Label className="text-xs">Sequence Digits</Label>
              <Select
                value={String(draft.sequencePadding)}
                onValueChange={(v) => setDraft((d) => ({ ...d, sequencePadding: parseInt(v) }))}
                disabled={!canEdit}
              >
                <SelectTrigger className="font-mono text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} digits ({'0'.repeat(n - 1)}1)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reset frequency */}
            <div className="space-y-1.5">
              <Label className="text-xs">Reset Frequency</Label>
              <Select
                value={draft.resetFrequency}
                onValueChange={(v) => setDraft((d) => ({ ...d, resetFrequency: v }))}
                disabled={!canEdit}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESET_FREQUENCY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Toggle switches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t">
            <ToggleField
              label="Station Code"
              description="Include weighing station code"
              checked={draft.includeStationCode}
              onCheckedChange={(v) => setDraft((d) => ({ ...d, includeStationCode: v }))}
              disabled={!canEdit}
            />
            <ToggleField
              label="Bound Direction"
              description="Include traffic bound (A/B)"
              checked={draft.includeBound}
              onCheckedChange={(v) => setDraft((d) => ({ ...d, includeBound: v }))}
              disabled={!canEdit}
            />
            <ToggleField
              label="Date"
              description="Include date component"
              checked={draft.includeDate}
              onCheckedChange={(v) => setDraft((d) => ({ ...d, includeDate: v }))}
              disabled={!canEdit}
            />
            <ToggleField
              label="Vehicle Reg"
              description="Include vehicle registration"
              checked={draft.includeVehicleReg}
              onCheckedChange={(v) => setDraft((d) => ({ ...d, includeVehicleReg: v }))}
              disabled={!canEdit}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            {isDirty && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDraft(toDraft(convention))}
                disabled={updateMutation.isPending}
              >
                Reset
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!canEdit || !isDirty || updateMutation.isPending}
              className="gap-1.5"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isDirty ? (
                <Save className="h-4 w-4" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {updateMutation.isPending ? 'Saving...' : isDirty ? 'Save Changes' : 'Saved'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ============================================================================
// Toggle field helper
// ============================================================================

function ToggleField({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium leading-none">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function toDraft(c: DocumentConvention): UpdateDocumentConventionRequest {
  return {
    prefix: c.prefix,
    includeStationCode: c.includeStationCode,
    includeBound: c.includeBound,
    includeDate: c.includeDate,
    dateFormat: c.dateFormat,
    includeVehicleReg: c.includeVehicleReg,
    sequencePadding: c.sequencePadding,
    separator: c.separator,
    resetFrequency: c.resetFrequency,
  };
}
