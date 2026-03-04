/**
 * Application sidebar aligned to Figma design.
 * Displays main menu items filtered by user permissions.
 * Supports desktop (fixed) and mobile (drawer overlay) modes.
 */

import { Button } from '@/components/ui/button';
import { getPostLogoutRedirectPath } from '@/lib/auth/lastLoginStation';
import { useOrgSlug } from '@/hooks/useOrgSlug';
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
  LayoutList,
  LogOut,
  Receipt,
  Settings,
  Shield,
  ShieldAlert,
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
  /** Module key for tenant-based visibility; must be in user.enabledModules (or all if superuser / no list). */
  moduleKey: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const menuSections: MenuSection[] = [
  {
    title: 'Main Menu',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permissions: [], moduleKey: 'dashboard' },
      { href: '/weighing', label: 'Weighing', icon: Weight, permissions: ['weighing.read', 'weighing.create'], moduleKey: 'weighing' },
      { href: '/cases', label: 'Case Register', icon: FolderOpen, permissions: ['case.read'], moduleKey: 'cases' },
      { href: '/case-management', label: 'Case management', icon: LayoutList, permissions: ['case.read'], moduleKey: 'case_management' },
      { href: '/cases/special-releases', label: 'Special releases', icon: ShieldAlert, permissions: ['case.special_release'], moduleKey: 'special_releases' },
      { href: '/prosecution', label: 'Prosecution', icon: Gavel, permissions: ['prosecution.read'], moduleKey: 'prosecution' },
      { href: '/reporting', label: 'Reporting', icon: BarChart3, permissions: ['analytics.read'], moduleKey: 'reporting' },
      { href: '/users', label: 'Users & Roles', icon: Users, permissions: ['user.read'], moduleKey: 'users' },
      { href: '/shifts', label: 'Shift Management', icon: Clock4, permissions: ['user.manage_shifts'], moduleKey: 'shifts' },
      { href: '/technical', label: 'Technical', icon: Wrench, permissions: ['config.read', 'station.manage_devices'], moduleKey: 'technical' },
    ],
  },
  {
    title: 'Financial',
    items: [
      { href: '/financial/invoices', label: 'Invoices', icon: Receipt, permissions: ['invoice.read'], moduleKey: 'financial_invoices' },
      { href: '/financial/receipts', label: 'Receipts', icon: CreditCard, permissions: ['receipt.read'], moduleKey: 'financial_receipts' },
    ],
  },
  {
    title: 'Setup',
    items: [
      { href: '/setup/security', label: 'Security', icon: Shield, permissions: ['system.security_policy'], moduleKey: 'setup_security' },
      { href: '/setup/axle-configurations', label: 'Axle Configurations', icon: Cog, permissions: ['config.manage_axle', 'config.read'], moduleKey: 'setup_axle' },
      { href: '/setup/weighing-metadata', label: 'Weighing Setup', icon: Database, permissions: ['config.read', 'weighing.create'], moduleKey: 'setup_weighing_metadata' },
      { href: '/setup/acts', label: 'Acts & Compliance', icon: BookOpen, permissions: ['config.read'], moduleKey: 'setup_acts' },
      { href: '/setup/settings', label: 'Integrations', icon: Settings, permissions: ['config.read'], moduleKey: 'setup_settings' },
      { href: '/setup/system-config', label: 'System Config', icon: SlidersHorizontal, permissions: ['system.security_policy'], moduleKey: 'setup_system_config' },
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
  const orgSlug = useOrgSlug();
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
      router.push(getPostLogoutRedirectPath(orgSlug));
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Filter menu items by permissions and tenant-enabled modules
  const filteredSections = useMemo(() => {
    if (!user) return [];
    const userPerms = (user.permissions ?? []).map((p) => p.toLowerCase());
    const isSuperUser = user.isSuperUser === true;
    const enabledModules = user.enabledModules ?? [];
    const hasModuleFilter = enabledModules.length > 0;

    return menuSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          // Tenant module filter: if org has enabledModules and user is not superuser, hide items whose moduleKey is not enabled
          if (hasModuleFilter && !isSuperUser && !enabledModules.includes(item.moduleKey)) return false;
          // No permissions required = always visible (subject to module filter above)
          if (item.permissions.length === 0) return true;
          // Superuser sees everything (module filter already passed)
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
                const href = `/${orgSlug}${item.href}`;
                const active = pathname === href || pathname.startsWith(href + '/');
                return (
                  <li key={href}>
                    <Link
                      href={href}
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

      {/* Platform admin (superuser only) */}
      {user?.isSuperUser && (
        <div className="border-t border-gray-200 px-4 py-2">
          <Link
            href="/platform"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <Shield className="h-5 w-5" />
            Platform admin
          </Link>
        </div>
      )}

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
