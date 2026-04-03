'use client';

/**
 * Platform Integrations page.
 * Reuses the existing integration settings page content in the platform shell.
 * All integration management (payments, SMS, APIs) is done here for platform admins.
 */

import { PlatformShell } from '@/components/layout/PlatformShell';
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
import { CreditCard, DollarSign, Globe, Mail } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const PAYMENT_PROVIDERS: ProviderMeta[] = [
  { providerName: 'ecitizen_pesaflow', displayName: 'eCitizen Pesaflow', description: 'Government payment gateway', logo: '/images/logos/ecitizen-logo.svg', color: 'bg-purple-100' },
];

const NOTIFICATION_PROVIDERS: ProviderMeta[] = [
  { providerName: 'sms_twilio', displayName: 'Twilio SMS', description: 'Cloud SMS platform', color: 'bg-red-50 text-red-700' },
  { providerName: 'sms_africastalking', displayName: "Africa's Talking", description: 'Bulk SMS for Africa', color: 'bg-blue-50 text-blue-700' },
  { providerName: 'email_smtp', displayName: 'SMTP Email', description: 'Standard email protocol', color: 'bg-gray-50 text-gray-700' },
];

const API_SERVICES: ProviderMeta[] = [
  { providerName: 'ntsa', displayName: 'NTSA', description: 'Vehicle verification', logo: '/images/logos/ntsa-logo.png', color: 'bg-emerald-100 text-emerald-700' },
  { providerName: 'kenha', displayName: 'KeNHA', description: 'Road permits', logo: '/images/logos/kenha-logo.png', color: 'bg-amber-100 text-amber-700' },
];

export default function PlatformIntegrationsPage() {
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
    } catch { toast.error('Failed to save'); }
  };

  const handleTest = async (providerName: string) => {
    try {
      const result = await testMutation.mutateAsync(providerName);
      if (result?.success) toast.success(`${providerName} test passed`);
      else toast.error(`${providerName} test failed`);
      return result;
    } catch { toast.error('Test failed'); return { success: false, provider: providerName, message: 'Failed' }; }
  };

  if (isLoading) {
    return (
      <PlatformShell title="Integrations" subtitle="Payment gateways, notification providers, and API services">
        <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div>
      </PlatformShell>
    );
  }

  const renderProviders = (providers: ProviderMeta[]) =>
    providers.map((p) => (
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
    <PlatformShell title="Integrations" subtitle="Payment gateways, notification providers, and external API services">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: provider list */}
        <div className="space-y-6">
          <Tabs defaultValue="payments" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="payments"><CreditCard className="h-4 w-4 mr-1" />Pay</TabsTrigger>
              <TabsTrigger value="notifications"><Mail className="h-4 w-4 mr-1" />Notif</TabsTrigger>
              <TabsTrigger value="apis"><Globe className="h-4 w-4 mr-1" />APIs</TabsTrigger>
            </TabsList>
            <TabsContent value="payments" className="mt-4 space-y-3">{renderProviders(PAYMENT_PROVIDERS)}</TabsContent>
            <TabsContent value="notifications" className="mt-4 space-y-3">{renderProviders(NOTIFICATION_PROVIDERS)}</TabsContent>
            <TabsContent value="apis" className="mt-4 space-y-3">{renderProviders(API_SERVICES)}</TabsContent>
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
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm border rounded-lg">
              Select a provider to configure
            </div>
          )}
        </div>
      </div>

      {/* Exchange rates & reconciliation */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExchangeRateSettings />
        <ReconciliationPanel
          onReconcile={async () => {
            const result = await reconcilePayments();
            toast.success('Reconciliation completed');
            return result;
          }}
        />
      </div>
    </PlatformShell>
  );
}
