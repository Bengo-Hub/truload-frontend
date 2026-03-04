'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  useIntegrations,
  useUpsertIntegration,
} from '@/hooks/queries/useIntegrationQueries';
import { useHasPermission } from '@/hooks/useAuth';
import type { UpsertIntegrationConfigRequest } from '@/lib/api/integration';
import { reconcilePayments, testIntegrationConnectivity } from '@/lib/api/integration';
import { notificationApi } from '@/lib/api/notification';
import {
  fetchApiSettings,
  saveApiSettings,
  type KeyValueEntry,
} from '@/lib/api/setup';

// Layout & UI
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Modular integration components
import {
  IntegrationConfigForm,
  IntegrationProviderCard,
  ReconciliationPanel,
  type ProviderMeta,
} from '@/components/integrations';

// Icons
import {
  AlertCircle,
  Bell,
  CreditCard,
  DollarSign,
  FileText,
  Globe,
  Loader2,
  Mail,
  Plus,
  RefreshCcw,
  Save,
  Settings2,
  Trash2,
} from 'lucide-react';

import { ExchangeRateSettings } from '@/components/integrations/ExchangeRateSettings';

// ============================================================================
// Provider Definitions
// ============================================================================

const PAYMENT_PROVIDERS: ProviderMeta[] = [
  {
    providerName: 'ecitizen_pesaflow',
    displayName: 'eCitizen Pesaflow',
    description: 'Government payment gateway for fines and permits',
    logo: '/images/logos/ecitizen-logo.svg',
    color: 'bg-purple-100',
  },
];

const NOTIFICATION_PROVIDERS: ProviderMeta[] = [
  {
    providerName: 'sms_twilio',
    displayName: 'Twilio SMS',
    description: 'Cloud communications platform for SMS',
    logo: '/images/logos/twilio-logo.svg',
    color: 'bg-red-50 text-red-700',
  },
  {
    providerName: 'sms_africastalking',
    displayName: "Africa's Talking SMS",
    description: 'Bulk SMS provider for African markets',
    logo: '/images/logos/africastalking-logo.png',
    color: 'bg-blue-50 text-blue-700',
  },
  {
    providerName: 'email_smtp',
    displayName: 'SMTP Email',
    description: 'Standard protocol for sending emails',
    icon: <Mail className="h-5 w-5 text-gray-700" />,
    color: 'bg-gray-50 text-gray-700',
  },
];

interface ApiServiceDef {
  value: string;
  label: string;
  description: string;
  logo?: string;
  icon?: React.ReactNode;
  color: string;
}

const API_SERVICES: ApiServiceDef[] = [
  {
    value: 'ntsa',
    label: 'NTSA',
    description: 'Vehicle verification & transport authority',
    logo: '/images/logos/ntsa-logo.png',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  {
    value: 'kenha',
    label: 'KeNHA',
    description: 'Kenya National Highways Authority road permits',
    logo: '/images/logos/kenha-logo.png',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
  },
];

// ============================================================================
// Page
// ============================================================================

export default function IntegrationSettingsPage() {
  return (
    <ProtectedRoute requiredPermissions={['config.read']}>
      <IntegrationSettingsContent />
    </ProtectedRoute>
  );
}

// ============================================================================
// Content
// ============================================================================

function IntegrationSettingsContent() {
  const canEdit = useHasPermission(['config.read', 'config.update'], 'any');

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            Integrations
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage payment gateways and external API connections
          </p>
        </div>
      </header>

      {/* Tabs */}
      <Tabs defaultValue="payment-gateways" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 max-w-4xl">
          <TabsTrigger value="payment-gateways" className="gap-1.5">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Payments</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="api-settings" className="gap-1.5">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">APIs</span>
          </TabsTrigger>
          <TabsTrigger value="exchange-rates" className="gap-1.5">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Rates</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payment-gateways">
          <PaymentGatewaysTab canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTab canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="api-settings">
          <ApiSettingsTab canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="exchange-rates">
          <ExchangeRateSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Notifications Tab
// ============================================================================

function NotificationsTab({ canEdit }: { canEdit: boolean }) {
  const { data: integrations, isLoading } = useIntegrations();
  const upsertMutation = useUpsertIntegration();
  const [selectedProvider, setSelectedProvider] = useState<string>(
    NOTIFICATION_PROVIDERS[0].providerName
  );

  const selectedConfig = useMemo(
    () => integrations?.find((c) => c.providerName === selectedProvider) ?? null,
    [integrations, selectedProvider]
  );

  const handleSave = useCallback(
    async (request: UpsertIntegrationConfigRequest) => {
      try {
        await upsertMutation.mutateAsync({
          providerName: request.providerName,
          request,
        });
        toast.success('Notification provider configuration saved');
      } catch {
        toast.error('Failed to save configuration');
      }
    },
    [upsertMutation]
  );

  const handleTestConnection = useCallback(
    async (providerName: string) => {
      return testIntegrationConnectivity(providerName);
    },
    []
  );

  const { data: templates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['notificationTemplates'],
    queryFn: () => notificationApi.getTemplates(),
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
          : NOTIFICATION_PROVIDERS.map((provider) => {
            const config = integrations?.find(
              (c) => c.providerName === provider.providerName
            );
            return (
              <IntegrationProviderCard
                key={provider.providerName}
                provider={provider}
                status={config?.isActive ? 'active' : 'inactive'}
                isSelected={selectedProvider === provider.providerName}
                environment={config?.environment}
                lastUpdated={config?.updatedAt}
                onClick={() => setSelectedProvider(provider.providerName)}
              />
            );
          })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="border-b bg-gray-50/50 px-4 sm:px-6 py-4 flex items-center gap-3">
              {(() => {
                const meta = NOTIFICATION_PROVIDERS.find((p) => p.providerName === selectedProvider);
                return (
                  <>
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${meta?.color ?? 'bg-gray-100'}`}>
                      {meta?.logo ? (
                        <Image
                          src={meta.logo}
                          alt={meta.displayName}
                          width={36}
                          height={36}
                          className="h-8 w-8 object-contain"
                        />
                      ) : (
                        meta?.icon ?? <Bell className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">
                        {meta?.displayName ?? selectedProvider}
                      </h3>
                      <p className="text-xs text-muted-foreground">{meta?.description}</p>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="p-4 sm:p-6">
              <IntegrationConfigForm
                config={selectedConfig}
                providerName={selectedProvider}
                isLoading={isLoading}
                canEdit={canEdit}
                onSave={handleSave}
                isSaving={upsertMutation.isPending}
                onTestConnection={handleTestConnection}
              />
            </div>
          </Card>
        </div>

        <div>
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Available Templates
              </h4>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                {templates?.length ?? 0}
              </span>
            </div>

            <ScrollArea className="h-[400px] pr-4 -mr-4">
              <div className="space-y-2">
                {isLoadingTemplates ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))
                ) : templates?.length ? (
                  templates.map((tpl) => (
                    <div
                      key={tpl.name}
                      className="p-2 border rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono font-medium text-gray-900">
                          {tpl.name}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground border px-1 rounded">
                          {tpl.channel}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">
                        {tpl.description}
                      </p>
                      {tpl.variables?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-dashed">
                          {tpl.variables.slice(0, 3).map((v) => (
                            <span key={v} className="text-[9px] bg-gray-100 text-gray-600 px-1 rounded">
                              {v}
                            </span>
                          ))}
                          {tpl.variables.length > 3 && (
                            <span className="text-[9px] text-muted-foreground">
                              +{tpl.variables.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-xs text-muted-foreground">No templates found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Payment Gateways Tab
// ============================================================================

function PaymentGatewaysTab({ canEdit }: { canEdit: boolean }) {
  const { data: integrations, isLoading } = useIntegrations();
  const upsertMutation = useUpsertIntegration();
  const [selectedProvider, setSelectedProvider] = useState<string>(
    PAYMENT_PROVIDERS[0].providerName
  );

  // Find the config for the selected provider
  const selectedConfig = useMemo(
    () => integrations?.find((c) => c.providerName === selectedProvider) ?? null,
    [integrations, selectedProvider]
  );

  const handleSave = useCallback(
    async (request: UpsertIntegrationConfigRequest) => {
      try {
        await upsertMutation.mutateAsync({
          providerName: request.providerName,
          request,
        });
        toast.success('Integration configuration saved');
      } catch {
        toast.error('Failed to save configuration');
      }
    },
    [upsertMutation]
  );

  const handleTestConnection = useCallback(
    async (providerName: string) => {
      return testIntegrationConnectivity(providerName);
    },
    []
  );

  const handleReconcile = useCallback(async () => {
    return reconcilePayments();
  }, []);

  return (
    <div className="space-y-6">
      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 1 }).map((_, i) => (
            <Card key={i} className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-24 ml-auto" />
              </div>
            </Card>
          ))
          : PAYMENT_PROVIDERS.map((provider) => {
            const config = integrations?.find(
              (c) => c.providerName === provider.providerName
            );
            return (
              <IntegrationProviderCard
                key={provider.providerName}
                provider={provider}
                status={config?.isActive ? 'active' : 'inactive'}
                isSelected={selectedProvider === provider.providerName}
                environment={config?.environment}
                lastUpdated={config?.updatedAt}
                onClick={() => setSelectedProvider(provider.providerName)}
              />
            );
          })}
      </div>

      {/* Configuration Form */}
      <Card className="overflow-hidden">
        <div className="border-b bg-gray-50/50 px-4 sm:px-6 py-4 flex items-center gap-3">
          {(() => {
            const meta = PAYMENT_PROVIDERS.find((p) => p.providerName === selectedProvider);
            return (
              <>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${meta?.color ?? 'bg-gray-100'}`}>
                  {meta?.logo ? (
                    <Image
                      src={meta.logo}
                      alt={meta.displayName}
                      width={36}
                      height={36}
                      className="h-8 w-8 object-contain"
                    />
                  ) : (
                    <CreditCard className="h-4 w-4 text-gray-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {meta?.displayName ?? selectedProvider}
                  </h3>
                  <p className="text-xs text-muted-foreground">{meta?.description}</p>
                </div>
              </>
            );
          })()}
        </div>

        <div className="p-4 sm:p-6">
          <IntegrationConfigForm
            config={selectedConfig}
            providerName={selectedProvider}
            isLoading={isLoading}
            canEdit={canEdit}
            onSave={handleSave}
            isSaving={upsertMutation.isPending}
            onTestConnection={handleTestConnection}
          />
        </div>
      </Card>

      {/* Reconciliation Panel */}
      {selectedProvider === 'ecitizen_pesaflow' && selectedConfig && (
        <ReconciliationPanel
          onReconcile={handleReconcile}
          disabled={!canEdit}
        />
      )}

      {/* Security Info */}
      <div className="flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-200 p-4">
        <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Encrypted Credential Storage</p>
          <p className="text-xs leading-relaxed">
            Payment gateway credentials are encrypted at rest using AES-256-GCM and stored
            securely in the database. Credentials are never exposed in API responses. Webhook
            and callback URLs are auto-generated from your configured app base URL.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// API Settings Tab (Legacy KV Editor)
// ============================================================================

function ApiSettingsTab({ canEdit }: { canEdit: boolean }) {
  const [activeService, setActiveService] = useState(API_SERVICES[0].value);

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
      toast.success('API settings saved');
      refetchApiSettings();
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const addEntry = () => setEntries((prev) => [...prev, { key: '', value: '' }]);
  const removeEntry = (index: number) =>
    setEntries((prev) => prev.filter((_, i) => i !== index));
  const updateEntry = (index: number, field: 'key' | 'value', val: string) => {
    setEntries((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: val } : p)));
  };

  const kvDisabled = !canEdit;
  const activeServiceMeta = API_SERVICES.find((s) => s.value === activeService)!;
  const hasEntries = entries.length > 0;
  const hasEmptyKeys = entries.some((e) => !e.key.trim());

  return (
    <div className="space-y-6">
      {/* Service Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {API_SERVICES.map((svc) => (
          <button
            key={svc.value}
            type="button"
            onClick={() => setActiveService(svc.value)}
            className={`rounded-xl border p-3 text-left transition-all ${activeService === svc.value
              ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {svc.logo ? (
                <Image
                  src={svc.logo}
                  alt={svc.label}
                  width={24}
                  height={24}
                  className="h-6 w-6 object-contain"
                />
              ) : (
                svc.icon
              )}
              <span className="font-medium text-sm text-gray-900">{svc.label}</span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{svc.description}</p>
          </button>
        ))}
      </div>

      {/* Settings Editor */}
      <Card className="overflow-hidden">
        <div className="border-b bg-gray-50/50 px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {activeServiceMeta.logo ? (
              <Image
                src={activeServiceMeta.logo}
                alt={activeServiceMeta.label}
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center">
                {activeServiceMeta.icon}
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900">{activeServiceMeta.label}</h3>
              <p className="text-xs text-muted-foreground">{activeServiceMeta.description}</p>
            </div>
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
        </div>

        <div className="p-4 sm:p-6 space-y-4">
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
                        {idx === 0 && (
                          <Label className="text-xs text-muted-foreground">Key</Label>
                        )}
                        <Input
                          value={entry.key}
                          onChange={(e) => updateEntry(idx, 'key', e.target.value)}
                          disabled={kvDisabled}
                          placeholder="e.g. api_key, base_url"
                          className="font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        {idx === 0 && (
                          <Label className="text-xs text-muted-foreground">Value</Label>
                        )}
                        <Input
                          value={entry.value}
                          onChange={(e) => updateEntry(idx, 'value', e.target.value)}
                          disabled={kvDisabled}
                          placeholder="Value"
                          type={
                            entry.key.toLowerCase().includes('secret') ||
                              entry.key.toLowerCase().includes('password')
                              ? 'password'
                              : 'text'
                          }
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
        <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">API Configuration</p>
          <p className="text-xs leading-relaxed">
            Settings are stored securely and used by the backend to connect to external services.
            Keys containing &quot;secret&quot; or &quot;password&quot; are masked in the UI.
            For payment gateway credentials (eCitizen/Pesaflow), use the{' '}
            <strong>Payment Gateways</strong> tab which provides encrypted storage.
          </p>
        </div>
      </div>
    </div>
  );
}
