/**
 * Dashboard page aligned to Figma-inspired layout.
 */

'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useUser } from '@/hooks/useAuth';
import { AlertTriangle, CheckCircle, FileText, Scale, TrendingUp, Users } from 'lucide-react';

const stats = [
  { title: "Today's Weighings", value: '247', icon: Scale, color: 'bg-emerald-600' },
  { title: 'Overloaded Vehicles', value: '23', icon: AlertTriangle, color: 'bg-red-500' },
  { title: 'Active Users', value: '12', icon: Users, color: 'bg-emerald-500' },
  { title: 'Pending Cases', value: '8', icon: FileText, color: 'bg-amber-500' },
  { title: 'Processed Tickets', value: '189', icon: CheckCircle, color: 'bg-emerald-700' },
  { title: 'Revenue Today', value: 'KES 1,245,000', icon: TrendingUp, color: 'bg-amber-600' },
];

export default function DashboardPage() {
  const { user } = useUser();

  return (
    <ProtectedRoute>
      <AppShell title="Dashboard" subtitle="Welcome to KURAWeigh System">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <div>
            <p className="text-sm text-gray-600">
              {user?.first_name} {user?.last_name} • {user?.role_name}
              {user?.tenant_name ? ` • ${user.tenant_name}` : ''}
            </p>
          </div>
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
            Connected to auth-service
          </Badge>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Date From</Label>
                <Input type="date" defaultValue="2025-11-07" />
              </div>
              <div className="space-y-2">
                <Label>Date To</Label>
                <Input type="date" defaultValue="2025-11-07" />
              </div>
              <div className="space-y-2">
                <Label>Station</Label>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue placeholder="All Stations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stations</SelectItem>
                    <SelectItem value="nairobi">Nairobi Region</SelectItem>
                    <SelectItem value="central">Central Region</SelectItem>
                    <SelectItem value="western">Western Region</SelectItem>
                    <SelectItem value="coast">Coast Region</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Weighing Type</Label>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="multideck">Multideck</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm text-gray-600">{stat.title}</CardTitle>
                  <div className={`${stat.color} rounded-lg p-2`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts placeholders */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Weekly Weighing Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 rounded-xl bg-gradient-to-br from-emerald-50 via-white to-emerald-50" />
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Vehicle Types Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 rounded-xl bg-gradient-to-br from-amber-50 via-white to-amber-50" />
            </CardContent>
          </Card>
        </div>

        <Separator className="my-8" />

        {/* Operations grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Weighing Operations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600">
              <p>Access weighing operations, vehicle entries, and weight tickets.</p>
              <p className="text-xs text-gray-500">Updated 5 mins ago</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Prosecution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600">
              <p>Manage overload cases, evidence, and ticket processing.</p>
              <p className="text-xs text-gray-500">12 pending actions</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Reporting & Analytics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600">
              <p>Generate summaries and visualize performance across stations.</p>
              <p className="text-xs text-gray-500">Daily summary ready</p>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
