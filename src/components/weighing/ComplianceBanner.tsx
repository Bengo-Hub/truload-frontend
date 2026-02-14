"use client";

import { cn } from '@/lib/utils';
import { ComplianceStatus } from '@/types/weighing';
import { AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface ComplianceBannerProps {
  status: ComplianceStatus | 'PENDING';
  gvwMeasured?: number;
  gvwOverload?: number;
  excessAvw?: number;
  gvwExcess?: number;
  diffExcess?: number;
  timeTaken?: string;
  reweighCount?: number;
  className?: string;
}

/**
 * ComplianceBanner - Displays compliance status banner
 *
 * Based on KenloadV2 design showing:
 * - RE-WEIGH count badge
 * - GVW measurement
 * - Excess AVW (Axle Vehicle Weight)
 * - GVW Excess (highlighted in red/yellow)
 * - DIFF Excess
 * - Time Taken
 * - Overall status (Legal/Warning/Overload)
 */
export function ComplianceBanner({
  status,
  gvwMeasured = 0,
  gvwOverload: _gvwOverload = 0,
  excessAvw = 0,
  gvwExcess = 0,
  diffExcess = 0,
  timeTaken,
  reweighCount = 0,
  className,
}: ComplianceBannerProps) {
  const isPending = status === 'PENDING';

  return (
    <div className={cn('space-y-2', className)}>
      {/* Info Badges Row */}
      <div className="flex flex-wrap gap-2">
        {/* Re-weigh Badge - only shown for actual reweighs (cycle >= 1) */}
        {reweighCount > 0 && (
          <span className="bg-gray-800 text-white px-3 py-1 rounded text-sm font-medium">
            RE-WEIGH: {reweighCount}
          </span>
        )}

        {/* GVW Badge */}
        <span className="bg-gray-800 text-white px-3 py-1 rounded text-sm font-medium">
          GVW: {gvwMeasured.toLocaleString()} [KG]
        </span>

        {/* Excess AVW Badge */}
        {excessAvw > 0 && (
          <span className="bg-gray-800 text-white px-3 py-1 rounded text-sm font-medium">
            Excess AVW: {excessAvw.toLocaleString()} [KG]
          </span>
        )}
      </div>

      {/* Excess/Warning Row */}
      <div className="flex flex-wrap gap-2">
        {/* GVW Excess - highlighted */}
        {gvwExcess > 0 && (
          <span className="bg-yellow-400 text-black px-3 py-1 rounded text-sm font-bold">
            GVW Excess: {gvwExcess.toLocaleString()} [KG]
          </span>
        )}

        {/* DIFF Excess - highlighted */}
        {diffExcess > 0 && (
          <span className="bg-red-500 text-white px-3 py-1 rounded text-sm font-bold">
            DIFF. Excess: {diffExcess.toLocaleString()} [KG]
          </span>
        )}

        {/* Time Taken */}
        {timeTaken && (
          <span className="bg-yellow-400 text-black px-3 py-1 rounded text-sm font-medium">
            Time Taken: {timeTaken}
          </span>
        )}
      </div>

      {/* Status Banner */}
      <div
        className={cn(
          'w-full py-3 text-center rounded font-bold text-lg flex items-center justify-center gap-2',
          isPending
            ? 'bg-gray-200 text-gray-600'
            : status === 'LEGAL'
              ? 'bg-green-600 text-white'
              : status === 'WARNING'
                ? 'bg-yellow-500 text-black'
                : 'bg-red-600 text-white'
        )}
      >
        {isPending && <Clock className="h-5 w-5" />}
        {status === 'LEGAL' && <CheckCircle2 className="h-5 w-5" />}
        {status === 'WARNING' && <AlertTriangle className="h-5 w-5" />}
        {status === 'OVERLOAD' && <XCircle className="h-5 w-5" />}
        {isPending
          ? 'Pending'
          : status === 'LEGAL'
            ? 'Legal'
            : status === 'WARNING'
              ? 'Warning'
              : 'Overload'}
      </div>
    </div>
  );
}

/**
 * CompactComplianceBadge - Small inline badge for status
 */
export function CompactComplianceBadge({
  status,
  className,
}: {
  status: ComplianceStatus | 'PENDING';
  className?: string;
}) {
  const isPending = status === 'PENDING';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-3 py-1 rounded font-bold text-sm',
        isPending
          ? 'bg-gray-200 text-gray-600'
          : status === 'LEGAL'
            ? 'bg-green-100 text-green-700 border border-green-500'
            : status === 'WARNING'
              ? 'bg-yellow-100 text-yellow-700 border border-yellow-500'
              : 'bg-red-100 text-red-700 border border-red-500',
        className
      )}
    >
      {isPending && <Clock className="h-3 w-3" />}
      {status === 'LEGAL' && <CheckCircle2 className="h-3 w-3" />}
      {status === 'WARNING' && <AlertTriangle className="h-3 w-3" />}
      {status === 'OVERLOAD' && <XCircle className="h-3 w-3" />}
      {isPending
        ? 'Pending'
        : status === 'LEGAL'
          ? 'Legal'
          : status === 'WARNING'
            ? 'Warning'
            : 'Overload'}
    </span>
  );
}

/**
 * AllowableExcessBanner - Shows the allowable excess weights
 */
export function AllowableExcessBanner({
  gawAllowable = 200,
  gvwAllowable = 200,
  className,
}: {
  gawAllowable?: number;
  gvwAllowable?: number;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2 text-xs', className)}>
      <span className="text-blue-600 border border-blue-400 px-2 py-1 rounded">
        Allowable Excess Weight:
      </span>
      <span className="text-red-600 border border-red-400 px-2 py-1 rounded">
        GAW: {gawAllowable} [KG]
      </span>
      <span className="text-red-600 border border-red-400 px-2 py-1 rounded">
        GVW: {gvwAllowable} [KG]
      </span>
    </div>
  );
}

export default ComplianceBanner;
