/**
 * App shell layout with sidebar and topbar.
 */

import { UserProfileDropdown } from '@/components/auth/UserProfileDropdown';
import Image from 'next/image';
import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';

const LOGO_COMPACT = '/images/logos/kuraweigh-logo.png';

interface AppShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function AppShell({ children, title, subtitle }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <Image
                src={LOGO_COMPACT}
                alt="KURAWeigh compact logo"
                width={120}
                height={36}
                className="h-8 w-auto object-contain lg:hidden"
              />
              <div>
                {title ? (
                  <>
                    <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
                    {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
                  </>
                ) : null}
              </div>
            </div>
            <UserProfileDropdown />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
