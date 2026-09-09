import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types — shaped from subscriptions-api's REAL responses.
//
// Two different casing conventions exist WITHIN subscriptions-api itself
// (confirmed directly against its Go source, not assumed):
// - Plans module (`internal/modules/plans/repository.go`): camelCase, wrapped in the shared
//   `pagination.Response` envelope ({data, total, limit, page, hasMore}).
// - Tenant-subscription S2S lookup (`GET /tenants/{id}/subscription`, the same endpoint
//   auth-api's own client uses for JWT enrichment): snake_case, unwrapped.
// ============================================================================

export interface PlanFeature {
  id: string;
  planId: string;
  featureCode: string;
  isIncluded: boolean;
  limitValue?: number | null;
  overageUnitPrice: number;
}

export interface SubscriptionPlan {
  id: string;
  planCode: string;
  name: string;
  description?: string;
  billingCycle: 'MONTHLY' | 'ANNUAL' | string;
  basePrice: number;
  setupFee?: number;
  currency: string;
  isActive: boolean;
  isPublic: boolean;
  tierOrder: number;
  freeTrialDays: number;
  serviceTag?: string | null;
  useCase?: string | null;
  planType?: string;
  features: PlanFeature[];
}

export interface PlansResponse {
  data: SubscriptionPlan[];
  total: number;
  limit: number;
  page: number;
  hasMore: boolean;
}

/** Shape of GET /billing/subscription — subscriptions-api's tenant-subscription S2S lookup. */
export interface SubscriptionInfo {
  id?: string;
  tenant_id?: string;
  plan_code?: string;
  plan_name?: string;
  tier_order?: number;
  status?: string;
  trial_ends_at?: string | null;
  current_period_start?: string;
  current_period_end?: string;
  features?: string[];
  limits?: Record<string, number>;
  billing_cycle?: string;
  billing_mode?: string;
  plan_type?: string;
  is_perpetual?: boolean;
  allow_overage?: boolean;
}

export interface BillingInfo {
  hasSubscription: boolean;
  subscriptionId?: string;
  status?: string;
  planCode?: string;
  planName?: string;
  billingCycle?: string;
  amount?: number;
  currency?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  nextRenewalDate?: string;
  paymentMethod?: string;
  invoices?: BillingInvoice[];
}

export interface BillingInvoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  dueDate?: string;
  paidAt?: string;
}

// ============================================================================
// API functions — all routed through truload-backend proxy
// ============================================================================

export async function getBillingPlans(): Promise<PlansResponse> {
  const { data } = await apiClient.get<PlansResponse>('/billing/plans');
  return data;
}

/**
 * Current subscription for this org, resolved server-side via subscriptions-api S2S (not by
 * forwarding a truload-issued JWT, which subscriptions-api can never verify). Returns 404 (thrown)
 * when the org has no linked subscriptions-api tenant, or an empty object body when the tenant
 * exists but has no subscription yet - callers should treat a missing `status` as "no subscription."
 */
export async function getCurrentSubscription(): Promise<SubscriptionInfo> {
  const { data } = await apiClient.get<SubscriptionInfo>('/billing/subscription');
  return data;
}

/**
 * Payment method + invoice history. Still forwards the user's own JWT server-side, which
 * subscriptions-api's JWKS validator cannot verify for a truload-issued token - known broken,
 * always resolves to an empty/no-subscription shape today. Kept for the Billing History section,
 * which degrades gracefully (renders nothing) when this comes back empty.
 */
export async function getBillingInfo(): Promise<BillingInfo> {
  const { data } = await apiClient.get<BillingInfo>('/billing');
  return data;
}

export async function changePlan(planCode: string): Promise<SubscriptionInfo> {
  const { data } = await apiClient.put<SubscriptionInfo>('/billing/plan', { planCode });
  return data;
}
