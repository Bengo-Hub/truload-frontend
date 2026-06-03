'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useRestoreCategoryDefaults,
  useSettingsByCategory,
  useUpdateSettingsBatch,
} from '@/hooks/queries/useSettingsQueries';
import type { ApplicationSettingDto, UpdateSettingsBatchRequest } from '@/lib/api/settings';
import { Info, Loader2, RotateCcw, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

/** Keys rendered by curated tabs elsewhere (avoid duplicate editing of the same setting). */
const HIDDEN_SETTING_KEYS = new Set<string>([
  'notification.workflow.preferences',
  // Weighing keys surfaced via the curated Weighing section:
  'weighing.scale_test_required',
  'weighing.max_reweigh_cycles',
  'weighing.operational_tolerance_kg',
  'weighing.case_capture_mode',
]);

interface CategoryTabProps {
  category: string;
  description: string;
}

/**
 * Generic settings editor for any ApplicationSettings category (Financial, etc.).
 * Type-aware inputs, batch save, restore-defaults. Shared by the unified Settings page.
 */
export function CategorySettingsTab({ category, description }: CategoryTabProps) {
  const { data: settings, isLoading, refetch } = useSettingsByCategory(category);
  const updateBatch = useUpdateSettingsBatch();
  const restoreDefaults = useRestoreCategoryDefaults();
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      const values: Record<string, string> = {};
      settings.forEach((s: ApplicationSettingDto) => { values[s.settingKey] = s.settingValue; });
      setEditValues(values);
      setHasChanges(false);
    }
  }, [settings]);

  const handleValueChange = (key: string, value: string) => {
    setEditValues(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!settings) return;
    const changedSettings = settings
      .filter((s: ApplicationSettingDto) => editValues[s.settingKey] !== s.settingValue)
      .map((s: ApplicationSettingDto) => ({ settingKey: s.settingKey, settingValue: editValues[s.settingKey] }));
    if (changedSettings.length === 0) { toast.info('No changes to save'); return; }
    try {
      await updateBatch.mutateAsync({ settings: changedSettings } as UpdateSettingsBatchRequest);
      toast.success(`${changedSettings.length} setting(s) updated`);
      setHasChanges(false);
      refetch();
    } catch { toast.error('Failed to save settings'); }
  };

  const handleRestoreDefaults = async () => {
    try {
      await restoreDefaults.mutateAsync(category);
      toast.success(`${category} settings restored to defaults`);
      refetch();
    } catch { toast.error('Failed to restore defaults'); }
  };

  if (isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  const visible = (settings ?? []).filter((s: ApplicationSettingDto) => !HIDDEN_SETTING_KEYS.has(s.settingKey));

  if (visible.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-sm text-gray-500">No settings found for this category. Run database seeding to initialize.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3">
        <Info className="mt-0.5 h-4 w-4 text-blue-600 shrink-0" />
        <p className="text-sm text-blue-700">{description}</p>
      </div>

      <Card className="divide-y">
        {visible.map((setting: ApplicationSettingDto) => (
          <div key={setting.settingKey} className="flex items-center justify-between gap-4 p-4">
            <div className="flex-1 min-w-0">
              <Label className="text-sm font-medium text-gray-900">{setting.displayName || setting.settingKey}</Label>
              {setting.description && <p className="text-xs text-gray-500 mt-0.5">{setting.description}</p>}
              {setting.defaultValue && editValues[setting.settingKey] !== setting.defaultValue && (
                <p className="text-xs text-amber-600 mt-0.5">Default: {setting.defaultValue}</p>
              )}
            </div>
            <div className="w-32 shrink-0">
              <Input
                type={setting.settingType === 'Decimal' || setting.settingType === 'Integer' ? 'number' : 'text'}
                step={setting.settingType === 'Decimal' ? '0.01' : setting.settingType === 'Integer' ? '1' : undefined}
                value={editValues[setting.settingKey] ?? setting.settingValue}
                onChange={e => handleValueChange(setting.settingKey, e.target.value)}
                disabled={!setting.isEditable}
                className="text-right text-sm"
              />
            </div>
          </div>
        ))}
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={handleRestoreDefaults} disabled={restoreDefaults.isPending}>
          {restoreDefaults.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
          Restore Defaults
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!hasChanges || updateBatch.isPending}>
          {updateBatch.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
