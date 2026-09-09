'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getBillingInfo,
  getBillingPlans,
  getCurrentSubscription,
  type BillingInfo,
  type SubscriptionInfo,
  type SubscriptionPlan,
} from '@/lib/api/billing';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowUpCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Package,
  RefreshCcw,
  Zap,
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';

// Self-service plan switching goes through the platform's centralized pricing/subscriptions-ui
// flow, matching pos-ui/inventory-ui's existing pattern - truload-backend issues its own
// symmetric HS256 JWTs (see truload-subscription-uniform-integration.md), which subscriptions-api's
// JWKS-based validator can never verify, so an in-app self-service switch has no real
// tenant-scoped credential to authenticate with. This page still shows the real plan catalog and
// current subscription (both fixed to use subscriptions-api's actual data), just not an in-app
// switch action.
const SUBSCRIPTIONS_UI_URL =
  process.env.NEXT_PUBLIC_SUBSCRIPTIONS_UI_URL || 'https://pricing.codevertexafrica.com';
const UPGRADE_URL = `${SUBSCRIPTIONS_UI_URL}/plans?service=truload`;

// ─── Helpers ────────────────────────────────────────────────────────────────

function statusBadge(status?: string) {
  const s = (status ?? '').toUpperCase();
  if (s === 'ACTIVE') return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
  if (s === 'TRIAL') return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Trial</Badge>;
  if (s === 'EXPIRED') return <Badge variant="destructive">Expired</Badge>;
  if (s === 'CANCELLED') return <Badge variant="secondary">Cancelled</Badge>;
  return <Badge variant="outline">{status ?? 'None'}</Badge>;
}

function formatCurrency(amount?: number, currency?: string) {
  if (!amount) return '—';
  return `${currency ?? 'KES'} ${amount.toLocaleString()}`;
}

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd MMM yyyy'); } catch { return d; }
}

function daysUntil(d?: string): number | null {
  if (!d) return null;
  try { return differenceInDays(parseISO(d), new Date()); } catch { return null; }
}

// ─── Plan Card ───────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  currentPlanCode,
}: {
  plan: SubscriptionPlan;
  currentPlanCode?: string;
}) {
  const isCurrent = plan.planCode === currentPlanCode;
  const isMonthly = plan.billingCycle === 'MONTHLY';
  const includedFeatures = plan.features.filter((f) => f.isIncluded);

  return (
    <Card className={`relative ${isCurrent ? 'ring-2 ring-emerald-500 shadow-md' : 'hover:shadow-md transition-shadow'}`}>
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-emerald-500 text-white px-3">Current Plan</Badge>
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{plan.name}</CardTitle>
            {plan.description && (
              <CardDescription className="mt-1 text-xs">{plan.description}</CardDescription>
            )}
          </div>
          <Package className="h-5 w-5 text-gray-400 mt-1" />
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold">{formatCurrency(plan.basePrice, plan.currency)}</span>
          <span className="text-sm text-gray-500 ml-1">/{isMonthly ? 'mo' : 'yr'}</span>
        </div>
      </CardHeader>

      {includedFeatures.length > 0 && (
        <CardContent className="pt-0 pb-3">
          <ul className="space-y-1">
            {includedFeatures.slice(0, 6).map((f) => (
              <li key={f.id} className="flex items-center gap-2 text-xs text-gray-600">
                <Check className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                {f.featureCode.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </li>
            ))}
          </ul>
        </CardContent>
      )}

      <CardContent className="pt-0">
        {isCurrent ? (
          <Button variant="outline" className="w-full" disabled>
            <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
            Current Plan
          </Button>
        ) : (
          <Button className="w-full" variant={plan.basePrice > 0 ? 'default' : 'outline'} asChild>
            <a href={`${UPGRADE_URL}&plan=${encodeURIComponent(plan.planCode)}`} target="_blank" rel="noopener noreferrer">
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              Select Plan
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function BillingPage() {
  const queryClient = useQueryClient();

  const { data: subscription, isLoading: subLoading } = useQuery<SubscriptionInfo>({
    queryKey: ['billing', 'subscription'],
    queryFn: getCurrentSubscription,
    retry: false,
  });

  const { data: billing, isLoading: billingLoading } = useQuery<BillingInfo>({
    queryKey: ['billing', 'info'],
    queryFn: getBillingInfo,
    retry: false,
  });

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: getBillingPlans,
    retry: false,
  });

  const hasSubscription = !!subscription?.status && subscription.status !== 'NONE';
  const renewalDate = subscription?.status === 'TRIAL'
    ? subscription?.trial_ends_at ?? undefined
    : subscription?.current_period_end ?? billing?.nextRenewalDate;
  const renewalDays = daysUntil(renewalDate);
  const isExpiringSoon = renewalDays !== null && renewalDays <= 14 && renewalDays >= 0;
  const isExpired = subscription?.status === 'EXPIRED' || (renewalDays !== null && renewalDays < 0);

  const plans: SubscriptionPlan[] = plansData?.data ?? [];
  const currentPlanCode = subscription?.plan_code ?? billing?.planCode;
  const currentPlan = plans.find((p) => p.planCode === currentPlanCode);

  return (
    <ProtectedRoute moduleKey="billing">
      <AppShell
        title="Billing & Subscription"
        subtitle="Manage your TruLoad subscription plan, view billing details, and update your plan."
      >
        <div className="space-y-6">

          {/* Expiry / renewal alert */}
          {(isExpiringSoon || isExpired) && (
            <div className={`rounded-lg border p-4 flex items-start gap-3 ${isExpired ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
              <AlertCircle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${isExpired ? 'text-red-500' : 'text-amber-500'}`} />
              <div>
                <p className={`font-medium text-sm ${isExpired ? 'text-red-800' : 'text-amber-800'}`}>
                  {isExpired ? 'Subscription Expired' : `Subscription expires in ${renewalDays} day${renewalDays === 1 ? '' : 's'}`}
                </p>
                <p className={`text-xs mt-1 ${isExpired ? 'text-red-600' : 'text-amber-600'}`}>
                  {isExpired
                    ? 'Your access is limited. Select a plan below to renew.'
                    : 'Renew your subscription to avoid service interruption.'}
                </p>
              </div>
            </div>
          )}

          {/* Current subscription overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-emerald-500" />
                Current Subscription
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subLoading || billingLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ) : !hasSubscription ? (
                <div className="text-center py-6">
                  <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No active subscription. Select a plan below to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Plan</p>
                    <p className="font-semibold text-sm">{subscription?.plan_name ?? billing?.planName ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    {statusBadge(subscription?.status ?? billing?.status)}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Billing</p>
                    <p className="text-sm">
                      {formatCurrency(currentPlan?.basePrice ?? billing?.amount, currentPlan?.currency ?? billing?.currency)}
                      /{(subscription?.billing_cycle ?? billing?.billingCycle) === 'MONTHLY' ? 'mo' : 'yr'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      {subscription?.status === 'TRIAL' ? 'Trial Ends' : 'Renewal Date'}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                      <p className="text-sm">{formatDate(renewalDate)}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available plans */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold">Available Plans</h2>
                <p className="text-sm text-gray-500">
                  Select Plan opens the billing portal to upgrade, downgrade, or switch billing cycle.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['billing', 'plans'] })}
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <a href={UPGRADE_URL} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Billing Portal
                  </a>
                </Button>
              </div>
            </div>

            {plansLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
                    <CardContent><Skeleton className="h-20 w-full" /></CardContent>
                  </Card>
                ))}
              </div>
            ) : plans.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-gray-500">
                  No plans available at this time.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-3">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    currentPlanCode={currentPlanCode}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Billing history placeholder */}
          {billing?.invoices && billing.invoices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-5 w-5" />
                  Billing History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {billing.invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                      <div className="flex items-center gap-3">
                        <Badge variant={inv.status === 'paid' ? 'secondary' : 'outline'}>
                          {inv.status}
                        </Badge>
                        <span className="text-gray-600">{formatDate(inv.dueDate)}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(inv.amount, inv.currency)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
