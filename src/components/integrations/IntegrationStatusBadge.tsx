'use client';

import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export type IntegrationStatus = 'active' | 'inactive' | 'error';

interface IntegrationStatusBadgeProps {
  status: IntegrationStatus;
  className?: string;
}

const statusConfig: Record<
  IntegrationStatus,
  { label: string; icon: React.ReactNode; variant: string }
> = {
  active: {
    label: 'Active',
    icon: <CheckCircle2 className="h-3 w-3" />,
    variant: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  inactive: {
    label: 'Inactive',
    icon: <XCircle className="h-3 w-3" />,
    variant: 'bg-gray-50 text-gray-500 border-gray-200',
  },
  error: {
    label: 'Error',
    icon: <AlertTriangle className="h-3 w-3" />,
    variant: 'bg-red-50 text-red-600 border-red-200',
  },
};

export function IntegrationStatusBadge({ status, className }: IntegrationStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant="outline" className={`gap-1 text-[11px] font-medium ${config.variant} ${className ?? ''}`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}
