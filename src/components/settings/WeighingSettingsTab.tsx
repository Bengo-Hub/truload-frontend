'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  useSettingsByCategory,
  useUpdateSettingsBatch,
} from '@/hooks/queries/useSettingsQueries';
import { useToleranceSettings } from '@/hooks/queries/useActQueries';
import { updateToleranceSetting } from '@/lib/api/acts';
import type { ApplicationSettingDto, UpdateSettingsBatchRequest } from '@/lib/api/settings';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Info, Loader2, Save, Scale } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

const KEY_SCALE_TEST_REQUIRED = 'weighing.scale_test_required';
const KEY_MAX_REWEIGH_CYCLES = 'weighing.max_reweigh_cycles';

export function WeighingSettingsTab() {
  const { data: settings, isLoading } = useSettingsByCategory('Weighing');
  const { data: toleranceSettings = [], isLoading: isLoadingTolerances } = useToleranceSettings('TRAFFIC_ACT');
  const updateBatch = useUpdateSettingsBatch();
  const queryClient = useQueryClient();

  const [scaleTestRequired, setScaleTestRequired] = useState<boolean>(false);
  const [maxReweighCycles, setMaxReweighCycles] = useState<string>('3');
  const [operationalTolerance, setOperationalTolerance] = useState<string>('200');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Find operational allowance tolerance setting
  const opAllowanceSetting = toleranceSettings.find(
    (t: any) => t.code === 'OPERATIONAL_ALLOWANCE' && t.isActive
  );

  useEffect(() => {
    if (!settings?.length) return;
    const get = (key: string) => settings.find((s: ApplicationSettingDto) => s.settingKey === key);

    const scaleTestSetting = get(KEY_SCALE_TEST_REQUIRED);
    setScaleTestRequired(scaleTestSetting?.settingValue === 'true');

    const reweighSetting = get(KEY_MAX_REWEIGH_CYCLES);
    setMaxReweighCycles(reweighSetting?.settingValue ?? '3');
  }, [settings]);

  // Load operational tolerance from ToleranceSetting table (single source of truth)
  useEffect(() => {
    if (opAllowanceSetting) {
      setOperationalTolerance(String(opAllowanceSetting.toleranceKg ?? 200));
    }
  }, [opAllowanceSetting]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Save application settings (scale test, reweigh cycles)
      const updates: UpdateSettingsBatchRequest['settings'] = [
        { settingKey: KEY_SCALE_TEST_REQUIRED, settingValue: scaleTestRequired.toString() },
        { settingKey: KEY_MAX_REWEIGH_CYCLES, settingValue: maxReweighCycles },
      ];
      await updateBatch.mutateAsync({ settings: updates });

      // Save operational tolerance to ToleranceSetting table (single source of truth)
      if (opAllowanceSetting) {
        await updateToleranceSetting(opAllowanceSetting.id, {
          toleranceKg: parseInt(operationalTolerance, 10) || 0,
        });
        // Invalidate tolerance queries so all pages pick up the change
        queryClient.invalidateQueries({ queryKey: ['tolerances'] });
      }

      toast.success('Weighing settings saved');
      setHasChanges(false);
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }, [scaleTestRequired, maxReweighCycles, operationalTolerance, updateBatch, opAllowanceSetting, queryClient]);

  useEffect(() => {
    if (!settings?.length) return;
    const get = (key: string) => settings.find((s: ApplicationSettingDto) => s.settingKey === key)?.settingValue ?? '';

    const settingsChanged =
      (get(KEY_SCALE_TEST_REQUIRED) === 'true') !== scaleTestRequired ||
      get(KEY_MAX_REWEIGH_CYCLES) !== maxReweighCycles;

    const toleranceChanged = opAllowanceSetting
      ? String(opAllowanceSetting.toleranceKg ?? 200) !== operationalTolerance
      : false;

    setHasChanges(settingsChanged || toleranceChanged);
  }, [settings, scaleTestRequired, maxReweighCycles, operationalTolerance, opAllowanceSetting]);

  if (isLoading || isLoadingTolerances) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-4">
        <Scale className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Weighing Configuration</p>
          <p>
            Configure how the weighing module behaves, including scale test requirements and re-weigh thresholds.
          </p>
        </div>
      </div>

      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-0.5">
            <Label htmlFor="scale-test-required">Scale test required before weighing</Label>
            <p className="text-xs text-muted-foreground">
              If enabled, operators must complete a passing scale test before performing any weights for the day.
            </p>
          </div>
          <Switch
            id="scale-test-required"
            checked={scaleTestRequired}
            onCheckedChange={setScaleTestRequired}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="max-reweigh-cycles">Maximum re-weigh cycles</Label>
          <Input
            id="max-reweigh-cycles"
            type="number"
            value={maxReweighCycles}
            onChange={(e) => setMaxReweighCycles(e.target.value)}
            className="max-w-[200px]"
          />
          <p className="text-xs text-muted-foreground">
            The number of times a vehicle can be re-weighed if it fails compliance.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="operational-tolerance">Operational allowance (kg)</Label>
          <Input
            id="operational-tolerance"
            type="number"
            min="0"
            value={operationalTolerance}
            onChange={(e) => setOperationalTolerance(e.target.value)}
            className="max-w-[200px]"
          />
          <p className="text-xs text-muted-foreground">
            Additional operational allowance added to permissible limits for technical variance.
            Set to 0 to disable. This value is used by both the frontend compliance display and the backend ticket generation.
          </p>
        </div>

        <div className="pt-4 border-t">
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save changes
          </Button>
        </div>
      </Card>

      <div className="flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-200 p-4">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Note on Local Mode</p>
          <p className="text-xs leading-relaxed">
            When operating in local mode (disconnected from central server), some of these settings may be overridden by local configuration files to ensure continued operation.
          </p>
        </div>
      </div>
    </div>
  );
}
