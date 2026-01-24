"use client";

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatFeeUsd, getDecisionMessage, getStatusColor } from '@/lib/weighing-utils';
import { ComplianceStatus } from '@/types/weighing';
import { cn } from '@/lib/utils';
import { Printer, Tag, Truck, FileCheck, AlertTriangle } from 'lucide-react';

interface DecisionPanelProps {
  overallStatus: ComplianceStatus;
  totalFeeUsd?: number;
  demeritPoints?: number;
  canPrint?: boolean;
  canTag?: boolean;
  canSendToYard?: boolean;
  canSpecialRelease?: boolean;
  onPrintTicket?: () => void;
  onTagVehicle?: () => void;
  onSendToYard?: () => void;
  onSpecialRelease?: () => void;
  className?: string;
}

/**
 * DecisionPanel - Action panel for weighing decisions
 *
 * Displays:
 * - Overall compliance status badge
 * - Fee information (if overloaded)
 * - Action buttons: Print Ticket, Tag Vehicle, Send to Yard, Special Release
 *
 * Based on WEIGHING_SCREEN_SPECIFICATION.md Action/Decision Panel.
 */
export function DecisionPanel({
  overallStatus,
  totalFeeUsd = 0,
  demeritPoints = 0,
  canPrint = true,
  canTag = true,
  canSendToYard = true,
  canSpecialRelease = false,
  onPrintTicket,
  onTagVehicle,
  onSendToYard,
  onSpecialRelease,
  className,
}: DecisionPanelProps) {
  const statusMessage = getDecisionMessage(overallStatus);
  const showFee = overallStatus === 'OVERLOAD' && totalFeeUsd > 0;
  const showOverloadActions = overallStatus === 'OVERLOAD';

  return (
    <Card
      className={cn(
        'border-t-4 rounded-xl',
        overallStatus === 'OVERLOAD'
          ? 'border-t-red-500'
          : overallStatus === 'WARNING'
            ? 'border-t-yellow-500'
            : 'border-t-green-500',
        className
      )}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Status Section */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Badge className={cn('px-4 py-2 text-base font-semibold', getStatusColor(overallStatus))}>
              {statusMessage}
            </Badge>

            {showFee && (
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-600">
                  Estimated Fee:{' '}
                  <span className="font-bold text-red-600">{formatFeeUsd(totalFeeUsd)}</span>
                </span>
                {demeritPoints > 0 && (
                  <span className="text-gray-600">
                    Demerit Points:{' '}
                    <span className="font-bold text-red-600">{demeritPoints}</span>
                  </span>
                )}
              </div>
            )}

            {overallStatus === 'WARNING' && (
              <div className="flex items-center gap-2 text-sm text-yellow-700">
                <AlertTriangle className="h-4 w-4" />
                <span>Within operational tolerance (≤200kg)</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={!canPrint} onClick={onPrintTicket}>
              <Printer className="mr-2 h-4 w-4" />
              Print Ticket
            </Button>

            {showOverloadActions && (
              <>
                <Button variant="outline" disabled={!canTag} onClick={onTagVehicle}>
                  <Tag className="mr-2 h-4 w-4" />
                  Tag Vehicle
                </Button>

                <Button variant="destructive" disabled={!canSendToYard} onClick={onSendToYard}>
                  <Truck className="mr-2 h-4 w-4" />
                  Send to Yard
                </Button>

                {canSpecialRelease && (
                  <Button variant="secondary" onClick={onSpecialRelease}>
                    <FileCheck className="mr-2 h-4 w-4" />
                    Special Release
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
