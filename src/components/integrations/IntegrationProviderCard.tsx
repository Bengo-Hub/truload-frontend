'use client';

import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { IntegrationStatusBadge, type IntegrationStatus } from './IntegrationStatusBadge';
import { Settings2 } from 'lucide-react';

export interface ProviderMeta {
  providerName: string;
  displayName: string;
  description: string;
  logo?: string;
  icon?: React.ReactNode;
  color: string;
}

interface IntegrationProviderCardProps {
  provider: ProviderMeta;
  status: IntegrationStatus;
  isSelected?: boolean;
  environment?: string;
  lastUpdated?: string;
  onClick?: () => void;
}

export function IntegrationProviderCard({
  provider,
  status,
  isSelected = false,
  environment,
  lastUpdated,
  onClick,
}: IntegrationProviderCardProps) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`relative cursor-pointer p-4 transition-all hover:shadow-md ${
        isSelected
          ? 'border-primary ring-2 ring-primary/20 shadow-sm bg-primary/[0.02]'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Provider Logo / Icon */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${provider.color}`}>
            {provider.logo ? (
              <Image
                src={provider.logo}
                alt={provider.displayName}
                width={40}
                height={40}
                className="h-9 w-9 object-contain"
              />
            ) : provider.icon ? (
              provider.icon
            ) : (
              <Settings2 className="h-6 w-6" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-gray-900 truncate">
              {provider.displayName}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {provider.description}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <IntegrationStatusBadge status={status} />
      </div>

      {/* Footer meta */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
        {environment && (
          <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
            {environment}
          </span>
        )}
        {lastUpdated && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            Updated {new Date(lastUpdated).toLocaleDateString()}
          </span>
        )}
      </div>
    </Card>
  );
}
