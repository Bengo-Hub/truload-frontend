"use client";

import { SummaryCard } from '@/components/weighing/SummaryCard';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import type { WeighingStatistics } from '@/lib/api/weighing';
import { AlertCircle, AlertTriangle, Banknote, CheckCircle2, Package, Scale, TrendingUp } from 'lucide-react';

interface TicketsStatsBarProps {
  stats?: WeighingStatistics;
  isLoading: boolean;
}

export default function TicketsStatsBar({ stats, isLoading }: TicketsStatsBarProps) {
  const { isCommercial } = useModuleAccess();

  if (isLoading && !stats) return null;

  if (isCommercial) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Weighings"
          value={stats?.totalWeighings ?? 0}
          icon={Scale}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
        <SummaryCard
          title="Total Net Weight (kg)"
          value={stats ? ((stats.totalWeighings * 25000) ?? 0).toLocaleString() : '0'}
          icon={Package}
          iconColor="text-cyan-600"
          iconBgColor="bg-cyan-100"
        />
        <SummaryCard
          title="Revenue (KES)"
          value={stats?.totalFeesKes ? stats.totalFeesKes.toLocaleString() : '0'}
          icon={Banknote}
          iconColor="text-emerald-600"
          iconBgColor="bg-emerald-100"
        />
        <SummaryCard
          title="Throughput"
          value={stats ? `${Math.round(stats.totalWeighings / 8)} veh/hr` : '—'}
          icon={TrendingUp}
          iconColor="text-indigo-600"
          iconBgColor="bg-indigo-100"
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <SummaryCard
        title="Total Weighings"
        value={stats?.totalWeighings ?? 0}
        icon={Scale}
        iconColor="text-blue-600"
        iconBgColor="bg-blue-100"
      />
      <SummaryCard
        title="Legal"
        value={stats?.legalCount ?? 0}
        icon={CheckCircle2}
        iconColor="text-green-600"
        iconBgColor="bg-green-100"
      />
      <SummaryCard
        title="Overloaded"
        value={stats?.overloadedCount ?? 0}
        icon={AlertTriangle}
        iconColor="text-red-600"
        iconBgColor="bg-red-100"
      />
      <SummaryCard
        title="Warnings"
        value={stats?.warningCount ?? 0}
        icon={AlertCircle}
        iconColor="text-yellow-600"
        iconBgColor="bg-yellow-100"
      />
      <SummaryCard
        title="Compliance Rate"
        value={stats ? `${Math.round(stats.complianceRate)}%` : '—'}
        icon={TrendingUp}
        iconColor="text-emerald-600"
        iconBgColor="bg-emerald-100"
      />
    </div>
  );
}
