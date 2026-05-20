'use client';

import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { ExchangeRateSettings } from '@/components/integrations/ExchangeRateSettings';
import {
  IntegrationConfigForm,
  IntegrationProviderCard,
  ReconciliationPanel,
  type ProviderMeta,
} from '@/components/integrations';
import { useIntegrations, useUpsertIntegration } from '@/hooks/queries/useIntegrationQueries';
import type { UpsertIntegrationConfigRequest } from '@/lib/api/integration';
import { testIntegrationConnectivity, reconcilePayments } from '@/lib/api/integration';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMutation } from '@tanstack/react-query';
import { Bell, CreditCard, Globe, Lock } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

// ── Provider definitions ────────────────────────────────────────────────────

const PAYMENT_PROVIDERS: ProviderMeta[] = [
  {
    providerName: 'ecitizen_pesaflow',
    displayName: 'eCitizen Pesaflow',
    description: 'Government payment gateway for enforcement fines',
    logo: '/images/logos/ecitizen-logo.svg',
    color: 'bg-purple-100',
  },
  {
    providerName: 'treasury_service',
    displayName: 'Treasury Service',
    description: 'Commercial weighing fee payment via treasury',
    color: 'bg-green-50 text-green-700',
  },
];

const NOTIFICATION_PROVIDERS: ProviderMeta[] = [
  {
    providerName: 'sms_twilio',
    displayName: 'Twilio SMS',
    description: 'Cloud SMS platform for alerts and OTP delivery',
    color: 'bg-red-50 text-red-700',
  },
  {
    providerName: 'sms_africastalking',
    displayName: "Africa's Talking",
    description: 'Bulk SMS for African markets',
    color: 'bg-blue-50 text-blue-700',
  },
  {
    providerName: 'email_smtp',
    displayName: 'SMTP Email',
    description: 'Standard email protocol for notification delivery',
    color: 'bg-gray-50 text-gray-700',
  },
];

const API_SERVICES: ProviderMeta[] = [
  {
    providerName: 'ntsa',
    displayName: 'NTSA',
    description: 'National Transport & Safety Authority — vehicle verification',
    logo: '/images/logos/ntsa-logo.png',
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    providerName: 'kenha',
    displayName: 'KeNHA',
    description: 'Kenya National Highways Authority — road permits',
    logo: '/images/logos/kenha-logo.png',
    color: 'bg-amber-100 text-amber-700',
  },
];

// ── Page ────────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  return (
    <AppShell title="Integrations" subtitle="Payment gateways, notification channels, and government API services">
      <ProtectedRoute requiredPermissions={['config.read']}>
        <IntegrationsContent />
      </ProtectedRoute>
    </AppShell>
  );
}

function IntegrationsContent() {
  const { user } = useAuth();
  const isPlatformOwner = user?.isSuperUser === true;

  if (!isPlatformOwner) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <Lock className="h-4 w-4 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800">Integration configuration is restricted to platform administrators. Contact your platform admin to update integration settings.</p>
      </div>
    );
  }

  return <IntegrationsManager />;
}

function IntegrationsManager() {
  const { data: integrations, isLoading, refetch } = useIntegrations();
  const upsertMutation = useUpsertIntegration();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const testMutation = useMutation({ mutationFn: testIntegrationConnectivity });

  const getConfig = (providerName: string) =>
    integrations?.find((i: { providerName: string }) => i.providerName === providerName) ?? null;

  const handleSave = async (request: UpsertIntegrationConfigRequest) => {
    if (!selectedProvider) return;
    try {
      await upsertMutation.mutateAsync({ providerName: selectedProvider, request });
      toast.success('Configuration saved');
      refetch();
    } catch {
      toast.error('Failed to save configuration');
    }
  };

  const handleTest = async (providerName: string) => {
    try {
      const result = await testMutation.mutateAsync(providerName);
      if (result?.success) toast.success(result.message ?? `${providerName} test passed`);
      else toast.error(result?.message ?? `${providerName} test failed`);
      return result;
    } catch {
      toast.error('Connectivity test failed');
      return { success: false, provider: providerName, message: 'Failed' };
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  const renderProviders = (providers: ProviderMeta[]) =>
    providers.map(p => (
      <IntegrationProviderCard
        key={p.providerName}
        provider={p}
        status={getConfig(p.providerName)?.isActive ? 'active' : 'inactive'}
        isSelected={selectedProvider === p.providerName}
        environment={getConfig(p.providerName)?.environment}
        lastUpdated={getConfig(p.providerName)?.updatedAt}
        onClick={() => setSelectedProvider(p.providerName)}
      />
    ));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: grouped provider list */}
        <div className="space-y-4">
          <Tabs defaultValue="payments" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="payments" className="gap-1 text-xs">
                <CreditCard className="h-3.5 w-3.5" />
                Payments
              </TabsTrigger>
              <TabsTrigger value="channels" className="gap-1 text-xs">
                <Bell className="h-3.5 w-3.5" />
                Channels
              </TabsTrigger>
              <TabsTrigger value="apis" className="gap-1 text-xs">
                <Globe className="h-3.5 w-3.5" />
                APIs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="payments" className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground px-1">
                Payment gateways used for enforcement fines and commercial weighing fees.
              </p>
              {renderProviders(PAYMENT_PROVIDERS)}
            </TabsContent>

            <TabsContent value="channels" className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground px-1">
                SMS and email providers for notification delivery and OTP.
              </p>
              {renderProviders(NOTIFICATION_PROVIDERS)}
            </TabsContent>

            <TabsContent value="apis" className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground px-1">
                Government API services for vehicle and permit verification.
              </p>
              {renderProviders(API_SERVICES)}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: config form */}
        <div className="lg:col-span-2">
          {selectedProvider ? (
            <IntegrationConfigForm
              providerName={selectedProvider}
              config={getConfig(selectedProvider)}
              onSave={handleSave}
              isSaving={upsertMutation.isPending}
              onTestConnection={handleTest}
              canEdit
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm border rounded-lg bg-muted/20">
              Select a provider on the left to configure it
            </div>
          )}
        </div>
      </div>

      {/* Exchange rates & reconciliation panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExchangeRateSettings />
        <ReconciliationPanel
          onReconcile={async () => {
            const result = await reconcilePayments();
            toast.success('Payment reconciliation completed');
            return result;
          }}
        />
      </div>
    </div>
  );
}
