'use client';

/**
 * BrandContext: Applies tenant brand colors as CSS custom properties.
 * Uses TanStack Query for caching (shares cache with AppShell) to prevent duplicate fetches.
 */

import { fetchOrganizationByCode } from '@/lib/api/public';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';

const TRULOAD_DEFAULTS = {
  primaryColor: '#5B1C4D',
  secondaryColor: '#ea8022',
  logoUrl: '/truload-logo.svg',
  name: 'TruLoad',
} as const;

interface BrandContextValue {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  orgName: string;
  isDefault: boolean;
}

const BrandContext = createContext<BrandContextValue>({
  primaryColor: TRULOAD_DEFAULTS.primaryColor,
  secondaryColor: TRULOAD_DEFAULTS.secondaryColor,
  logoUrl: TRULOAD_DEFAULTS.logoUrl,
  orgName: TRULOAD_DEFAULTS.name,
  isDefault: true,
});

export function useBrand() {
  return useContext(BrandContext);
}

function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '313 53% 23%';
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function BrandProvider({ children }: { children: ReactNode }) {
  const params = useParams();
  const orgSlug = typeof params?.orgSlug === 'string' ? params.orgSlug : '';

  // Use same query key as AppShell ('public-org') so they share the TanStack Query cache
  const { data: orgBrand } = useQuery({
    queryKey: ['public-org', orgSlug],
    queryFn: () => fetchOrganizationByCode(orgSlug),
    enabled: !!orgSlug,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 25 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });

  const value = useMemo<BrandContextValue>(() => {
    const primary = orgBrand?.primaryColor || TRULOAD_DEFAULTS.primaryColor;
    const secondary = orgBrand?.secondaryColor || TRULOAD_DEFAULTS.secondaryColor;
    const logo = orgBrand?.logoUrl || TRULOAD_DEFAULTS.logoUrl;
    const name = orgBrand?.name || TRULOAD_DEFAULTS.name;
    const isDefault = !orgBrand?.primaryColor;
    return { primaryColor: primary, secondaryColor: secondary, logoUrl: logo, orgName: name, isDefault };
  }, [orgBrand]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', value.primaryColor);
    root.style.setProperty('--brand-secondary', value.secondaryColor);
    root.style.setProperty('--brand-primary-hsl', hexToHsl(value.primaryColor));
    root.style.setProperty('--brand-secondary-hsl', hexToHsl(value.secondaryColor));
    return () => {
      root.style.removeProperty('--brand-primary');
      root.style.removeProperty('--brand-secondary');
      root.style.removeProperty('--brand-primary-hsl');
      root.style.removeProperty('--brand-secondary-hsl');
    };
  }, [value.primaryColor, value.secondaryColor]);

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}
