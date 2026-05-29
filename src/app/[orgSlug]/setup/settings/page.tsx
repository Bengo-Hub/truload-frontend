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
import { useOrgPaymentSettings, useUpdateOrgPaymentSettings } from '@/hooks/useOrgPaymentSettings';
import { useAuth, useHasPermission } from '@/hooks/useAuth';
import type { UpsertIntegrationConfigRequest } from '@/lib/api/integration';
import { reconcilePayments, testIntegrationConnectivity } from '@/lib/api/integration';
import { notificationApi } from '@/lib/api/notification';
import {
  fetchApiSettings,
  saveApiSettings,
  type KeyValueEntry,
} from '@/lib/api/setup';
import { cn } from '@/lib/utils';

// Layout & UI
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

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
  Cpu,
  Download,
  ExternalLink,
  Scale,
  Info
} from 'lucide-react';

import { ExchangeRateSettings } from '@/components/integrations/ExchangeRateSettings';
import { WeighingSettingsTab } from '@/components/settings/WeighingSettingsTab';
import { CommercialSettingsTab } from '@/components/settings/CommercialSettingsTab';
import { useModuleAccess } from '@/hooks/useModuleAccess';

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
  const canDelete = useHasPermission('system.integration_management');
  return (
    <ProtectedRoute requiredPermissions={['config.read']}>
      <IntegrationSettingsContent />
    </ProtectedRoute>
  );
}

// ============================================================================
// Content
// ============================================================================

type TabId =
  | 'payment-gateways'
  | 'notifications'
  | 'api-settings'
  | 'exchange-rates'
  | 'weighing'
  | 'commercial'
  | 'invoice-payment'
  | 'middleware';

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  group: string;
  ownerOnly?: boolean;
  commercialOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'payment-gateways', label: 'Payments',      icon: <CreditCard className="h-4 w-4" />, group: 'Integrations', ownerOnly: true },
  { id: 'notifications',    label: 'Notifications', icon: <Bell className="h-4 w-4" />,       group: 'Integrations', ownerOnly: true },
  { id: 'api-settings',     label: 'APIs',          icon: <Settings2 className="h-4 w-4" />,  group: 'Integrations', ownerOnly: true },
  { id: 'exchange-rates',   label: 'Rates',         icon: <DollarSign className="h-4 w-4" />, group: 'Settings' },
  { id: 'weighing',         label: 'Weighing',      icon: <Scale className="h-4 w-4" />,      group: 'Settings' },
  { id: 'commercial',       label: 'Commercial',    icon: <Globe className="h-4 w-4" />,      group: 'Settings', commercialOnly: true },
  { id: 'invoice-payment',  label: 'Invoice',       icon: <FileText className="h-4 w-4" />,   group: 'Settings' },
  { id: 'middleware',       label: 'Middleware',    icon: <Cpu className="h-4 w-4" />,        group: 'System' },
];

function IntegrationSettingsContent() {
  const { user } = useAuth();
  const canEdit = useHasPermission(['config.read', 'config.update'], 'any');
  const isPlatformOwner = user?.isSuperUser === true;
  const { isCommercial } = useModuleAccess();

  const visibleItems = NAV_ITEMS.filter(
    (item) =>
      (!item.ownerOnly || isPlatformOwner) &&
      (!item.commercialOnly || isCommercial)
  );

  const defaultTab = isPlatformOwner ? 'payment-gateways' : isCommercial ? 'commercial' : 'exchange-rates';
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab as TabId);

  // Group items for sidebar
  const groups = useMemo(() => {
    const map: Record<string, NavItem[]> = {};
    for (const item of visibleItems) {
      if (!map[item.group]) map[item.group] = [];
      map[item.group].push(item);
    }
    return map;
  }, [visibleItems]);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <header>
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          Settings
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage integrations, payment details, and system configuration
        </p>
      </header>

      {/* Mobile: horizontally scrollable tab strip */}
      <div className="lg:hidden -mx-4 px-4 border-b overflow-x-auto">
        <div className="flex gap-1 pb-0 min-w-max">
          {visibleItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                activeTab === item.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: sidebar + content */}
      <div className="flex gap-6 items-start">
        {/* Left sidebar — desktop only */}
        <aside className="hidden lg:block w-48 shrink-0">
          <nav className="space-y-5 sticky top-4">
            {Object.entries(groups).map(([group, items]) => (
              <div key={group}>
                <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </p>
                <ul className="space-y-0.5">
                  {items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                          'w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          activeTab === item.id
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        {item.icon}
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {activeTab === 'payment-gateways' && isPlatformOwner && <PaymentGatewaysTab canEdit={canEdit} />}
          {activeTab === 'notifications'    && isPlatformOwner && <NotificationsTab canEdit={canEdit} />}
          {activeTab === 'api-settings'     && isPlatformOwner && <ApiSettingsTab canEdit={canEdit} />}
          {activeTab === 'exchange-rates'   && <ExchangeRateSettings />}
          {activeTab === 'weighing'         && <WeighingSettingsTab isCommercial={isCommercial} />}
          {activeTab === 'commercial'       && isCommercial     && <CommercialSettingsTab canEdit={canEdit} />}
          {activeTab === 'invoice-payment'  && <InvoicePaymentSettingsTab canEdit={canEdit} />}
          {activeTab === 'middleware'       && <MiddlewareTab />}
        </div>
      </div>
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
  const canDelete = useHasPermission('system.integration_management');
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
                      {canDelete && (<Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEntry(idx)}
                        disabled={kvDisabled}
                        className="h-10 w-10 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>)}
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

// ============================================================================
// Middleware Tab
// ============================================================================

function MiddlewareTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">TruConnect Middleware</h3>
              <p className="text-xs text-muted-foreground">Required for hardware connectivity</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed">
            TruConnect is a lightweight bridge that allows this browser application to communicate with your weighing scales, printers, and traffic lights. It must be installed and running on the computer connected to your hardware.
          </p>

          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Installation Steps</h4>
            <ul className="space-y-2">
              <li className="flex gap-3 text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">1</span>
                <span>Download the latest version of TruConnect for Windows.</span>
              </li>
              <li className="flex gap-3 text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">2</span>
                <span>Run the installer and follow the on-screen instructions.</span>
              </li>
              <li className="flex gap-3 text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">3</span>
                <span>Once running, you should see a green icon in the system tray.</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <Button asChild className="gap-2 flex-1">
              <a href="https://github.com/titusowuor30/TruConnect/releases/latest" target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
                Download TruConnect
              </a>
            </Button>
            <Button variant="outline" asChild className="gap-2 flex-1">
              <a href="https://github.com/titusowuor30/TruConnect" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                View Repository
              </a>
            </Button>
          </div>
        </Card>

        <Card className="p-6 bg-gray-50/50 border-dashed space-y-4">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            Connectivity Troubleshooting
          </h4>
          <div className="space-y-3">
            <div className="p-3 bg-white rounded-lg border shadow-sm">
              <p className="text-xs font-medium text-gray-900">Check Connection Status</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Visit the Weighing screen. If the scales show &quot;OFFLINE&quot; or &quot;DISCONNECTED&quot;, ensure the middleware is running and the hardware cables are secure.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border shadow-sm">
              <p className="text-xs font-medium text-gray-900">Firewall & Antivirus</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Ensure port 3030 (WebSocket) and 3031 (API) are allowed through your local firewall.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border shadow-sm">
              <p className="text-xs font-medium text-gray-900">Auto-Updates</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                TruConnect checks for updates automatically on startup. Restart the application to apply pending updates.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// Invoice Payment Settings Tab
// ============================================================================

function InvoicePaymentSettingsTab({ canEdit }: { canEdit: boolean }) {
  const { data, isLoading } = useOrgPaymentSettings();
  const updateMutation = useUpdateOrgPaymentSettings();

  const [form, setForm] = useState({
    bankName: '',
    bankBranch: '',
    bankAccountNumber: '',
    mpesaPaybillNumber: '',
    mpesaTillNumber: '',
  });

  useEffect(() => {
    if (data) {
      setForm({
        bankName: data.bankName ?? '',
        bankBranch: data.bankBranch ?? '',
        bankAccountNumber: data.bankAccountNumber ?? '',
        mpesaPaybillNumber: data.mpesaPaybillNumber ?? '',
        mpesaTillNumber: data.mpesaTillNumber ?? '',
      });
    }
  }, [data]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        bankName: form.bankName || undefined,
        bankBranch: form.bankBranch || undefined,
        bankAccountNumber: form.bankAccountNumber || undefined,
        mpesaPaybillNumber: form.mpesaPaybillNumber || undefined,
        mpesaTillNumber: form.mpesaTillNumber || undefined,
      });
      toast.success('Payment settings saved');
    } catch {
      toast.error('Failed to save payment settings');
    }
  };

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Invoice Payment Details</h3>
        <p className="text-sm text-muted-foreground mt-1">
          These details appear on invoice PDFs under &quot;Payment Instructions&quot;. Leave blank to omit a section.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b bg-gray-50/50 px-5 py-3 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-gray-900">Bank Transfer</span>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Bank Name</Label>
            <Input
              value={form.bankName}
              onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
              placeholder="e.g. Kenya Commercial Bank"
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Branch</Label>
            <Input
              value={form.bankBranch}
              onChange={(e) => setForm((f) => ({ ...f, bankBranch: e.target.value }))}
              placeholder="e.g. Nairobi Main"
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Account Number</Label>
            <Input
              value={form.bankAccountNumber}
              onChange={(e) => setForm((f) => ({ ...f, bankAccountNumber: e.target.value }))}
              placeholder="e.g. 1234567890"
              disabled={!canEdit}
            />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b bg-gray-50/50 px-5 py-3 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-600" />
          <span className="text-sm font-semibold text-gray-900">M-Pesa</span>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Paybill Business No</Label>
            <Input
              value={form.mpesaPaybillNumber}
              onChange={(e) => setForm((f) => ({ ...f, mpesaPaybillNumber: e.target.value }))}
              placeholder="e.g. 222222"
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Till Number</Label>
            <Input
              value={form.mpesaTillNumber}
              onChange={(e) => setForm((f) => ({ ...f, mpesaTillNumber: e.target.value }))}
              placeholder="e.g. 654321"
              disabled={!canEdit}
            />
          </div>
        </div>
      </Card>

      {canEdit && (
        <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2">
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Payment Details
        </Button>
      )}
    </div>
  );
}
