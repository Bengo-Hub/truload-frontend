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
  changePlan,
  type BillingInfo,
  type SubscriptionInfo,
  type SubscriptionPlan,
} from '@/lib/api/billing';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowUpCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  CreditCard,
  Loader2,
  Package,
  RefreshCcw,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { format, parseISO, differenceInDays } from 'date-fns';

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
  onSelect,
  isChanging,
}: {
  plan: SubscriptionPlan;
  currentPlanCode?: string;
  onSelect: (code: string) => void;
  isChanging: boolean;
}) {
  const isCurrent = plan.plan_code === currentPlanCode;
  const isMonthly = plan.billing_cycle === 'MONTHLY';

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
          <span className="text-2xl font-bold">{formatCurrency(plan.base_price, plan.currency)}</span>
          <span className="text-sm text-gray-500 ml-1">/{isMonthly ? 'mo' : 'yr'}</span>
        </div>
      </CardHeader>

      {plan.features && plan.features.length > 0 && (
        <CardContent className="pt-0 pb-3">
          <ul className="space-y-1">
            {plan.features.slice(0, 6).map((f) => (
              <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                <Check className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                {f.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
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
          <Button
            className="w-full"
            variant={plan.base_price > 0 ? 'default' : 'outline'}
            onClick={() => onSelect(plan.plan_code)}
            disabled={isChanging}
          >
            {isChanging ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Switching...</>
            ) : (
              <><ArrowUpCircle className="h-4 w-4 mr-2" />Select Plan</>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function BillingPage() {
  const queryClient = useQueryClient();
  const [confirmPlanCode, setConfirmPlanCode] = useState<string | null>(null);

  const { data: subscription, isLoading: subLoading } = useQuery<SubscriptionInfo>({
    queryKey: ['billing', 'subscription'],
    queryFn: getCurrentSubscription,
  });

  const { data: billing, isLoading: billingLoading } = useQuery<BillingInfo>({
    queryKey: ['billing', 'info'],
    queryFn: getBillingInfo,
  });

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: getBillingPlans,
  });

  const changePlanMutation = useMutation({
    mutationFn: (planCode: string) => changePlan(planCode),
    onSuccess: () => {
      toast.success('Plan changed successfully');
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      setConfirmPlanCode(null);
    },
    onError: () => {
      toast.error('Failed to change plan. Please try again.');
    },
  });

  const renewalDays = daysUntil(subscription?.expires_at ?? billing?.nextRenewalDate);
  const isExpiringSoon = renewalDays !== null && renewalDays <= 14 && renewalDays >= 0;
  const isExpired = renewalDays !== null && renewalDays < 0;

  const plans: SubscriptionPlan[] = plansData?.plans ?? [];
  const currentPlanCode = subscription?.plan_code ?? billing?.planCode;

  return (
    <ProtectedRoute requiredPermissions={['invoice.read']}>
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
              ) : !billing?.hasSubscription ? (
                <div className="text-center py-6">
                  <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No active subscription. Select a plan below to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Plan</p>
                    <p className="font-semibold text-sm">{billing.planName ?? subscription?.plan_name ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    {statusBadge(billing.status ?? subscription?.status)}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Billing</p>
                    <p className="text-sm">{formatCurrency(billing.amount, billing.currency)}/{billing.billingCycle === 'MONTHLY' ? 'mo' : 'yr'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Renewal Date</p>
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                      <p className="text-sm">{formatDate(billing.nextRenewalDate ?? subscription?.expires_at)}</p>
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
                <p className="text-sm text-gray-500">Upgrade, downgrade, or switch billing cycle at any time.</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['billing', 'plans'] })}
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Refresh
              </Button>
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
                    key={plan.id ?? plan.plan_code}
                    plan={plan}
                    currentPlanCode={currentPlanCode}
                    onSelect={(code) => setConfirmPlanCode(code)}
                    isChanging={changePlanMutation.isPending && confirmPlanCode === plan.plan_code}
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

        {/* Plan change confirmation dialog */}
        {confirmPlanCode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-sm mx-4">
              <CardHeader>
                <CardTitle>Confirm Plan Change</CardTitle>
                <CardDescription>
                  Switch to <strong>{plans.find((p) => p.plan_code === confirmPlanCode)?.name ?? confirmPlanCode}</strong>?
                  This takes effect immediately.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setConfirmPlanCode(null)}
                  disabled={changePlanMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => changePlanMutation.mutate(confirmPlanCode)}
                  disabled={changePlanMutation.isPending}
                >
                  {changePlanMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Switching...</>
                  ) : 'Confirm'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
