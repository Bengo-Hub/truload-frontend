/**
 * Portal Shell Layout
 *
 * Separate layout for the Transporter Portal.
 * Does NOT use the org sidebar. Has its own transporter-focused navigation.
 * No org switcher -- portal is cross-tenant.
 */

'use client';

import { Button } from '@/components/ui/button';
import { UserProfileDropdown } from '@/components/auth/UserProfileDropdown';
import { usePortalAuth } from '@/hooks/usePortalAuth';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Scale,
  Truck,
  Users,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';

interface PortalMenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const portalMenuItems: PortalMenuItem[] = [
  { href: '/portal/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portal/weighings', label: 'Weighings', icon: Scale },
  { href: '/portal/vehicles', label: 'Vehicles', icon: Truck },
  { href: '/portal/drivers', label: 'Drivers', icon: Users },
  { href: '/portal/reports', label: 'Reports', icon: BarChart3 },
  { href: '/portal/subscription', label: 'Subscription', icon: CreditCard },
];

function PortalSidebar({
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="border-b border-gray-200 px-6 py-5 flex items-center justify-between">
        <Link href="/portal/dashboard" className="flex items-center gap-2">
          <Image
            src="/truload-logo.svg"
            alt="TruLoad Portal"
            width={160}
            height={48}
            className="h-10 w-auto object-contain"
          />
        </Link>
        {mobileOpen && (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8"
            onClick={onMobileClose}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Portal Badge */}
      <div className="px-6 py-3 border-b border-gray-100">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
          Transporter Portal
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {portalMenuItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => {
                if (mobileOpen) onMobileClose();
              }}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-200 px-4 py-4">
        <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden fixed top-0 left-0 z-30 h-screen w-72 flex-shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onMobileClose}
          />
          <aside className="fixed top-0 left-0 z-50 h-screen w-[min(18rem,90vw)] flex flex-col border-r border-gray-200 bg-white lg:hidden animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}

export default function PortalLayout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, isLoading, transporterName } = usePortalAuth();
  const pathname = usePathname();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-gray-600">Loading portal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col overflow-x-hidden">
      <PortalSidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex flex-col flex-1 min-w-0 lg:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-20 shrink-0 border-b border-gray-200/80 bg-white/80 backdrop-blur-md">
          <div className="flex h-14 lg:h-16 items-center justify-between gap-2 px-3 sm:px-4 lg:px-6 min-w-0">
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
                src="/truload-logo.svg"
                alt="TruLoad"
                width={100}
                height={30}
                className="h-7 w-auto object-contain lg:hidden flex-shrink-0"
              />
              <div className="hidden sm:block w-px h-6 bg-gray-200 flex-shrink-0" />
              <div className="min-w-0 hidden sm:block">
                <h1 className="text-sm lg:text-base font-semibold text-gray-900 truncate leading-tight">
                  {transporterName}
                </h1>
                <p className="text-[11px] text-gray-400 truncate leading-tight">
                  Transporter Portal
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 lg:gap-2 flex-shrink-0">
              <UserProfileDropdown />
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-4 sm:py-6 lg:py-8 lg:px-8">
          <div className="max-w-[1920px] mx-auto w-full min-w-0">{children}</div>
        </main>

        {/* Footer */}
        <footer className="shrink-0 border-t border-gray-200 bg-white px-6 py-3">
          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <p>&copy; {new Date().getFullYear()} TruLoad. All rights reserved.</p>
            <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
              Portal
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
