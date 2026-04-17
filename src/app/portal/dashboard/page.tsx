/**
 * Portal Dashboard
 *
 * Transporter overview: today's trips, monthly tonnage, pending tickets, quick links.
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePortalDashboard } from '@/hooks/queries/usePortalQueries';
import { CalendarDays, Clock, Scale, Truck, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  isLoading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs text-gray-600 sm:text-sm">{title}</CardTitle>
        <div className={`${color} rounded-lg p-1.5 sm:p-2 shrink-0`}>
          <Icon className="h-4 w-4 text-white sm:h-5 sm:w-5" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-lg font-semibold sm:text-xl lg:text-2xl">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PortalDashboardPage() {
  const { data: stats, isLoading } = usePortalDashboard();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-500">Overview of your transport operations</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Trips"
          value={stats?.todayTrips ?? 0}
          icon={CalendarDays}
          color="bg-blue-500"
          isLoading={isLoading}
        />
        <StatCard
          title="Monthly Tonnage"
          value={stats?.monthlyTonnage ? `${stats.monthlyTonnage.toLocaleString()} kg` : '0 kg'}
          icon={Scale}
          color="bg-emerald-500"
          isLoading={isLoading}
        />
        <StatCard
          title="Pending Tickets"
          value={stats?.pendingTickets ?? 0}
          icon={Clock}
          color="bg-amber-500"
          isLoading={isLoading}
        />
        <StatCard
          title="Active Vehicles"
          value={stats?.activeVehicles ?? 0}
          icon={Truck}
          color="bg-purple-500"
          isLoading={isLoading}
        />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Scale className="h-5 w-5 text-blue-600" />
              Weighing History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              View all your weighing tickets across all weighbridges.
            </p>
            <Link href="/portal/weighings">
              <Button variant="outline" size="sm" className="w-full">
                View Weighings
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-600" />
              Vehicle Fleet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Manage your vehicles, tare weights, and weight trends.
            </p>
            <Link href="/portal/vehicles">
              <Button variant="outline" size="sm" className="w-full">
                View Vehicles
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Drivers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              View driver performance, trips, and average payloads.
            </p>
            <Link href="/portal/drivers">
              <Button variant="outline" size="sm" className="w-full">
                View Drivers
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
