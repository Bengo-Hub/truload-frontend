"use client";

import { SummaryCard } from '@/components/weighing/SummaryCard';
import type { WeighingStatistics } from '@/lib/api/weighing';
import { AlertCircle, AlertTriangle, CheckCircle2, Scale, TrendingUp } from 'lucide-react';

interface TicketsStatsBarProps {
  stats?: WeighingStatistics;
  isLoading: boolean;
}

export default function TicketsStatsBar({ stats, isLoading }: TicketsStatsBarProps) {
  if (isLoading && !stats) return null;

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
