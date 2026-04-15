'use client';

/**
 * Platform admin dashboard with system overview stats, health status,
 * quick actions, and tenant summary. Superuser only.
 */

import { PlatformShell } from '@/components/layout/PlatformShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useHealthStatus } from '@/hooks/queries/useTechnicalQueries';
import { fetchPublicOrganizations } from '@/lib/api/public';
import { apiClient } from '@/lib/api/client';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Building2,
  CheckCircle,
  Settings,
  Shield,
  Users,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

/** Quick action links for the platform admin */
const quickActions = [
  { href: '/platform/tenants', label: 'Manage Organisations', description: 'Add, edit, and configure tenants', icon: Building2, color: 'bg-violet-100 text-violet-600' },
  { href: '/platform/users', label: 'Manage Users', description: 'Platform and tenant user accounts', icon: Users, color: 'bg-blue-100 text-blue-600' },
  { href: '/platform/roles', label: 'Roles & Permissions', description: 'Configure access control', icon: Shield, color: 'bg-amber-100 text-amber-600' },
  { href: '/platform/system-config', label: 'System Config', description: 'Rate limits, cache, modules', icon: Settings, color: 'bg-gray-100 text-gray-600' },
  { href: '/platform/integrations', label: 'Integrations', description: 'Payment, SMS, API services', icon: Activity, color: 'bg-emerald-100 text-emerald-600' },
];

export default function PlatformDashboardPage() {
  const { data: health, isLoading: healthLoading } = useHealthStatus();
  const { data: orgs, isLoading: orgsLoading } = useQuery({
    queryKey: ['platform-orgs'],
    queryFn: fetchPublicOrganizations,
    staleTime: 60_000,
  });
  const { data: userStats } = useQuery({
    queryKey: ['platform-user-count'],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get('/user-management/users', { params: { pageSize: 1, pageNumber: 1 } });
        return { total: data?.totalCount ?? 0 };
      } catch { return { total: 0 }; }
    },
    staleTime: 60_000,
  });
  const { data: roleStats } = useQuery({
    queryKey: ['platform-role-count'],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get('/user-management/roles');
        return { total: Array.isArray(data) ? data.length : 0 };
      } catch { return { total: 0 }; }
    },
    staleTime: 60_000,
  });

  const backendHealthy = health?.status === 'healthy';

  return (
    <PlatformShell title="Platform Dashboard" subtitle="System overview and administration">
      {/* Stats cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Organisations</p>
                {orgsLoading ? (
                  <Skeleton className="mt-1 h-8 w-12" />
                ) : (
                  <p className="mt-1 text-2xl font-bold text-gray-900">{orgs?.length ?? 0}</p>
                )}
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
                <Building2 className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Users</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{userStats?.total ?? '...'}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Roles</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{roleStats?.total ?? '...'}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <Shield className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Backend API</p>
                {healthLoading ? (
                  <Skeleton className="mt-1 h-8 w-16" />
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    {backendHealthy ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className={`text-lg font-bold ${backendHealthy ? 'text-green-600' : 'text-red-600'}`}>
                      {backendHealthy ? 'Healthy' : 'Down'}
                    </span>
                  </div>
                )}
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${backendHealthy ? 'bg-green-100' : 'bg-red-100'}`}>
                <Activity className={`h-5 w-5 ${backendHealthy ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
            {health?.version && <p className="mt-1 text-[10px] text-gray-400 font-mono">v{health.version}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions grid */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Quick Actions</h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer group">
                  <CardContent className="flex items-start gap-3 pt-4 pb-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.color} transition-transform group-hover:scale-105`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{item.label}</p>
                      <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Tenants summary */}
      {orgs && orgs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Active Tenants</h2>
            <Link href="/platform/tenants" className="text-xs font-medium text-[#5B1C4D] hover:underline">
              View all
            </Link>
          </div>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {orgs.slice(0, 6).map((org) => (
              <Card key={org.id} className="group">
                <CardContent className="flex items-center gap-3 pt-4 pb-4">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white text-sm font-bold"
                    style={{ backgroundColor: org.primaryColor || '#5B1C4D' }}
                  >
                    {org.code?.slice(0, 2) || '??'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{org.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{org.code}</p>
                  </div>
                  {org.tenantType && (
                    <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                      {org.tenantType === 'CommercialWeighing' ? 'Commercial' : 'Enforcement'}
                    </span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </PlatformShell>
  );
}
