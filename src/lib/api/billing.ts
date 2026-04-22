import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types — shaped from subscriptions-api responses
// ============================================================================

export interface SubscriptionPlan {
  id: string;
  plan_code: string;
  name: string;
  description?: string;
  billing_cycle: 'MONTHLY' | 'ANNUAL' | string;
  base_price: number;
  currency: string;
  is_active: boolean;
  features?: string[];
}

export interface PlansResponse {
  plans: SubscriptionPlan[];
  count: number;
}

export interface SubscriptionInfo {
  hasSubscription: boolean;
  status?: string;
  plan_name?: string;
  plan_code?: string;
  billing_cycle?: string;
  expires_at?: string;
  current_period_start?: string;
  current_period_end?: string;
  features?: string[];
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

export async function getCurrentSubscription(): Promise<SubscriptionInfo> {
  const { data } = await apiClient.get<SubscriptionInfo>('/billing/subscription');
  return data;
}

export async function getBillingInfo(): Promise<BillingInfo> {
  const { data } = await apiClient.get<BillingInfo>('/billing');
  return data;
}

export async function changePlan(planCode: string): Promise<SubscriptionInfo> {
  const { data } = await apiClient.put<SubscriptionInfo>('/billing/plan', { planCode });
  return data;
}
