/**
 * Portal Subscription Page
 *
 * Shows the transporter's current effective feature tier. There is no separate,
 * transporter-owned subscription product - the tier is derived from whichever weighbridge
 * operator's subscription the transporter has most recently weighed under (see
 * TransporterPortalService.ResolvePortalSubscriptionAsync on the backend). Previously this page
 * also showed a hardcoded three-tier pricing comparison table with non-functional "Upgrade"
 * buttons that called nothing - removed rather than fixed, since there is no real product behind
 * them to sell.
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePortalSubscription } from '@/hooks/queries/usePortalQueries';
import { CreditCard, Info } from 'lucide-react';

export default function PortalSubscriptionPage() {
  const { data: subscription, isLoading } = usePortalSubscription();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Subscription</h2>
          <p className="text-sm text-gray-500">Your current feature access</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-32" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentTier = subscription?.tier ?? 'basic';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Subscription</h2>
        <p className="text-sm text-gray-500">Your current feature access</p>
      </div>

      {/* Current Plan */}
      <Card className="border-2 border-blue-200 bg-blue-50/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-base">Current Feature Tier</CardTitle>
            </div>
            <Badge
              variant={subscription?.status === 'active' ? 'default' : 'destructive'}
              className="capitalize"
            >
              {subscription?.status ?? 'active'}
            </Badge>
          </div>
          <CardDescription>
            {subscription?.planName ?? 'Basic'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-gray-500">Tier</p>
              <p className="text-sm font-semibold capitalize">{currentTier}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">History Window</p>
              <p className="text-sm font-semibold">{subscription?.historyMonths ?? 3} months</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Expires</p>
              <p className="text-sm font-semibold">
                {subscription?.expiresAt
                  ? new Date(subscription.expiresAt).toLocaleDateString('en-KE')
                  : 'Ongoing'}
              </p>
            </div>
          </div>
          {subscription?.features && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2">Feature Access</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(subscription.features)
                  .filter(([, enabled]) => enabled)
                  .map(([key]) => (
                    <Badge key={key} variant="secondary" className="text-[10px] capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </Badge>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="pt-6 flex items-start gap-3">
          <Info className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
          <p className="text-xs text-gray-600">
            Your feature tier is inherited from the weighbridge operator(s) you weigh with, not a
            separate subscription you purchase here. If you need access to a higher tier, ask the
            weighbridge operator to upgrade their own TruLoad plan, or contact your account
            manager about billing arrangements.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
