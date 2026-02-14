/**
 * App shell layout with sidebar and topbar.
 * Includes notifications, user profile, and mobile menu toggle.
 */

import { UserProfileDropdown } from '@/components/auth/UserProfileDropdown';
import NotificationsDialog from '@/components/notifications/NotificationsDialog';
import { Button } from '@/components/ui/button';
import { Bell, Menu } from 'lucide-react';
import Image from 'next/image';
import { ReactNode, useState } from 'react';
import { AppSidebar } from './AppSidebar';

const LOGO_COMPACT = '/images/logos/kuraweigh-logo.png';

interface AppShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function AppShell({ children, title, subtitle }: AppShellProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
      <div className="flex flex-col lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-gray-200/80 bg-white/80 backdrop-blur-md">
          <div className="flex h-14 lg:h-16 items-center justify-between px-4 lg:px-6">
            {/* Left section: hamburger + logo (mobile) + page title */}
            <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
              {/* Hamburger menu - visible on mobile/tablet */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-9 w-9 hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5 text-gray-600" />
              </Button>
              <Image
                src={LOGO_COMPACT}
                alt="KURAWeigh compact logo"
                width={100}
                height={30}
                className="h-7 w-auto object-contain lg:hidden flex-shrink-0"
              />
              {/* Separator on mobile when both logo and title show */}
              {title && (
                <div className="hidden sm:block w-px h-6 bg-gray-200 flex-shrink-0" />
              )}
              <div className="min-w-0 hidden sm:block">
                {title ? (
                  <div>
                    <h1 className="text-sm lg:text-base font-semibold text-gray-900 truncate leading-tight">{title}</h1>
                    {subtitle && <p className="text-[11px] text-gray-400 truncate leading-tight">{subtitle}</p>}
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

              {/* Separator */}
              <div className="w-px h-7 bg-gray-200 mx-1 hidden sm:block" />

              {/* User Profile */}
              <UserProfileDropdown />
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 lg:py-8 lg:px-8 overflow-y-auto">
          <div className="max-w-[1920px] mx-auto">{children}</div>
        </main>
      </div>
      <NotificationsDialog isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </div>
  );
}
