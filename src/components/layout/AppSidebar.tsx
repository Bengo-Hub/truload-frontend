/**
 * Application sidebar inspired by Figma design.
 * Uses simple tailwind styling and lucide icons.
 */

import {
  BarChart3,
  Briefcase,
  FolderOpen,
  Gavel,
  LayoutDashboard,
  Settings,
  Shield,
  Users,
  Weight,
  Wrench,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LOGO_MAIN = '/images/logos/kuraweigh-logo.png';

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/users', label: 'User Management', icon: Users },
  { href: '/weighing', label: 'Weighing', icon: Weight },
  { href: '/case-register', label: 'Case Register', icon: FolderOpen },
  { href: '/prosecution', label: 'Prosecution', icon: Gavel },
  { href: '/cases', label: 'Case Management', icon: Briefcase },
  { href: '/reporting', label: 'Reporting', icon: BarChart3 },
  { href: '/security', label: 'Security', icon: Shield },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/technical', label: 'Technical', icon: Wrench },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-72 flex-shrink-0 flex-col border-r bg-white lg:flex">
      <div className="border-b px-6 py-5">
        <Image
          src={LOGO_MAIN}
          alt="KURAWeigh logo"
          width={200}
          height={64}
          className="h-12 w-auto object-contain"
        />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="text-xs font-semibold uppercase text-gray-500 px-3 mb-3">Main Menu</div>
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                    active
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t px-4 py-4 text-sm text-gray-500">© 2025 KURAWeigh</div>
    </aside>
  );
}
