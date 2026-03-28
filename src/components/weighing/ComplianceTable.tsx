"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AxleGroupResult, ComplianceStatus } from '@/types/weighing';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Scale, XCircle } from 'lucide-react';
import { Fragment, useState } from 'react';

interface ComplianceTableProps {
  groupResults: AxleGroupResult[];
  gvwPermissible: number;
  gvwMeasured: number;
  gvwOverload: number;
  overallStatus: ComplianceStatus;
  /** GVW tolerance display string from API (e.g. "5%", "2,000 kg", "0% (strict)") */
  gvwToleranceDisplay?: string;
  /** GVW tolerance in kg from API */
  gvwToleranceKg?: number;
  /** GVW effective limit including tolerance */
  gvwEffectiveLimitKg?: number;
  /** Show hierarchical view with expandable groups (default: true) */
  hierarchical?: boolean;
  /** Compact mode for smaller spaces */
  compact?: boolean;
  /** Commercial weighing mode — shows simplified GVW summary only, no enforcement details */
  isCommercial?: boolean;
  className?: string;
}

/**
 * ComplianceTable - Unified Hierarchical Compliance Grid
 *
 * Implements the superior approach from WEIGHING_SCREEN_SPECIFICATION.md:
 * - Unified hierarchical tree (Groups as parents, Axles as children)
 * - Clear visual hierarchy (Groups bold, Axles lighter)
 * - Explicit tolerance column
 * - Real-time PDF display
 * - Smart status badges
 * - Responsive card view on mobile
 *
 * Regulatory Reference (Kenya Traffic Act Cap 403 & EAC Act 2016):
 * - Single Steering: 7,000 kg (5% tolerance)
 * - Single Drive (Dual Tyres): 10,000 kg (5% tolerance)
 * - Tandem (2 axles): 16,000 kg (0% tolerance - strict)
 * - Tridem (3 axles): 24,000 kg (0% tolerance - strict)
 * - Maximum GVW: 56,000 kg (0% tolerance)
 */
export function ComplianceTable({
  groupResults,
  gvwPermissible,
  gvwMeasured,
  gvwOverload,
  overallStatus,
  gvwToleranceDisplay,
  gvwToleranceKg,
  gvwEffectiveLimitKg,
  hierarchical = true,
  compact = false,
  isCommercial = false,
  className,
}: ComplianceTableProps) {
  // Track expanded groups in hierarchical mode
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupLabel)) {
        newSet.delete(groupLabel);
      } else {
        newSet.add(groupLabel);
      }
      return newSet;
    });
  };

  // Status configuration
  const getStatusConfig = (status: ComplianceStatus | 'PENDING') => {
    switch (status) {
      case 'LEGAL':
        return {
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200',
          badge: 'bg-green-100 text-green-800 border-green-300',
          icon: CheckCircle2,
          label: 'Legal',
        };
      case 'WARNING':
        return {
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          border: 'border-amber-200',
          badge: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: AlertTriangle,
          label: 'Tolerance Applied',
        };
      case 'OVERLOAD':
        return {
          bg: 'bg-red-50',
          text: 'text-red-700',
          border: 'border-red-200',
          badge: 'bg-red-100 text-red-800 border-red-300',
          icon: XCircle,
          label: 'Overload',
        };
      default:
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-500',
          border: 'border-gray-200',
          badge: 'bg-gray-100 text-gray-600 border-gray-300',
          icon: Scale,
          label: 'Pending',
        };
    }
  };

  // Calculate PDF (Pavement Damage Factor) using Fourth Power Law
  const calculatePDF = (measured: number, permissible: number): number => {
    if (measured === 0 || permissible === 0) return 0;
    return Math.pow(measured / permissible, 4);
  };

  // Determine axle/group status
  const _getStatus = (measured: number, permissible: number, tolerance: number): ComplianceStatus | 'PENDING' => {
    if (measured === 0) return 'PENDING';
    const effectiveLimit = permissible + tolerance;
    if (measured > effectiveLimit) return 'OVERLOAD';
    if (measured > permissible && tolerance > 0) return 'WARNING';
    if (measured > permissible) return 'OVERLOAD';
    return 'LEGAL';
  };

  // Format number with locale
  const formatKg = (value: number): string => {
    return value.toLocaleString();
  };

  // Calculate GVW PDF
  const gvwPdf = calculatePDF(gvwMeasured, gvwPermissible);
  const gvwStatusConfig = getStatusConfig(overallStatus);

  // Commercial mode: simplified GVW summary — no per-axle compliance, no PDF, no enforcement labels
  if (isCommercial) {
    return (
      <Card className={cn('border-gray-200 shadow-sm overflow-hidden', className)}>
        <CardHeader className={cn('bg-gradient-to-r from-blue-800 to-blue-700 text-white', compact ? 'py-2 px-3' : 'py-3 px-4')}>
          <CardTitle className="flex items-center gap-2">
            <Scale className={cn('text-blue-300', compact ? 'h-4 w-4' : 'h-5 w-5')} />
            <span className={cn('font-semibold', compact ? 'text-sm' : 'text-base')}>
              Weight Summary
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Permissible GVW</span>
              <span className="font-mono font-bold text-lg text-slate-800">
                {gvwPermissible > 0 ? `${gvwPermissible.toLocaleString()} kg` : '—'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Measured GVW</span>
              <span className="font-mono font-bold text-lg text-slate-800">
                {gvwMeasured > 0 ? `${gvwMeasured.toLocaleString()} kg` : '—'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Axle Groups</span>
              <span className="font-mono font-bold text-lg text-slate-800">{groupResults.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border-gray-200 shadow-sm overflow-hidden', className)}>
      <CardHeader className={cn('bg-gradient-to-r from-slate-800 to-slate-700 text-white', compact ? 'py-2 px-3' : 'py-3 px-4')}>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className={cn('text-blue-400', compact ? 'h-4 w-4' : 'h-5 w-5')} />
            <span className={cn('font-semibold', compact ? 'text-sm' : 'text-base')}>
              Compliance Assessment
            </span>
          </div>
          <div
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-full border font-semibold',
              compact ? 'text-xs' : 'text-sm',
              gvwStatusConfig.badge
            )}
          >
            <gvwStatusConfig.icon className="h-3.5 w-3.5" />
            {gvwStatusConfig.label}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100 text-slate-700">
              <tr className={compact ? 'text-xs' : 'text-sm'}>
                <th className="px-3 py-2 text-left font-semibold w-[180px]">Group / Axle</th>
                <th className="px-3 py-2 text-left font-semibold">Type</th>
                <th className="px-3 py-2 text-right font-semibold">Permissible</th>
                <th className="px-3 py-2 text-right font-semibold">Tolerance</th>
                <th className="px-3 py-2 text-right font-semibold">Op. Tol.</th>
                <th className="px-3 py-2 text-right font-semibold">Measured</th>
                <th className="px-3 py-2 text-right font-semibold">Excess</th>
                <th className="px-3 py-2 text-right font-semibold">PDF</th>
                <th className="px-3 py-2 text-center font-semibold w-[120px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {groupResults.map((group) => {
                const isExpanded = expandedGroups.has(group.groupLabel);
                const groupStatus = group.measuredKg === 0 ? 'PENDING' : group.status;
                const groupStatusConfig = getStatusConfig(groupStatus);
                const groupPdf = calculatePDF(group.measuredKg, group.permissibleKg);

                return (
                  <Fragment key={group.groupLabel}>
                    {/* Group Row (Parent) */}
                    <tr
                      className={cn(
                        'cursor-pointer hover:bg-slate-50 transition-colors',
                        groupStatusConfig.bg,
                        'font-semibold'
                      )}
                      onClick={() => hierarchical && toggleGroup(group.groupLabel)}
                    >
                      <td className={cn('px-3 py-2.5', compact ? 'text-xs' : 'text-sm')}>
                        <div className="flex items-center gap-2">
                          {hierarchical && group.axles && group.axles.length > 0 && (
                            isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-slate-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-slate-500" />
                            )
                          )}
                          <span className="font-bold text-slate-800">
                            Group {group.groupLabel}
                          </span>
                        </div>
                      </td>
                      <td className={cn('px-3 py-2.5 font-medium', compact ? 'text-xs' : 'text-sm')}>
                        {group.axleType}
                        <span className="text-slate-500 ml-1">({group.axleCount} axle{group.axleCount > 1 ? 's' : ''})</span>
                      </td>
                      <td className={cn('px-3 py-2.5 text-right font-mono font-bold', compact ? 'text-xs' : 'text-sm')}>
                        {formatKg(group.permissibleKg)}
                      </td>
                      <td className={cn('px-3 py-2.5 text-right font-mono', compact ? 'text-xs' : 'text-sm')}>
                        {group.toleranceKg > 0 ? (
                          <div className="flex flex-col items-end">
                            <span className="text-amber-600 font-medium">{formatKg(group.permissibleKg + group.toleranceKg)}</span>
                            <span className="text-[10px] text-slate-400">({formatKg(group.toleranceKg)} kg)</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className={cn('px-3 py-2.5 text-right font-mono text-slate-500', compact ? 'text-xs' : 'text-sm')}>
                        {group.operationalToleranceKg ? (
                          <span className="text-blue-600">+{formatKg(group.operationalToleranceKg)}</span>
                        ) : '-'}
                      </td>
                      <td className={cn('px-3 py-2.5 text-right font-mono font-bold', compact ? 'text-xs' : 'text-sm')}>
                        {group.measuredKg > 0 ? formatKg(group.measuredKg) : '-'}
                      </td>
                      <td className={cn('px-3 py-2.5 text-right font-mono font-bold', compact ? 'text-xs' : 'text-sm')}>
                        {group.measuredKg > 0 ? (
                          group.overloadKg > 0 ? (
                            <span className="text-red-600">+{formatKg(group.overloadKg)}</span>
                          ) : (
                            <span className="text-green-600">0</span>
                          )
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className={cn('px-3 py-2.5 text-right font-mono', compact ? 'text-xs' : 'text-sm')}>
                        {group.measuredKg > 0 ? (
                          <span className={cn(groupPdf > 1.2 ? 'text-red-600 font-bold' : '')}>
                            {groupPdf.toFixed(2)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded border font-medium',
                            compact ? 'text-xs' : 'text-xs',
                            groupStatusConfig.badge
                          )}
                        >
                          <groupStatusConfig.icon className="h-3 w-3" />
                          {groupStatusConfig.label}
                        </span>
                      </td>
                    </tr>

                    {/* Axle Rows (Children) */}
                    {hierarchical && isExpanded && group.axles?.map((axle) => {
                      const axlePermissible = axle.permissibleKg || 8000;
                      // Individual axles don't have tolerance - it's applied at group level
                      const axleStatus = axle.measuredKg === 0 ? 'PENDING' : (
                        axle.measuredKg > axlePermissible ? 'WARNING' : 'LEGAL'
                      );
                      const _axleStatusConfig = getStatusConfig(axleStatus);
                      const axlePdf = calculatePDF(axle.measuredKg, axlePermissible);
                      const axleExcess = Math.max(0, axle.measuredKg - axlePermissible);

                      return (
                        <tr
                          key={`${group.groupLabel}-${axle.axleNumber}`}
                          className="bg-white hover:bg-gray-50 text-slate-600"
                        >
                          <td className={cn('px-3 py-2 pl-10', compact ? 'text-xs' : 'text-sm')}>
                            <span className="text-slate-400">└</span>
                            <span className="ml-2">Axle {axle.axleNumber}</span>
                          </td>
                          <td className={cn('px-3 py-2 text-slate-500', compact ? 'text-xs' : 'text-sm')}>
                            {group.axleCount === 1 ? 'Single' : 'Dual'}
                          </td>
                          <td className={cn('px-3 py-2 text-right font-mono text-slate-500', compact ? 'text-xs' : 'text-sm')}>
                            {formatKg(axlePermissible)}
                          </td>
                          <td className={cn('px-3 py-2 text-right text-slate-400', compact ? 'text-xs' : 'text-sm')}>
                            -
                          </td>
                          <td className={cn('px-3 py-2 text-right font-mono', compact ? 'text-xs' : 'text-sm')}>
                            {axle.measuredKg > 0 ? formatKg(axle.measuredKg) : '-'}
                          </td>
                          <td className={cn('px-3 py-2 text-right font-mono', compact ? 'text-xs' : 'text-sm')}>
                            {axle.measuredKg > 0 ? (
                              axleExcess > 0 ? (
                                <span className="text-amber-600">+{formatKg(axleExcess)}</span>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className={cn('px-3 py-2 text-right font-mono text-slate-500', compact ? 'text-xs' : 'text-sm')}>
                            {axle.measuredKg > 0 ? axlePdf.toFixed(2) : '-'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {/* Axle status is informational only */}
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}

              {/* GVW Footer Row */}
              <tr className={cn('font-bold text-lg', gvwStatusConfig.bg, 'border-t-2 border-slate-300')}>
                <td className={cn('px-3 py-3', compact ? 'text-sm' : 'text-base')}>
                  <div className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-slate-700" />
                    <span className="text-slate-900">GVW Total</span>
                  </div>
                </td>
                <td className={cn('px-3 py-3 text-slate-600', compact ? 'text-sm' : 'text-base')}>
                  Gross Vehicle Weight
                </td>
                <td className={cn('px-3 py-3 text-right font-mono', compact ? 'text-sm' : 'text-base')}>
                  {formatKg(gvwPermissible)}
                </td>
                <td className={cn('px-3 py-3 text-right', compact ? 'text-sm' : 'text-base',
                  gvwToleranceKg && gvwToleranceKg > 0 ? 'text-green-600' : 'text-slate-400')}>
                  {gvwToleranceDisplay || '0% (strict)'}
                  {gvwEffectiveLimitKg && gvwToleranceKg && gvwToleranceKg > 0 && (
                    <span className="block text-xs text-slate-400 font-mono">{formatKg(gvwEffectiveLimitKg)}</span>
                  )}
                </td>
                <td className={cn('px-3 py-3 text-right text-slate-400', compact ? 'text-sm' : 'text-base')}>
                  -
                </td>
                <td className={cn('px-3 py-3 text-right font-mono', compact ? 'text-sm' : 'text-base')}>
                  {gvwMeasured > 0 ? formatKg(gvwMeasured) : '-'}
                </td>
                <td className={cn('px-3 py-3 text-right font-mono', compact ? 'text-sm' : 'text-base')}>
                  {gvwMeasured > 0 ? (
                    gvwOverload > 0 ? (
                      <span className="text-red-600">+{formatKg(gvwOverload)}</span>
                    ) : (
                      <span className="text-green-600">0</span>
                    )
                  ) : (
                    '-'
                  )}
                </td>
                <td className={cn('px-3 py-3 text-right font-mono', compact ? 'text-sm' : 'text-base')}>
                  {gvwMeasured > 0 ? (
                    <span className={cn(gvwPdf > 1.2 ? 'text-red-600' : '')}>
                      {gvwPdf.toFixed(2)}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-3 py-3 text-center">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 font-bold',
                      compact ? 'text-xs' : 'text-sm',
                      gvwStatusConfig.badge
                    )}
                  >
                    <gvwStatusConfig.icon className="h-4 w-4" />
                    {gvwStatusConfig.label}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-100">
          {groupResults.map((group) => {
            const groupTolerance = group.toleranceKg;
            const effectiveLimit = group.effectiveLimitKg;
            const groupStatus = group.measuredKg === 0 ? 'PENDING' : group.status;
            const groupStatusConfig = getStatusConfig(groupStatus);
            const groupPdf = calculatePDF(group.measuredKg, group.permissibleKg);

            return (
              <div key={group.groupLabel} className={cn('p-3', groupStatusConfig.bg)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">Group {group.groupLabel}</span>
                    <span className="text-xs text-slate-500">
                      {group.axleType} ({group.axleCount} axle{group.axleCount > 1 ? 's' : ''})
                    </span>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium',
                      groupStatusConfig.badge
                    )}
                  >
                    <groupStatusConfig.icon className="h-3 w-3" />
                    {groupStatusConfig.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Permissible:</span>
                    <span className="ml-1 font-mono font-semibold">{formatKg(group.permissibleKg)} kg</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Tolerance:</span>
                    <span className="ml-1 font-mono">
                      {groupTolerance > 0 ? `${formatKg(effectiveLimit)} kg` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Op. Tol:</span>
                    <span className="ml-1 font-mono">
                      {group.operationalToleranceKg ? `+${group.operationalToleranceKg} kg` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Measured:</span>
                    <span className="ml-1 font-mono font-semibold">
                      {group.measuredKg > 0 ? `${formatKg(group.measuredKg)} kg` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Excess:</span>
                    <span className={cn('ml-1 font-mono font-semibold', group.overloadKg > 0 ? 'text-red-600' : '')}>
                      {group.measuredKg > 0 ? (group.overloadKg > 0 ? `+${formatKg(group.overloadKg)} kg` : '0') : '-'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500">PDF:</span>
                    <span className={cn('ml-1 font-mono', groupPdf > 1.2 ? 'text-red-600 font-semibold' : '')}>
                      {group.measuredKg > 0 ? groupPdf.toFixed(2) : '-'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* GVW Summary (Mobile) */}
          <div className={cn('p-4', gvwStatusConfig.bg, 'border-t-2 border-slate-300')}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-slate-700" />
                <span className="font-bold text-slate-900">GVW Total</span>
              </div>
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-3 py-1 rounded-full border-2 text-sm font-bold',
                  gvwStatusConfig.badge
                )}
              >
                <gvwStatusConfig.icon className="h-4 w-4" />
                {gvwStatusConfig.label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-500">Permissible:</span>
                <span className="ml-1 font-mono font-bold">{formatKg(gvwPermissible)} kg</span>
              </div>
              <div>
                <span className="text-slate-500">Measured:</span>
                <span className="ml-1 font-mono font-bold">
                  {gvwMeasured > 0 ? `${formatKg(gvwMeasured)} kg` : '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Excess:</span>
                <span className={cn('ml-1 font-mono font-bold', gvwOverload > 0 ? 'text-red-600' : 'text-green-600')}>
                  {gvwMeasured > 0 ? (gvwOverload > 0 ? `+${formatKg(gvwOverload)} kg` : '0') : '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-500">PDF:</span>
                <span className={cn('ml-1 font-mono', gvwPdf > 1.2 ? 'text-red-600 font-bold' : '')}>
                  {gvwMeasured > 0 ? gvwPdf.toFixed(2) : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ComplianceTable;
