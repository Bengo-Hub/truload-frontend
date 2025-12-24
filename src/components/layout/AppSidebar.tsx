/**
 * Application sidebar aligned to Figma design.
 * Displays main menu and user logout button.
 */

import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import {
  BarChart3,
  Briefcase,
  Clock4,
  Cog,
  FolderOpen,
  Gavel,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  Users,
  Weight,
  Wrench,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import kuraWeighLogo from '@/../public/images/logos/kuraweigh-logo.png';

const menuSections = [
  {
    title: 'Main Menu',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/weighing', label: 'Weighing', icon: Weight },
      { href: '/case-register', label: 'Case Register', icon: FolderOpen },
      { href: '/prosecution', label: 'Prosecution', icon: Gavel },
      { href: '/cases', label: 'Case Management', icon: Briefcase },
      { href: '/reporting', label: 'Reporting', icon: BarChart3 },
      { href: '/users', label: 'Users & Roles', icon: Users },
      { href: '/shifts', label: 'Shift Management', icon: Clock4 },
      { href: '/technical', label: 'Technical', icon: Wrench },
    ],
  },
  {
    title: 'Setup',
    items: [
      { href: '/setup/security', label: 'Security', icon: Shield },
      { href: '/setup/axle-configurations', label: 'Axle Configurations', icon: Cog },
      { href: '/setup/settings', label: 'System Settings', icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <aside className="hidden fixed top-0 left-0 z-30 h-screen w-72 flex-shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
      {/* Logo */}
      <div className="border-b border-gray-200 px-6 py-5">
        <Image
          src={kuraWeighLogo}
          alt="KURAWeigh logo"
          width={200}
          height={64}
          className="h-12 w-auto object-contain"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {menuSections.map((section) => (
          <div key={section.title}>
            <div className="text-xs font-semibold uppercase text-gray-500 px-3 mb-3">
              {section.title}
            </div>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
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
    </aside>
  );
}
