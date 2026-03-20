'use client';

/**
 * Platform System Config page - Rate Limiting, Cache & Timeouts, Module Access.
 * These are system-critical settings only accessible to platform admins.
 * Tenant-level settings (Weighing, Financial, etc.) remain in the tenant dashboard.
 */

import { PlatformShell } from '@/components/layout/PlatformShell';
import { ModuleAccessTab } from '@/components/settings/ModuleAccessTab';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useReloadRateLimits,
  useRestoreCategoryDefaults,
  useSettingsByCategory,
  useUpdateSettingsBatch,
} from '@/hooks/queries/useSettingsQueries';
import type { ApplicationSettingDto, UpdateSettingsBatchRequest } from '@/lib/api/settings';
import { Clock, Gauge, Info, Loader2, RotateCcw, Save, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface CategoryTabProps {
  category: string;
  description: string;
  showReloadRateLimits?: boolean;
}

function CategorySettingsTab({ category, description, showReloadRateLimits = false }: CategoryTabProps) {
  const { data: settings, isLoading, refetch } = useSettingsByCategory(category);
  const updateBatch = useUpdateSettingsBatch();
  const restoreDefaults = useRestoreCategoryDefaults();
  const reloadRateLimits = useReloadRateLimits();
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

  const handleSave = async () => {
    if (!settings) return;
    const changed = settings
      .filter((s: ApplicationSettingDto) => editValues[s.settingKey] !== s.settingValue)
      .map((s: ApplicationSettingDto) => ({ settingKey: s.settingKey, settingValue: editValues[s.settingKey] }));
    if (changed.length === 0) { toast.info('No changes to save'); return; }
    try {
      await updateBatch.mutateAsync({ settings: changed } as UpdateSettingsBatchRequest);
      toast.success(`${changed.length} setting(s) updated`);
      setHasChanges(false);
      refetch();
      if (showReloadRateLimits) {
        try { await reloadRateLimits.mutateAsync(); toast.success('Rate limits applied'); } catch { toast.warning('Settings saved but rate limits need manual reload'); }
      }
    } catch { toast.error('Failed to save settings'); }
  };

  if (isLoading) return <div className="space-y-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  if (!settings?.length) return <Card className="p-6"><p className="text-sm text-gray-500">No settings found. Run database seeding to initialize.</p></Card>;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3">
        <Info className="mt-0.5 h-4 w-4 text-blue-600 shrink-0" />
        <p className="text-sm text-blue-700">{description}</p>
      </div>
      <Card className="divide-y">
        {settings.map((setting: ApplicationSettingDto) => (
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
                type={setting.settingType === 'Integer' || setting.settingType === 'Decimal' ? 'number' : 'text'}
                step={setting.settingType === 'Decimal' ? '0.01' : setting.settingType === 'Integer' ? '1' : undefined}
                value={editValues[setting.settingKey] ?? setting.settingValue}
                onChange={e => { setEditValues(prev => ({ ...prev, [setting.settingKey]: e.target.value })); setHasChanges(true); }}
                disabled={!setting.isEditable}
                className="text-right text-sm"
              />
            </div>
          </div>
        ))}
      </Card>
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => restoreDefaults.mutateAsync(category).then(() => { toast.success('Defaults restored'); refetch(); })} disabled={restoreDefaults.isPending}>
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

export default function PlatformSystemConfigPage() {
  return (
    <PlatformShell title="System Configuration" subtitle="Rate limits, cache timeouts, and module access controls">
      <Tabs defaultValue="rate-limiting" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="rate-limiting" className="gap-2">
            <Gauge className="h-4 w-4" />
            <span className="hidden sm:inline">Rate Limiting</span>
            <span className="sm:hidden">Limits</span>
          </TabsTrigger>
          <TabsTrigger value="cache" className="gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Cache & Timeouts</span>
            <span className="sm:hidden">Cache</span>
          </TabsTrigger>
          <TabsTrigger value="modules" className="gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Module Access</span>
            <span className="sm:hidden">Modules</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rate-limiting" className="mt-6">
          <CategorySettingsTab
            category="Rate Limiting"
            description="Configure request rate limits per endpoint policy. Changes are applied immediately to the runtime rate limiter after saving."
            showReloadRateLimits
          />
        </TabsContent>

        <TabsContent value="cache" className="mt-6">
          <div className="space-y-6">
            <CategorySettingsTab category="Cache" description="Configure cache time-to-live durations for various data sources." />
            <CategorySettingsTab category="Integrations" description="Configure HTTP request timeouts for external service integrations." />
          </div>
        </TabsContent>

        <TabsContent value="modules" className="mt-6">
          <ModuleAccessTab />
        </TabsContent>
      </Tabs>
    </PlatformShell>
  );
}
