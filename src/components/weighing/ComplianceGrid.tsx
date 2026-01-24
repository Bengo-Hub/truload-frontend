"use client";

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  formatOverload,
  formatPDF,
  formatWeight,
  getAxleTypeLabel,
  getStatusColor,
} from '@/lib/weighing-utils';
import { AxleGroupResult, ComplianceStatus } from '@/types/weighing';
import { cn } from '@/lib/utils';

interface ComplianceGridProps {
  groupResults: AxleGroupResult[];
  gvwPermissibleKg: number;
  gvwMeasuredKg: number;
  gvwOverloadKg: number;
  overallStatus: ComplianceStatus;
  isPending?: boolean;
  showPDF?: boolean;
  showTolerance?: boolean;
  className?: string;
}

/**
 * ComplianceGrid - Unified hierarchical weight display
 *
 * Implements the Superior Approach from the KenloadV2 comparison:
 * - Single hierarchical table with Groups as parents, Axles as children
 * - Group rows are bold (primary compliance check)
 * - Axle rows are lighter (diagnostic detail)
 * - GVW row is highlighted at bottom
 *
 * Based on WEIGHING_SCREEN_SPECIFICATION.md requirements.
 */
export function ComplianceGrid({
  groupResults,
  gvwPermissibleKg,
  gvwMeasuredKg,
  gvwOverloadKg,
  overallStatus,
  isPending = false,
  showPDF = false,
  showTolerance = false,
  className,
}: ComplianceGridProps) {
  const getGroupStatus = (group: AxleGroupResult): ComplianceStatus | 'PENDING' => {
    if (isPending || group.measuredKg === 0) return 'PENDING';
    return group.status;
  };

  const getGvwStatus = (): ComplianceStatus | 'PENDING' => {
    if (isPending || gvwMeasuredKg === 0) return 'PENDING';
    return gvwOverloadKg > 0 ? 'OVERLOAD' : 'LEGAL';
  };

  return (
    <Card className={cn('border border-gray-200 rounded-xl', className)}>
      <CardHeader className="pb-3 pt-5 px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Compliance Status</CardTitle>
          <Badge className={cn('text-sm px-3 py-1', getStatusColor(isPending ? 'LEGAL' : overallStatus))}>
            {isPending ? 'PENDING' : overallStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[450px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="font-semibold text-gray-900 h-11 pl-6 w-[120px]">Group/Axle</TableHead>
                <TableHead className="font-semibold text-gray-900 h-11">Type</TableHead>
                <TableHead className="font-semibold text-gray-900 h-11 text-right">Limit (kg)</TableHead>
                {showTolerance && (
                  <TableHead className="font-semibold text-gray-900 h-11 text-right">Tol. (kg)</TableHead>
                )}
                <TableHead className="font-semibold text-gray-900 h-11 text-right">Measured (kg)</TableHead>
                <TableHead className="font-semibold text-gray-900 h-11 text-right">Excess (kg)</TableHead>
                {showPDF && (
                  <TableHead className="font-semibold text-gray-900 h-11 text-right">PDF</TableHead>
                )}
                <TableHead className="font-semibold text-gray-900 h-11 pr-6 text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupResults.map((group) => {
                const groupStatus = getGroupStatus(group);
                return (
                  <>
                    {/* Group Row - Primary compliance check */}
                    <TableRow
                      key={group.groupLabel}
                      className="font-medium bg-gray-50/50 hover:bg-gray-100/50 border-b border-gray-100"
                    >
                      <TableCell className="font-bold text-gray-900 py-3 pl-6">
                        Group {group.groupLabel}
                      </TableCell>
                      <TableCell className="text-gray-700 py-3">
                        {getAxleTypeLabel(group.axleType)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-gray-700 py-3">
                        {formatWeight(group.permissibleKg)}
                      </TableCell>
                      {showTolerance && (
                        <TableCell className="text-right font-mono text-gray-500 py-3">
                          {group.toleranceKg > 0 ? `+${formatWeight(group.toleranceKg)}` : '-'}
                        </TableCell>
                      )}
                      <TableCell className="text-right font-mono font-bold text-gray-900 py-3">
                        {group.measuredKg > 0 ? formatWeight(group.measuredKg) : '-'}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-mono py-3',
                          group.overloadKg > 0 ? 'text-red-600 font-bold' : 'text-gray-400'
                        )}
                      >
                        {formatOverload(group.overloadKg)}
                      </TableCell>
                      {showPDF && (
                        <TableCell className="text-right font-mono text-gray-600 py-3">
                          {group.measuredKg > 0 ? formatPDF(group.pavementDamageFactor) : '-'}
                        </TableCell>
                      )}
                      <TableCell className="text-center py-3 pr-6">
                        <Badge
                          variant="outline"
                          className={cn(
                            'font-medium',
                            groupStatus === 'PENDING'
                              ? 'text-gray-500 border-gray-300'
                              : getStatusColor(groupStatus as ComplianceStatus)
                          )}
                        >
                          {groupStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>

                    {/* Axle Children - Diagnostic detail */}
                    {group.axles.map((axle) => (
                      <TableRow
                        key={`${group.groupLabel}-${axle.axleNumber}`}
                        className="text-gray-500 text-sm hover:bg-gray-50"
                      >
                        <TableCell className="pl-10 py-2">└ Axle {axle.axleNumber}</TableCell>
                        <TableCell className="py-2">{group.axleCount === 1 ? 'Single' : 'Dual'}</TableCell>
                        <TableCell className="text-right font-mono py-2">
                          {formatWeight(axle.permissibleKg)}
                        </TableCell>
                        {showTolerance && <TableCell className="text-right py-2">-</TableCell>}
                        <TableCell className="text-right font-mono py-2">
                          {axle.measuredKg > 0 ? formatWeight(axle.measuredKg) : '-'}
                        </TableCell>
                        <TableCell className="text-right py-2">-</TableCell>
                        {showPDF && <TableCell className="text-right py-2">-</TableCell>}
                        <TableCell className="text-center py-2 pr-6">-</TableCell>
                      </TableRow>
                    ))}
                  </>
                );
              })}

              {/* GVW Summary Row - Highlighted */}
              <TableRow className="bg-gray-100 font-bold border-t-2 border-gray-300 hover:bg-gray-100">
                <TableCell colSpan={2} className="text-lg text-gray-900 py-4 pl-6">
                  GVW Total
                </TableCell>
                <TableCell className="text-right font-mono text-lg text-gray-900 py-4">
                  {formatWeight(gvwPermissibleKg)}
                </TableCell>
                {showTolerance && (
                  <TableCell className="text-right text-gray-500 py-4">0% (strict)</TableCell>
                )}
                <TableCell className="text-right font-mono text-lg text-gray-900 py-4">
                  {gvwMeasuredKg > 0 ? formatWeight(gvwMeasuredKg) : '-'}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right font-mono text-lg py-4',
                    gvwOverloadKg > 0 ? 'text-red-600' : 'text-gray-400'
                  )}
                >
                  {formatOverload(gvwOverloadKg)}
                </TableCell>
                {showPDF && <TableCell className="text-right py-4">-</TableCell>}
                <TableCell className="text-center py-4 pr-6">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-sm px-3 py-1',
                      getGvwStatus() === 'PENDING'
                        ? 'text-gray-500 border-gray-300'
                        : getStatusColor(getGvwStatus() as ComplianceStatus)
                    )}
                  >
                    {getGvwStatus()}
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
