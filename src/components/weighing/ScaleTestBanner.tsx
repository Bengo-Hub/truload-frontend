"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, Scale, RefreshCw, Play } from 'lucide-react';

interface ScaleTestBannerProps {
  isScaleTestCompleted: boolean;
  lastTestAt?: Date;
  onStartScaleTest: () => void;
  className?: string;
  /** Compact mode for inline display in 2-column layouts */
  compact?: boolean;
}

/** Same success message for scale test pass on both mobile and multideck */
export const SCALE_TEST_SUCCESS_MESSAGE = 'Scale test completed successfully!';
export const SCALE_TEST_SUCCESS_DESCRIPTION = 'Weighing operations are now enabled.';

/**
 * ScaleTestBanner - Compact scale test requirement status card (shared by mobile and multideck)
 *
 * Per FRD: Scale test must be completed at least once per day
 * before weighing operations can proceed.
 *
 * Redesigned for modern, compact appearance with icon, status, and action button.
 * Parent opens ScaleTestModal with weighingMode="mobile" or "multideck" as appropriate.
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
      'shadow-md transition-all duration-300 overflow-hidden group',
      isCompleted
        ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white'
        : 'border-blue-200 bg-gradient-to-br from-blue-50/80 to-white',
      className
    )}>
      <CardContent className={cn('relative flex items-center justify-between gap-4', compact ? 'p-3' : 'p-4')}>
        {/* Subtle background icon for aesthetic */}
        <div className="absolute -right-2 -bottom-2 opacity-[0.03] rotate-12 transition-transform group-hover:scale-110 duration-500">
          <Scale size={80} />
        </div>

        <div className="flex items-center gap-4 relative z-10">
          {/* Status Icon with Ring */}
          <div className={cn(
            'flex items-center justify-center rounded-xl shadow-sm ring-4 transition-all duration-300',
            compact ? 'w-10 h-10' : 'w-12 h-12',
            isCompleted 
              ? 'bg-emerald-100 ring-emerald-50 text-emerald-600 group-hover:scale-105' 
              : 'bg-blue-100 ring-blue-50 text-blue-600 group-hover:rotate-12'
          )}>
            {isCompleted ? (
              <CheckCircle2 className={cn(compact ? 'h-5 w-5' : 'h-6 w-6')} />
            ) : (
              <Scale className={cn(compact ? 'h-5 w-5' : 'h-6 w-6')} />
            )}
          </div>

          {/* Status Text & Message */}
          <div className="min-w-0">
            <h3 className={cn(
              'font-bold tracking-tight mb-0.5',
              compact ? 'text-sm' : 'text-base',
              isCompleted ? 'text-emerald-900' : 'text-blue-900'
            )}>
              {isCompleted ? 'Scale Test Passed' : 'Ready for Testing'}
            </h3>
            <div className="flex items-center gap-1.5">
              {!isCompleted && <AlertTriangle className="h-3 w-3 text-blue-500" />}
              <p className={cn(
                'font-medium truncate',
                compact ? 'text-[10px]' : 'text-xs',
                isCompleted ? 'text-emerald-600' : 'text-blue-600'
              )}>
                {isCompleted
                  ? `Last verified at ${formatTime(lastTestAt!)}`
                  : 'Test scales before weighing for maximum accuracy'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={onStartScaleTest}
          size={compact ? 'sm' : 'default'}
          variant={isCompleted ? 'outline' : 'default'}
          className={cn(
            'relative z-10 font-bold shadow-sm transition-all active:scale-95',
            compact ? 'text-[11px] h-8 px-3' : 'text-sm px-5',
            isCompleted
              ? 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300'
              : 'bg-blue-600 hover:bg-blue-700 text-white border-none'
          )}
        >
          {isCompleted ? (
            <>
              <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', compact ? 'hidden' : 'inline')} />
              Retest
            </>
          ) : (
            <>
              <Play className="mr-1.5 h-3 w-3 fill-current" />
              Start Test
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export default ScaleTestBanner;
