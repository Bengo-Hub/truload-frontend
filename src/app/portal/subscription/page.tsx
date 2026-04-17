/**
 * Portal Subscription Page
 *
 * Current plan status, feature comparison, upgrade CTAs.
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePortalSubscription } from '@/hooks/queries/usePortalQueries';
import type { SubscriptionTier } from '@/types/portal';
import { Check, CreditCard, Star, X } from 'lucide-react';

interface PlanFeature {
  name: string;
  basic: boolean | string;
  standard: boolean | string;
  premium: boolean | string;
}

const PLAN_FEATURES: PlanFeature[] = [
  { name: 'View weighing history', basic: true, standard: true, premium: true },
  { name: 'Download weight tickets (PDF)', basic: true, standard: true, premium: true },
  { name: 'Vehicle fleet management', basic: 'Up to 10', standard: 'Up to 50', premium: 'Unlimited' },
  { name: 'Driver management', basic: 'Up to 5', standard: 'Up to 25', premium: 'Unlimited' },
  { name: 'Basic reports', basic: true, standard: true, premium: true },
  { name: 'Driver trip reports', basic: false, standard: true, premium: true },
  { name: 'Cargo analysis reports', basic: false, standard: true, premium: true },
  { name: 'Fleet utilization reports', basic: false, standard: false, premium: true },
  { name: 'Weight discrepancy alerts', basic: false, standard: false, premium: true },
  { name: 'API access', basic: false, standard: false, premium: true },
  { name: 'Priority support', basic: false, standard: true, premium: true },
  { name: 'Custom branding', basic: false, standard: false, premium: true },
];

const PLAN_PRICES: Record<SubscriptionTier, string> = {
  basic: 'Free',
  standard: 'KES 5,000/mo',
  premium: 'KES 15,000/mo',
};

function FeatureCheck({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="h-4 w-4 text-green-600 mx-auto" />;
  if (value === false) return <X className="h-4 w-4 text-gray-300 mx-auto" />;
  return <span className="text-xs text-gray-700">{value}</span>;
}

export default function PortalSubscriptionPage() {
  const { data: subscription, isLoading } = usePortalSubscription();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Subscription</h2>
          <p className="text-sm text-gray-500">Manage your portal subscription</p>
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
        <p className="text-sm text-gray-500">Manage your portal subscription</p>
      </div>

      {/* Current Plan */}
      <Card className="border-2 border-blue-200 bg-blue-50/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-base">Current Plan</CardTitle>
            </div>
            <Badge
              variant={subscription?.status === 'active' ? 'default' : 'destructive'}
              className="capitalize"
            >
              {subscription?.status ?? 'active'}
            </Badge>
          </div>
          <CardDescription>
            {subscription?.planName ?? 'Basic Plan'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-gray-500">Plan</p>
              <p className="text-sm font-semibold capitalize">{currentTier}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Price</p>
              <p className="text-sm font-semibold">{PLAN_PRICES[currentTier]}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Start Date</p>
              <p className="text-sm font-semibold">
                {subscription?.startDate
                  ? new Date(subscription.startDate).toLocaleDateString('en-KE')
                  : '--'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">End Date</p>
              <p className="text-sm font-semibold">
                {subscription?.endDate
                  ? new Date(subscription.endDate).toLocaleDateString('en-KE')
                  : 'Ongoing'}
              </p>
            </div>
          </div>
          {subscription?.features && subscription.features.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2">Included Features</p>
              <div className="flex flex-wrap gap-1.5">
                {subscription.features.map((f) => (
                  <Badge key={f} variant="secondary" className="text-[10px]">
                    {f}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            Plan Comparison
          </CardTitle>
          <CardDescription>Choose the plan that fits your needs</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Feature</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">
                  <div>Basic</div>
                  <div className="text-xs font-normal text-gray-500">{PLAN_PRICES.basic}</div>
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">
                  <div>Standard</div>
                  <div className="text-xs font-normal text-gray-500">{PLAN_PRICES.standard}</div>
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">
                  <div>Premium</div>
                  <div className="text-xs font-normal text-gray-500">{PLAN_PRICES.premium}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {PLAN_FEATURES.map((feature) => (
                <tr key={feature.name} className="border-b border-gray-100">
                  <td className="py-2.5 px-4 text-gray-700">{feature.name}</td>
                  <td className="py-2.5 px-4 text-center">
                    <FeatureCheck value={feature.basic} />
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <FeatureCheck value={feature.standard} />
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <FeatureCheck value={feature.premium} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Upgrade CTAs */}
      {currentTier !== 'premium' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {currentTier === 'basic' && (
            <Card className="border-2 border-emerald-200">
              <CardHeader>
                <CardTitle className="text-sm">Upgrade to Standard</CardTitle>
                <CardDescription>
                  Get driver reports, cargo analysis, and priority support
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                  Upgrade - {PLAN_PRICES.standard}
                </Button>
              </CardContent>
            </Card>
          )}
          <Card className="border-2 border-amber-200">
            <CardHeader>
              <CardTitle className="text-sm">Upgrade to Premium</CardTitle>
              <CardDescription>
                Full access: unlimited vehicles, fleet utilization, API access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-amber-600 hover:bg-amber-700">
                Upgrade - {PLAN_PRICES.premium}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
