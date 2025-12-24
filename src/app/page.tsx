/**
 * Root dashboard page aligned to Figma design.
 * Uses reusable chart components.
 */

'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  DashboardFilters,
  RevenueChart,
  StatCard,
  VehicleTypesChart,
  WeeklyActivityChart,
} from '@/components/charts';
import { AppShell } from '@/components/layout/AppShell';
import { AlertTriangle, CheckCircle, FileText, Scale, TrendingUp, Users } from 'lucide-react';

const stats = [
  { title: "Today's Weighings", value: '247', icon: Scale, color: 'bg-green-600' },
  { title: 'Overloaded Vehicles', value: '23', icon: AlertTriangle, color: 'bg-red-500' },
  { title: 'Active Users', value: '12', icon: Users, color: 'bg-green-500' },
  { title: 'Pending Cases', value: '8', icon: FileText, color: 'bg-yellow-500' },
  { title: 'Processed Tickets', value: '189', icon: CheckCircle, color: 'bg-green-700' },
  { title: 'Revenue Today', value: 'KES 1,245,000', icon: TrendingUp, color: 'bg-yellow-600' },
];

export default function HomePage() {
  return (
    <ProtectedRoute>
      <AppShell title="Dashboard" subtitle="KURAWeigh - Vehicle Weighing & Management System">
        <div className="space-y-8">
          {/* Filters Section */}
          <DashboardFilters />

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat) => (
              <StatCard
                key={stat.title}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                color={stat.color}
              />
            ))}
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <WeeklyActivityChart />
            <VehicleTypesChart />
          </div>

          {/* Charts Row 2 */}
          <div>
            <RevenueChart />
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
