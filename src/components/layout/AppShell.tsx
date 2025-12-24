/**
 * App shell layout with sidebar and topbar.
 * Includes notifications and user profile.
 */

import { UserProfileDropdown } from '@/components/auth/UserProfileDropdown';
import NotificationsDialog from '@/components/notifications/NotificationsDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import Image from 'next/image';
import { ReactNode, useState } from 'react';
import { AppSidebar } from './AppSidebar';

const LOGO_COMPACT = '/public/images/logos/kuraweigh-logo.png';

interface AppShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function AppShell({ children, title, subtitle }: AppShellProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar />
      <div className="flex flex-col lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
          <div className="flex h-16 items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <Image
                src={LOGO_COMPACT}
                alt="KURAWeigh compact logo"
                width={120}
                height={36}
                className="h-8 w-auto object-contain lg:hidden"
              />
              <div className="flex-1 min-w-0">
                {title ? (
                  <>
                    <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>
                    {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
                  </>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setNotificationsOpen(true)}
              >
                <Bell className="h-5 w-5 text-gray-600" />
                <Badge className="absolute -right-1 -top-1 bg-red-500 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  2
                </Badge>
              </Button>
              <UserProfileDropdown />
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 lg:py-8 lg:px-8 overflow-y-auto">{children}</main>
      </div>
      <NotificationsDialog isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </div>
  );
}
