'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import {
    useDocumentSequences,
    useUpdateDocumentSequence,
} from '@/hooks/queries/useDocumentSequenceQueries';
import type { DocumentSequenceDto, UpdateDocumentSequenceRequest } from '@/lib/api/documentSequences';

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

import { FileText, Loader2, RotateCcw, Save } from 'lucide-react';

const DOC_TYPE_LABELS: Record<string, string> = {
  weight_ticket: 'Weight Ticket',
  reweigh_ticket: 'Reweigh Ticket',
  invoice: 'Invoice',
  receipt: 'Receipt',
  charge_sheet: 'Charge Sheet',
  compliance_certificate: 'Compliance Certificate',
  prohibition_order: 'Prohibition Order',
  special_release: 'Special Release',
  load_correction_memo: 'Load Correction Memo',
  court_minutes: 'Court Minutes',
};

const RESET_FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'never', label: 'Never' },
];

interface DocumentSequencesTabProps {
  canEdit: boolean;
}

export function DocumentSequencesTab({ canEdit }: DocumentSequencesTabProps) {
  const { data: sequences, isLoading } = useDocumentSequences();
  const updateMutation = useUpdateDocumentSequence();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!sequences?.length) {
    return (
      <Card className="p-12 text-center">
        <div className="rounded-full bg-muted p-4 mx-auto w-fit mb-3">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-gray-700">No document sequences yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Sequences are created automatically when document numbers are first generated (e.g. after a weighing).
          Run the database seeder to create default weight ticket and reweigh ticket sequences.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Current sequence counters per document type and station. Use Reset now to set the counter back to 0.
        Changing the current value is for correction only; use with care to avoid duplicate numbers.
      </p>
      <div className="space-y-3">
        {sequences.map((seq) => (
          <SequenceCard key={seq.id} sequence={seq} canEdit={canEdit} onUpdate={updateMutation.mutateAsync} />
        ))}
      </div>
    </div>
  );
}

function SequenceCard({
  sequence,
  canEdit,
  onUpdate,
}: {
  sequence: DocumentSequenceDto;
  canEdit: boolean;
  onUpdate: (args: { id: string; data: UpdateDocumentSequenceRequest }) => Promise<DocumentSequenceDto>;
}) {
  const [currentSequence, setCurrentSequence] = useState(String(sequence.currentSequence));
  const [resetFrequency, setResetFrequency] = useState(sequence.resetFrequency);
  const [saving, setSaving] = useState(false);

  const hasChanges =
    Number(currentSequence) !== sequence.currentSequence || resetFrequency !== sequence.resetFrequency;

  const handleSave = useCallback(async () => {
    const payload: UpdateDocumentSequenceRequest = {};
    const num = Number(currentSequence);
    if (!Number.isInteger(num) || num < 0) {
      toast.error('Current sequence must be a non-negative integer');
      return;
    }
    payload.currentSequence = num;
    if (resetFrequency !== sequence.resetFrequency) payload.resetFrequency = resetFrequency;
    setSaving(true);
    try {
      await onUpdate({ id: sequence.id, data: payload });
      toast.success('Sequence updated');
    } catch {
      toast.error('Failed to update sequence');
    } finally {
      setSaving(false);
    }
  }, [sequence.id, sequence.resetFrequency, currentSequence, resetFrequency, onUpdate]);

  const handleResetNow = useCallback(async () => {
    setSaving(true);
    try {
      await onUpdate({ id: sequence.id, data: { resetNow: true } });
      setCurrentSequence('0');
      toast.success('Sequence reset to 0');
    } catch {
      toast.error('Failed to reset sequence');
    } finally {
      setSaving(false);
    }
  }, [sequence.id, onUpdate]);

  const label = DOC_TYPE_LABELS[sequence.documentType] ?? sequence.documentType;
  const stationLabel = sequence.stationName ?? 'Org-wide';

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[140px]">
          <Label className="text-xs text-muted-foreground">Type</Label>
          <p className="font-medium text-sm">{label}</p>
          <p className="text-xs text-muted-foreground">{stationLabel}</p>
        </div>
        <div className="w-24">
          <Label htmlFor={`seq-${sequence.id}-current`} className="text-xs">Current</Label>
          <Input
            id={`seq-${sequence.id}-current`}
            type="number"
            min={0}
            value={currentSequence}
            onChange={(e) => setCurrentSequence(e.target.value)}
            disabled={!canEdit}
            className="h-9 text-right"
          />
        </div>
        <div className="w-32">
          <Label className="text-xs">Reset frequency</Label>
          <Select
            value={resetFrequency}
            onValueChange={setResetFrequency}
            disabled={!canEdit}
          >
            <SelectTrigger className="h-9">
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
        <div className="text-xs text-muted-foreground">
          Last reset: {sequence.lastResetDate ? new Date(sequence.lastResetDate).toLocaleDateString() : '—'}
        </div>
        {canEdit && (
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={handleResetNow}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Reset now
            </Button>
            <Button
              size="sm"
              className="h-9"
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
