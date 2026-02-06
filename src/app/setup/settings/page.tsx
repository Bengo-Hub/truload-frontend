'use client';

import Image from 'next/image';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useHasPermission } from '@/hooks/useAuth';
import {
  fetchApiSettings,
  saveApiSettings,
  type KeyValueEntry,
} from '@/lib/api/setup';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Bell,
  Globe,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  Wifi,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

// ---------------------------------------------------------------------------
// Service definitions
// ---------------------------------------------------------------------------

interface ServiceDef {
  value: string;
  label: string;
  description: string;
  logo?: string;
  icon?: React.ReactNode;
  color: string;
}

const SERVICES: ServiceDef[] = [
  {
    value: 'notifications',
    label: 'Notifications Service',
    description: 'Push notifications, SMS, and email gateway',
    icon: <Bell className="h-6 w-6 text-blue-600" />,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  {
    value: 'ntsa',
    label: 'NTSA',
    description: 'National Transport & Safety Authority vehicle verification',
    logo: '/images/logos/ntsa-logo.png',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  {
    value: 'ecitizen',
    label: 'eCitizen',
    description: 'Government portal for permit & licence checks',
    logo: '/images/logos/ecitizen-logo.svg',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  {
    value: 'kenha',
    label: 'KeNHA',
    description: 'Kenya National Highways Authority road permits',
    logo: '/images/logos/kenha-logo.png',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function IntegrationSettingsPage() {
  const canEdit = useHasPermission(['config.read', 'system.security_policy'], 'any');
  const [activeService, setActiveService] = useState<string>(SERVICES[0].value);

  // Fetch API settings for selected service
  const {
    data: apiSettings,
    isLoading,
    refetch: refetchApiSettings,
    isRefetching,
  } = useQuery({
    queryKey: ['apiSettings', activeService],
    queryFn: () => fetchApiSettings(activeService),
  });

  const [entries, setEntries] = useState<KeyValueEntry[]>([]);

  useEffect(() => {
    if (apiSettings?.entries) {
      setEntries(apiSettings.entries);
    } else {
      setEntries([]);
    }
  }, [apiSettings]);

  const saveMutation = useMutation({
    mutationFn: () => saveApiSettings(activeService, entries),
    onSuccess: () => {
      toast.success('Integration settings saved');
      refetchApiSettings();
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const addEntry = () => setEntries((prev) => [...prev, { key: '', value: '' }]);
  const removeEntry = (index: number) => setEntries((prev) => prev.filter((_, i) => i !== index));
  const updateEntry = (index: number, field: 'key' | 'value', val: string) => {
    setEntries((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: val } : p)));
  };

  const kvDisabled = useMemo(() => !canEdit, [canEdit]);
  const activeServiceMeta = SERVICES.find((s) => s.value === activeService)!;
  const hasEntries = entries.length > 0;
  const hasEmptyKeys = entries.some((e) => !e.key.trim());

  return (
    <ProtectedRoute requiredPermissions={['config.read']}>
      <div className="space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Globe className="h-6 w-6 text-primary" />
              Integration Settings
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Configure API keys and connection settings for external services
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchApiSettings()}
            disabled={isRefetching}
            className="gap-1.5"
          >
            <RefreshCcw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </header>

        {/* Service Selector Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {SERVICES.map((svc) => (
            <button
              key={svc.value}
              type="button"
              onClick={() => setActiveService(svc.value)}
              className={`rounded-xl border p-3 text-left transition-all ${
                activeService === svc.value
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {svc.logo ? (
                  <Image src={svc.logo} alt={svc.label} width={24} height={24} className="h-6 w-6 object-contain" />
                ) : (
                  svc.icon
                )}
                <span className="font-medium text-sm text-gray-900">{svc.label}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{svc.description}</p>
              {activeService === svc.value && (
                <Badge variant="outline" className="mt-2 text-[10px] bg-primary/10 text-primary border-primary/20">
                  <Wifi className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Settings Editor */}
        <Card className="overflow-hidden">
          <div className="border-b bg-gray-50/50 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {activeServiceMeta.logo ? (
                <Image src={activeServiceMeta.logo} alt={activeServiceMeta.label} width={32} height={32} className="h-8 w-8 object-contain" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center">{activeServiceMeta.icon}</div>
              )}
              <div>
                <h3 className="font-semibold text-gray-900">{activeServiceMeta.label}</h3>
                <p className="text-xs text-muted-foreground">{activeServiceMeta.description}</p>
              </div>
            </div>
            {apiSettings?.updatedAt && (
              <p className="text-xs text-muted-foreground hidden sm:block">
                Last updated: {new Date(apiSettings.updatedAt).toLocaleString()}
              </p>
            )}
          </div>

          <div className="p-6 space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Skeleton className="h-10" />
                    <Skeleton className="h-10" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Key-Value Pairs */}
                <ScrollArea className="max-h-[50vh]">
                  <div className="space-y-3">
                    {entries.map((entry, idx) => (
                      <div
                        key={idx}
                        className="group grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end"
                      >
                        <div className="space-y-1">
                          {idx === 0 && <Label className="text-xs text-muted-foreground">Key</Label>}
                          <Input
                            value={entry.key}
                            onChange={(e) => updateEntry(idx, 'key', e.target.value)}
                            disabled={kvDisabled}
                            placeholder="e.g. api_key, base_url"
                            className="font-mono text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          {idx === 0 && <Label className="text-xs text-muted-foreground">Value</Label>}
                          <Input
                            value={entry.value}
                            onChange={(e) => updateEntry(idx, 'value', e.target.value)}
                            disabled={kvDisabled}
                            placeholder="Value"
                            type={entry.key.toLowerCase().includes('secret') || entry.key.toLowerCase().includes('password') ? 'password' : 'text'}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeEntry(idx)}
                          disabled={kvDisabled}
                          className="h-10 w-10 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Empty State */}
                {!hasEntries && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="rounded-full bg-muted p-4 mb-3">
                      <AlertCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">No settings configured</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      Add key-value pairs to configure the {activeServiceMeta.label} integration.
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between border-t pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addEntry}
                    disabled={kvDisabled}
                    className="gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    Add Setting
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => saveMutation.mutate()}
                    disabled={kvDisabled || saveMutation.isPending || hasEmptyKeys}
                    className="gap-1.5"
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Settings
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Info */}
        <div className="flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-200 p-4">
          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Integration Configuration</p>
            <p>
              Settings are stored securely and used by the backend to connect to external services.
              Keys containing &quot;secret&quot; or &quot;password&quot; are masked in the UI.
              For security-related settings (password policy, shift enforcement, 2FA, backups),
              use the <strong>Security &amp; System Configuration</strong> page.
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
