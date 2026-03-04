'use client';

/**
 * Platform admin dashboard. Superuser only.
 * Quick links to tenant management, platform users, and roles.
 */

import { PlatformShell } from '@/components/layout/PlatformShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Shield, Users } from 'lucide-react';
import Link from 'next/link';

const platformLinks = [
  { href: '/platform/tenants', label: 'Tenants', description: 'Register and manage organisations', icon: Building2 },
  { href: '/platform/users', label: 'Platform users', description: 'System and tenant admin users', icon: Users },
  { href: '/platform/roles', label: 'Platform roles', description: 'Roles and system-sensitive permissions', icon: Shield },
];

export default function PlatformDashboardPage() {
  return (
    <PlatformShell
      title="Dashboard"
      subtitle="Manage tenants, platform users, and system roles. Only visible to superusers."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {platformLinks.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full transition-colors hover:border-emerald-500/50 hover:bg-emerald-50/30">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{item.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{item.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </PlatformShell>
  );
}
