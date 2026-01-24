"use client";

import { Button } from '@/components/ui/button';
import { ScaleStatus } from '@/types/weighing';
import { getScaleStatusColor } from '@/lib/weighing-utils';
import { cn } from '@/lib/utils';
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface WeighingPageHeaderProps {
  title: string;
  subtitle?: string;
  scaleStatus: ScaleStatus;
  scaleLabel?: string;
  backHref?: string;
  onBack?: () => void;
  rightContent?: React.ReactNode;
  className?: string;
}

/**
 * WeighingPageHeader - Header with navigation and scale status
 *
 * Features:
 * - Back button (link or callback)
 * - Title and subtitle
 * - Scale connection status indicator
 * - Optional right-side content
 */
export function WeighingPageHeader({
  title,
  subtitle,
  scaleStatus,
  scaleLabel = 'Scale',
  backHref = '/weighing',
  onBack,
  rightContent,
  className,
}: WeighingPageHeaderProps) {
  const getStatusIcon = () => {
    switch (scaleStatus) {
      case 'connected':
        return <CheckCircle2 className={cn('h-4 w-4', getScaleStatusColor(scaleStatus))} />;
      case 'disconnected':
        return <XCircle className={cn('h-4 w-4', getScaleStatusColor(scaleStatus))} />;
      case 'unstable':
        return <AlertCircle className={cn('h-4 w-4', getScaleStatusColor(scaleStatus))} />;
    }
  };

  const BackButton = () => (
    <Button variant="ghost" size="sm" onClick={onBack}>
      <ArrowLeft className="h-4 w-4 mr-2" />
      Back
    </Button>
  );

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="flex items-center gap-4">
        {onBack ? (
          <BackButton />
        ) : (
          <Link href={backHref}>
            <BackButton />
          </Link>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">{scaleLabel}:</span>
          {getStatusIcon()}
          <span className="capitalize font-medium text-gray-700">{scaleStatus}</span>
        </div>
        {rightContent}
      </div>
    </div>
  );
}
