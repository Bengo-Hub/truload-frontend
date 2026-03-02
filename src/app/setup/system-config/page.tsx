'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DocumentConventionsTab } from '@/components/settings/DocumentConventionsTab';
import { DocumentSequencesTab } from '@/components/settings/DocumentSequencesTab';
import { ProsecutionSettingsTab } from '@/components/settings/ProsecutionSettingsTab';
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
import { useHasPermission } from '@/hooks/useAuth';
import type { ApplicationSettingDto, UpdateSettingsBatchRequest } from '@/lib/api/settings';
import { Bell, Calculator, Clock, FileText, Gauge, Gavel, Info, Loader2, RotateCcw, Save, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// ============================================================================
// Category Settings Tab Component
// ============================================================================

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

  // Sync edit values when settings load
  useEffect(() => {
    if (settings) {
      const values: Record<string, string> = {};
      settings.forEach((s: ApplicationSettingDto) => {
        values[s.settingKey] = s.settingValue;
      });
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
      .map((s: ApplicationSettingDto) => ({
        settingKey: s.settingKey,
        settingValue: editValues[s.settingKey],
      }));

    if (changedSettings.length === 0) {
      toast.info('No changes to save');
      return;
    }

    try {
      await updateBatch.mutateAsync({ settings: changedSettings } as UpdateSettingsBatchRequest);
      toast.success(`${changedSettings.length} setting(s) updated`);
      setHasChanges(false);
      refetch();

      // Auto-reload rate limits if this is the Rate Limiting tab
      if (showReloadRateLimits) {
        try {
          await reloadRateLimits.mutateAsync();
          toast.success('Rate limits applied to runtime');
        } catch {
          toast.warning('Settings saved but rate limits need manual reload');
        }
      }
    } catch {
      toast.error('Failed to save settings');
    }
  };

  const handleRestoreDefaults = async () => {
    try {
      await restoreDefaults.mutateAsync(category);
      toast.success(`${category} settings restored to defaults`);
      refetch();
    } catch {
      toast.error('Failed to restore defaults');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (!settings || settings.length === 0) {
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
        {settings.map((setting: ApplicationSettingDto) => (
          <div key={setting.settingKey} className="flex items-center justify-between gap-4 p-4">
            <div className="flex-1 min-w-0">
              <Label className="text-sm font-medium text-gray-900">
                {setting.displayName || setting.settingKey}
              </Label>
              {setting.description && (
                <p className="text-xs text-gray-500 mt-0.5">{setting.description}</p>
              )}
              {setting.defaultValue && editValues[setting.settingKey] !== setting.defaultValue && (
                <p className="text-xs text-amber-600 mt-0.5">Default: {setting.defaultValue}</p>
              )}
            </div>
            <div className="w-32 shrink-0">
              <Input
                type={setting.settingType === 'Decimal' ? 'number' : setting.settingType === 'Integer' ? 'number' : 'text'}
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
        <Button
          variant="outline"
          size="sm"
          onClick={handleRestoreDefaults}
          disabled={restoreDefaults.isPending}
        >
          {restoreDefaults.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="mr-2 h-4 w-4" />
          )}
          Restore Defaults
        </Button>

        <Button
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges || updateBatch.isPending}
        >
          {updateBatch.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function SystemConfigPage() {
  const canEdit = useHasPermission(['config.read', 'config.update'], 'any');

  return (
    <ProtectedRoute requiredPermissions={['system.security_policy', 'config.read']}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">System Configuration</h2>
          <p className="text-sm text-gray-500">
            Manage rate limits, business logic parameters, document numbering, cache durations, and integration timeouts
          </p>
        </div>

        <Tabs defaultValue="rate-limiting" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7">
            <TabsTrigger value="rate-limiting" className="flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              <span className="hidden sm:inline">Rate Limiting</span>
              <span className="sm:hidden">Limits</span>
            </TabsTrigger>
            <TabsTrigger value="weighing" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              <span className="hidden sm:inline">Weighing</span>
              <span className="sm:hidden">Weighing</span>
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Financial</span>
              <span className="sm:hidden">Financial</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
              <span className="sm:hidden">Docs</span>
            </TabsTrigger>
            <TabsTrigger value="prosecution" className="flex items-center gap-2">
              <Gavel className="h-4 w-4" />
              <span className="hidden sm:inline">Prosecution</span>
              <span className="sm:hidden">Court</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
              <span className="sm:hidden">Notifs</span>
            </TabsTrigger>
            <TabsTrigger value="cache" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Cache & Timeouts</span>
              <span className="sm:hidden">Cache</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rate-limiting" className="mt-4">
            <CategorySettingsTab
              category="Rate Limiting"
              description="Configure request rate limits per endpoint policy. Changes are applied immediately to the runtime rate limiter after saving."
              showReloadRateLimits
            />
          </TabsContent>

          <TabsContent value="weighing" className="mt-4">
            <CategorySettingsTab
              category="Weighing"
              description="Configure weighing operation parameters such as maximum re-weigh cycles and operational tolerance thresholds."
            />
          </TabsContent>

          <TabsContent value="financial" className="mt-4">
            <CategorySettingsTab
              category="Financial"
              description="Configure financial calculation parameters including exchange rates and invoice aging thresholds for reports."
            />
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <Tabs defaultValue="conventions" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="conventions">Numbering conventions</TabsTrigger>
                <TabsTrigger value="sequences">Sequence counters</TabsTrigger>
              </TabsList>
              <TabsContent value="conventions">
                <DocumentConventionsTab canEdit={canEdit} />
              </TabsContent>
              <TabsContent value="sequences">
                <DocumentSequencesTab canEdit={canEdit} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="prosecution" className="mt-4">
            <ProsecutionSettingsTab />
          </TabsContent>

          <TabsContent value="notifications" className="mt-4">
            <CategorySettingsTab
              category="Notifications"
              description="Configure notification channels (email, SMS, push) and the centralized notifications service connection."
            />
          </TabsContent>

          <TabsContent value="cache" className="mt-4">
            <div className="space-y-6">
              <CategorySettingsTab
                category="Cache"
                description="Configure cache time-to-live durations for various data sources. Changes take effect after the current cache expires."
              />
              <CategorySettingsTab
                category="Integrations"
                description="Configure HTTP request timeouts for external service integrations (eCitizen, KeNHA, NTSA, Ollama)."
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}
