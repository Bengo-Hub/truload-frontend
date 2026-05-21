'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { fetchSubscriptionInfo } from '@/lib/auth/subscription';
import { useSubscriptionStore } from '@/stores/subscription.store';
import type { SubscriptionInfo } from '@/lib/auth/subscription';

export function useSubscription() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const store = useSubscriptionStore();
  const fetchedRef = useRef(false);

  const tenantId = user?.organizationId ?? null;
  const tenantSlug = user?.organizationCode ?? null;
  // Commercial tenants have paid subscriptions; enforcement orgs are free
  const isCommercialTenant = user?.isCommercialTenant ?? false;
  const isPlatformOwner = user?.organizationCode?.toUpperCase() === 'CODEVERTEX';

  // Hydrate from IndexedDB on auth for offline gating
  useEffect(() => {
    if (!isAuthenticated || !tenantSlug) return;
    useSubscriptionStore.getState().loadFromIDB(tenantSlug);
  }, [isAuthenticated, tenantSlug]);

  // Fetch from API once per session
  useEffect(() => {
    if (!isAuthenticated || !tenantId || !tenantSlug || fetchedRef.current) return;
    if (isPlatformOwner || !isCommercialTenant) {
      useSubscriptionStore.getState().setFromRaw(
        { plan: 'ENTERPRISE', status: 'ACTIVE', features: [], limits: {} }, tenantSlug,
      );
      fetchedRef.current = true;
      return;
    }
    fetchedRef.current = true;
    fetchSubscriptionInfo(tenantId)
      .then((info) => {
        if (!info) return;
        useSubscriptionStore.getState().setFromRaw(
          {
            plan: info.planCode || null,
            status: info.status || null,
            expiresAt: info.currentPeriodEnd ?? info.trialEndsAt ?? null,
            features: info.features,
            limits: info.limits,
          },
          tenantSlug,
        );
      })
      .catch(() => {});
  }, [isAuthenticated, tenantId, tenantSlug, isPlatformOwner, isCommercialTenant]);

  // Re-fetch when tab becomes visible (user returned from renewal tab)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && tenantId && tenantSlug && isCommercialTenant && !isPlatformOwner) {
        fetchedRef.current = false; // allow re-fetch
        fetchSubscriptionInfo(tenantId)
          .then((info) => {
            if (!info || !tenantSlug) return;
            useSubscriptionStore.getState().setFromRaw(
              {
                plan: info.planCode || null,
                status: info.status || null,
                expiresAt: info.currentPeriodEnd ?? info.trialEndsAt ?? null,
                features: info.features,
                limits: info.limits,
              },
              tenantSlug,
            );
          })
          .catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [tenantId, tenantSlug, isCommercialTenant, isPlatformOwner]);

  const subStatus = store.status?.toLowerCase() ?? null;

  return {
    store,
    status: subStatus,
    plan: store.plan,
    isActive: subStatus === 'active' || subStatus === 'trial',
    isPastDue: subStatus === 'suspended',
    isExpired: store.isExpired,
    isInGracePeriod: store.isInGracePeriod,
    needsSubscription: subStatus === 'none' && isCommercialTenant,
    isLoading: !store.hydrated,
    isPlatformOwner,
    isCommercialTenant,
    hasFeature: (code: string) => store.features.includes(code),
    getLimit: (key: string) => (store.limits[key] ?? Infinity) as number,
    daysUntilExpiry: store.daysUntilExpiry,
    gracePeriodEndsAt: store.gracePeriodEndsAt,
  };
}
