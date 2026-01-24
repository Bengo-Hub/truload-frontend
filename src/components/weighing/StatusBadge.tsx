"use client";

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type WeighingStatus = 'Normal' | 'Legal' | 'Warning' | 'Overloaded' | 'Overload';
export type VehicleStatus = 'AWAITING_OFFLOAD' | 'OFFLOADING' | 'REWEIGH_PENDING' | 'RELEASED';
export type TagStatus = 'ACTIVE' | 'RESOLVED' | 'EXPIRED';
export type ComplianceStatus = 'LEGAL' | 'WARNING' | 'OVERLOAD' | 'PENDING';

interface StatusBadgeProps {
  status: WeighingStatus | VehicleStatus | TagStatus | ComplianceStatus | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // Weighing statuses
  Normal: { label: 'Normal', className: 'bg-green-500 hover:bg-green-500 text-white' },
  Legal: { label: 'Legal', className: 'bg-green-500 hover:bg-green-500 text-white' },
  LEGAL: { label: 'Legal', className: 'bg-green-500 hover:bg-green-500 text-white' },
  Warning: { label: 'Warning', className: 'bg-yellow-500 hover:bg-yellow-500 text-white' },
  WARNING: { label: 'Warning', className: 'bg-yellow-500 hover:bg-yellow-500 text-white' },
  Overloaded: { label: 'Overloaded', className: 'bg-red-500 hover:bg-red-500 text-white' },
  Overload: { label: 'Overload', className: 'bg-red-500 hover:bg-red-500 text-white' },
  OVERLOAD: { label: 'Overload', className: 'bg-red-500 hover:bg-red-500 text-white' },
  PENDING: { label: 'Pending', className: 'bg-gray-400 hover:bg-gray-400 text-white' },

  // Yard statuses
  AWAITING_OFFLOAD: { label: 'Awaiting', className: 'bg-orange-500 hover:bg-orange-500 text-white' },
  OFFLOADING: { label: 'Offloading', className: 'bg-blue-500 hover:bg-blue-500 text-white' },
  REWEIGH_PENDING: { label: 'Reweigh', className: 'bg-purple-500 hover:bg-purple-500 text-white' },
  RELEASED: { label: 'Released', className: 'bg-green-500 hover:bg-green-500 text-white' },

  // Tag statuses
  ACTIVE: { label: 'Active', className: 'bg-red-500 hover:bg-red-500 text-white' },
  RESOLVED: { label: 'Resolved', className: 'bg-green-500 hover:bg-green-500 text-white' },
  EXPIRED: { label: 'Expired', className: 'bg-gray-500 hover:bg-gray-500 text-white' },
};

/**
 * Reusable status badge component for weighing module.
 * Supports various status types with consistent styling.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-gray-500 hover:bg-gray-500 text-white' };

  return (
    <Badge className={cn('font-medium rounded-md', config.className, className)}>
      {config.label}
    </Badge>
  );
}

/**
 * Outline variant for compliance status badges
 */
export function ComplianceBadge({ status, className }: { status: ComplianceStatus; className?: string }) {
  const colorMap: Record<ComplianceStatus, string> = {
    LEGAL: 'text-green-600 bg-green-50 border-green-200',
    WARNING: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    OVERLOAD: 'text-red-600 bg-red-50 border-red-200',
    PENDING: 'text-gray-600 bg-gray-50 border-gray-200',
  };

  return (
    <Badge variant="outline" className={cn(colorMap[status], className)}>
      {status}
    </Badge>
  );
}

/**
 * Weighing type badge (Mobile/Multideck)
 */
export function WeighingTypeBadge({ type }: { type: 'mobile' | 'multideck' }) {
  return (
    <Badge variant="outline" className="font-normal rounded-md border-gray-300 text-gray-700">
      {type === 'mobile' ? 'Mobile' : 'Multideck'}
    </Badge>
  );
}
