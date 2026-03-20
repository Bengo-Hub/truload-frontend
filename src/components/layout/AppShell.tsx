'use client';

/**
 * App shell layout with sidebar and topbar.
 * Includes notifications, user profile, org branding (logo/colour), and current station.
 */

import { UserProfileDropdown } from '@/components/auth/UserProfileDropdown';
import { CurrencySwitcher } from '@/components/common/CurrencySwitcher';
import NotificationsDialog from '@/components/notifications/NotificationsDialog';
import { Button } from '@/components/ui/button';
import { useStations } from '@/hooks/queries/useWeighingQueries';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import { fetchOrganizationByCode } from '@/lib/api/public';
import { getEffectiveStationId } from '@/lib/auth/token';
import { useAuthStore } from '@/stores/auth.store';
import { useQuery } from '@tanstack/react-query';
import { Bell, Copy, MapPin, Menu } from 'lucide-react';
import { useSystemVersion } from '@/hooks/queries/useTechnicalQueries';
import Image from 'next/image';
import { ReactNode, useState } from 'react';
import { AppSidebar } from './AppSidebar';

const LOGO_FALLBACK = '/truload-logo.svg';

interface AppShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function AppShell({ children, title, subtitle }: AppShellProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const orgSlug = useOrgSlug();
  const { data: systemVersion } = useSystemVersion();
  const user = useAuthStore((s) => s.user);
  const { data: org } = useQuery({
    queryKey: ['public-org', orgSlug],
    queryFn: () => fetchOrganizationByCode(orgSlug || ''),
    enabled: !!orgSlug,
    staleTime: 24 * 60 * 60 * 1000, // 24h — org branding rarely changes
    gcTime: 25 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
  const { data: stations = [] } = useStations();
  const effectiveStationId = getEffectiveStationId();
  const currentStation = effectiveStationId ? stations.find((s) => s.id === effectiveStationId) : null;
  const logoUrl = org?.logoUrl || LOGO_FALLBACK;
  const primaryColor = org?.primaryColor || '#5B1C4D';

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col overflow-x-hidden">
      <AppSidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 lg:pl-72">
        <header className="sticky top-0 z-20 shrink-0 border-b border-gray-200/80 bg-white/80 backdrop-blur-md">
          <div className="flex h-14 lg:h-16 items-center justify-between gap-2 px-3 sm:px-4 lg:px-6 min-w-0">
            {/* Left section: hamburger + logo (mobile) + page title + station */}
            <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1 overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-9 w-9 hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5 text-gray-600" />
              </Button>
              <Image
                src={logoUrl}
                alt={org?.name ?? 'Logo'}
                width={100}
                height={30}
                className="h-7 w-auto object-contain lg:hidden flex-shrink-0"
                unoptimized={!!org?.logoUrl?.startsWith('http')}
              />
              {title && (
                <div className="hidden sm:block w-px h-6 bg-gray-200 flex-shrink-0" />
              )}
              <div className="min-w-0 hidden sm:block">
                {title ? (
                  <div>
                    <h1 className="text-sm lg:text-base font-semibold text-gray-900 truncate leading-tight">{title}</h1>
                    <div className="flex items-center gap-1.5 truncate">
                      {subtitle && <p className="text-[11px] text-gray-400 truncate leading-tight">{subtitle}</p>}
                      {currentStation && (
                        <>
                          {subtitle && <span className="text-gray-300">·</span>}
                          <span className="flex items-center gap-1 text-[11px] text-gray-500" style={{ color: primaryColor }}>
                            <MapPin className="h-3 w-3 shrink-0" />
                            {currentStation.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Right section: notifications + profile */}
            <div className="flex items-center gap-1.5 lg:gap-2 flex-shrink-0">
              {/* Notification Bell */}
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 hover:bg-gray-100 rounded-full"
                onClick={() => setNotificationsOpen(true)}
              >
                <Bell className="h-[18px] w-[18px] text-gray-500" />
                <span className="absolute top-1 right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex items-center justify-center rounded-full h-4 w-4 bg-red-500 text-[10px] font-bold text-white leading-none">
                    2
                  </span>
                </span>
              </Button>

              {/* Currency Switcher */}
              <CurrencySwitcher />

              {/* Separator */}
              <div className="w-px h-7 bg-gray-200 mx-1 hidden sm:block" />

              {/* User Profile */}
              <UserProfileDropdown />
            </div>
          </div>
        </header>
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-4 sm:py-6 lg:py-8 lg:px-8">
          <div className="max-w-[1920px] mx-auto w-full min-w-0">{children}</div>
        </main>
        <footer className="shrink-0 border-t border-gray-200 bg-white px-6 py-3">
          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <p>© {new Date().getFullYear()} TruLoad. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                {systemVersion || process.env.NEXT_PUBLIC_APP_VERSION || 'v1.0.0'}
              </span>
            </div>
          </div>
        </footer>
      </div>
      <NotificationsDialog isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </div>
  );
}
