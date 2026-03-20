'use client';

/**
 * Platform admin shell with modern responsive sidebar, TruLoad branding,
 * and mobile-friendly navigation. Superuser-only layout wrapper.
 */

import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import {
  Activity,
  Building2,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Shield,
  Users,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';

const navSections = [
  {
    title: 'Overview',
    items: [
      { href: '/platform/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Tenant Management',
    items: [
      { href: '/platform/tenants', label: 'Organisations', icon: Building2 },
      { href: '/platform/users', label: 'Users', icon: Users },
      { href: '/platform/roles', label: 'Roles & Permissions', icon: Shield },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/platform/system-config', label: 'System Config', icon: Settings },
      { href: '/platform/integrations', label: 'Integrations', icon: Activity },
      { href: '/platform/security', label: 'Security & Policy', icon: Shield },
      { href: '/platform/backups', label: 'Backup & Restore', icon: Database },
      { href: '/platform/audit-logs', label: 'Audit Logs', icon: FileText },
    ],
  },
];

interface PlatformShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Optional action buttons in the header */
  actions?: ReactNode;
}

export function PlatformShell({ title, subtitle, children, actions }: PlatformShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await logout();
    router.push('/auth/login');
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center border-b border-white/10 px-4">
        <Link href="/platform/dashboard" className="flex items-center gap-2 overflow-hidden">
          {sidebarOpen ? (
            <Image
              src="/truload-logo.svg"
              alt="TruLoad"
              width={160}
              height={40}
              className="h-10 w-auto object-contain"
              priority
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <span className="text-sm font-bold text-white">TL</span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            {sidebarOpen && (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-white/15 text-white shadow-sm'
                          : 'text-white/70 hover:bg-white/8 hover:text-white'
                      } ${!sidebarOpen ? 'justify-center' : ''}`}
                      title={!sidebarOpen ? item.label : undefined}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      {sidebarOpen && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User / collapse controls */}
      <div className="shrink-0 border-t border-white/10 p-3">
        {sidebarOpen && (
          <div className="mb-3 rounded-lg bg-white/5 px-3 py-2">
            <p className="truncate text-xs font-medium text-white/90">{user?.fullName || user?.email}</p>
            <p className="truncate text-[10px] text-white/50">Platform Administrator</p>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="flex-1 justify-start gap-2 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span className="text-xs">Sign out</span>}
          </Button>
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white"
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex shrink-0 flex-col transition-all duration-200 ${
          sidebarOpen ? 'w-60' : 'w-[68px]'
        }`}
        style={{ background: 'linear-gradient(180deg, #5B1C4D 0%, #3d1235 100%)' }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay - slide-in drawer like ordering-frontend */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside
            className="fixed inset-y-0 left-0 z-[101] flex w-80 max-w-[85vw] flex-col shadow-2xl transition-transform duration-300 ease-in-out animate-in slide-in-from-left lg:hidden"
            style={{ background: 'linear-gradient(180deg, #5B1C4D 0%, #3d1235 100%)' }}
            role="dialog"
            aria-modal="true"
            aria-label="Platform navigation"
          >
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 z-10 rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 bg-white/95 px-4 backdrop-blur-sm sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>
            {subtitle && <p className="text-xs text-gray-500 truncate hidden sm:block">{subtitle}</p>}
          </div>

          {actions}

          {/* Back to tenant link */}
          {user?.organizationCode && (
            <Link
              href={`/${user.organizationCode.toLowerCase()}/dashboard`}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Building2 className="h-3.5 w-3.5" />
              Tenant view
            </Link>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
