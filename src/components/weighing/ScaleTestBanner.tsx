"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, Scale } from 'lucide-react';

interface ScaleTestBannerProps {
  isScaleTestCompleted: boolean;
  lastTestAt?: Date;
  onStartScaleTest: () => void;
  className?: string;
  /** Compact mode for inline display in 2-column layouts */
  compact?: boolean;
}

/**
 * ScaleTestBanner - Compact scale test requirement status card
 *
 * Per FRD: Scale test must be completed at least once per day
 * before weighing operations can proceed.
 *
 * Redesigned for modern, compact appearance with icon, status, and action button.
 */
export function ScaleTestBanner({
  isScaleTestCompleted,
  lastTestAt,
  onStartScaleTest,
  className,
  compact = false,
}: ScaleTestBannerProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isCompleted = isScaleTestCompleted && lastTestAt;

  return (
    <Card className={cn(
      'shadow-sm transition-colors',
      isCompleted
        ? 'border-green-200 bg-green-50/50'
        : 'border-orange-200 bg-orange-50/50',
      className
    )}>
      <CardContent className={cn('flex items-center justify-between', compact ? 'p-3' : 'p-4')}>
        <div className="flex items-center gap-3">
          {/* Status Icon */}
          <div className={cn(
            'flex items-center justify-center rounded-lg',
            compact ? 'w-10 h-10' : 'w-12 h-12',
            isCompleted ? 'bg-green-100' : 'bg-orange-100'
          )}>
            {isCompleted ? (
              <CheckCircle2 className={cn('text-green-600', compact ? 'h-5 w-5' : 'h-6 w-6')} />
            ) : (
              <AlertTriangle className={cn('text-orange-600', compact ? 'h-5 w-5' : 'h-6 w-6')} />
            )}
          </div>

          {/* Status Text */}
          <div>
            <p className={cn(
              'font-semibold',
              compact ? 'text-sm' : 'text-base',
              isCompleted ? 'text-green-700' : 'text-orange-700'
            )}>
              {isCompleted ? 'Scale Test Passed' : 'Scale Test Required'}
            </p>
            <p className={cn('text-gray-500', compact ? 'text-xs' : 'text-sm')}>
              {isCompleted
                ? `Last: ${formatTime(lastTestAt!)}`
                : 'Required before weighing'}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={onStartScaleTest}
          size={compact ? 'sm' : 'default'}
          variant={isCompleted ? 'outline' : 'default'}
          className={cn(
            compact ? 'text-xs' : 'text-sm',
            isCompleted
              ? 'border-green-300 text-green-700 hover:bg-green-100'
              : 'bg-orange-500 hover:bg-orange-600 text-white'
          )}
        >
          <Scale className={cn('mr-1.5', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
          {isCompleted ? 'Retest' : 'Run Test'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default ScaleTestBanner;
