/**
 * Application sidebar aligned to Figma design.
 * Displays main menu items filtered by user permissions.
 * Supports desktop (fixed) and mobile (drawer overlay) modes.
 */

import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BookOpen,
  Clock4,
  Cog,
  CreditCard,
  Database,
  FolderOpen,
  Gavel,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  Shield,
  SlidersHorizontal,
  Users,
  Weight,
  Wrench,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';

import kuraWeighLogo from '@/../public/images/logos/kuraweigh-logo.png';

interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Permission codes - user needs at least one to see this item. Empty = always visible. */
  permissions: string[];
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const menuSections: MenuSection[] = [
  {
    title: 'Main Menu',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permissions: [] },
      { href: '/weighing', label: 'Weighing', icon: Weight, permissions: ['weighing.read', 'weighing.create'] },
      { href: '/cases', label: 'Case Register', icon: FolderOpen, permissions: ['case.read'] },
      { href: '/prosecution', label: 'Prosecution', icon: Gavel, permissions: ['prosecution.read'] },
      { href: '/reporting', label: 'Reporting', icon: BarChart3, permissions: ['analytics.read'] },
      { href: '/users', label: 'Users & Roles', icon: Users, permissions: ['user.read'] },
      { href: '/shifts', label: 'Shift Management', icon: Clock4, permissions: ['user.manage_shifts'] },
      { href: '/technical', label: 'Technical', icon: Wrench, permissions: ['config.read', 'station.manage_devices'] },
    ],
  },
  {
    title: 'Financial',
    items: [
      { href: '/financial/invoices', label: 'Invoices', icon: Receipt, permissions: ['invoice.read'] },
      { href: '/financial/receipts', label: 'Receipts', icon: CreditCard, permissions: ['receipt.read'] },
    ],
  },
  {
    title: 'Setup',
    items: [
      { href: '/setup/security', label: 'Security', icon: Shield, permissions: ['system.security_policy'] },
      { href: '/setup/axle-configurations', label: 'Axle Configurations', icon: Cog, permissions: ['config.manage_axle', 'config.read'] },
      { href: '/setup/weighing-metadata', label: 'Weighing Setup', icon: Database, permissions: ['config.read', 'weighing.create'] },
      { href: '/setup/acts', label: 'Acts & Compliance', icon: BookOpen, permissions: ['config.read'] },
      { href: '/setup/settings', label: 'Integrations', icon: Settings, permissions: ['config.read'] },
      { href: '/setup/system-config', label: 'System Config', icon: SlidersHorizontal, permissions: ['system.security_policy'] },
    ],
  },
];

interface AppSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AppSidebar({ mobileOpen = false, onMobileClose }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuthStore();

  // Close mobile sidebar on route change
  useEffect(() => {
    if (mobileOpen && onMobileClose) {
      onMobileClose();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Filter menu items based on user permissions
  const filteredSections = useMemo(() => {
    if (!user) return [];
    const userPerms = (user.permissions ?? []).map((p) => p.toLowerCase());
    const isSuperUser = user.isSuperUser === true;

    return menuSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          // No permissions required = always visible
          if (item.permissions.length === 0) return true;
          // Superuser sees everything
          if (isSuperUser) return true;
          // User needs at least one of the listed permissions
          return item.permissions.some((p) => userPerms.includes(p.toLowerCase()));
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [user]);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="border-b border-gray-200 px-6 py-5 flex items-center justify-between">
        <Image
          src={kuraWeighLogo}
          alt="KURAWeigh logo"
          width={200}
          height={64}
          className="h-12 w-auto object-contain"
        />
        {/* Close button - only visible on mobile */}
        {onMobileClose && (
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

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {filteredSections.map((section) => (
          <div key={section.title}>
            <div className="text-xs font-semibold uppercase text-gray-500 px-3 mb-3">
              {section.title}
            </div>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                        active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="border-t border-gray-200 px-4 py-4">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar - fixed, always visible on lg+ */}
      <aside className="hidden fixed top-0 left-0 z-30 h-screen w-72 flex-shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar - overlay drawer */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onMobileClose}
          />
          {/* Drawer */}
          <aside className="fixed top-0 left-0 z-50 h-screen w-[min(18rem,90vw)] flex flex-col border-r border-gray-200 bg-white lg:hidden animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
