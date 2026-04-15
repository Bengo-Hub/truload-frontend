"use client";

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatFee, formatFeeUsd, getDecisionMessage, getStatusColor } from '@/lib/weighing-utils';
import { ComplianceStatus } from '@/types/weighing';
import {
    AlertTriangle,
    CheckCircle2,
    CreditCard,
    FileCheck,
    LogOut,
    Printer,
    RefreshCw,
    ShieldAlert,
    Ticket,
    Truck,
} from 'lucide-react';

interface DecisionPanelProps {
  overallStatus: ComplianceStatus;
  totalFeeUsd?: number;
  totalFeeKes?: number;
  chargingCurrency?: string;
  demeritPoints?: number;
  reweighCycleNo?: number;

  // Required field validation
  requiredFieldsValid?: boolean;
  missingFields?: string[];

  // Action handlers
  /** Always available: end session, reset middleware, redirect to capture for next vehicle */
  onFinishExit?: () => void;
  /** For LEGAL/WARNING: print ticket then finish (optional) */
  onFinishAndPrint?: () => void;
  onSendToYard?: () => void;
  onSpecialRelease?: () => void;
  onReweigh?: () => void;
  onPrintTicket?: () => void;
  /** Commercial mode: open payment collection dialog */
  onCollectPayment?: () => void;

  // Permission flags
  canPrint?: boolean;
  canSendToYard?: boolean;
  canSpecialRelease?: boolean;
  canReweigh?: boolean;

  /** When true, vehicle already sent to yard - hide "Send to Yard", show info instead. */
  isSentToYard?: boolean;

  // Loading states
  isFinishing?: boolean;
  isSendingToYard?: boolean;

  /** Commercial weighing tenant mode — hides enforcement actions, shows commercial ticket flow */
  isCommercial?: boolean;
  /** Flat fee to display in commercial mode (KES) */
  commercialWeighingFeeKes?: number;

  /** Operational tolerance (kg) to display in warning message */
  operationalToleranceKg?: number;

  className?: string;
}

/**
 * DecisionPanel - Action panel for weighing decisions
 *
 * 3 primary options:
 * 1. Finish & Print Ticket (LEGAL/WARNING) - green
 * 2. Send to Yard (OVERLOAD) - red
 * 3. Special Release (OVERLOAD/WARNING) - amber
 * Plus optional Re-weigh button (if cycle < 8)
 *
 * Blocks actions if required fields (driver, transporter, origin, destination) are missing.
 */
export function DecisionPanel({
  overallStatus,
  totalFeeUsd = 0,
  totalFeeKes = 0,
  chargingCurrency,
  demeritPoints = 0,
  reweighCycleNo = 0,
  requiredFieldsValid = true,
  missingFields = [],
  onFinishExit,
  onFinishAndPrint,
  onSendToYard,
  onSpecialRelease,
  onReweigh,
  onPrintTicket,
  onCollectPayment,
  canPrint = true,
  canSendToYard = true,
  canSpecialRelease = false,
  canReweigh = false,
  isSentToYard = false,
  isFinishing = false,
  isSendingToYard = false,
  isCommercial = false,
  commercialWeighingFeeKes = 500,
  operationalToleranceKg = 200,
  className,
}: DecisionPanelProps) {
  const statusMessage = getDecisionMessage(overallStatus);
  const showFee = !isCommercial && overallStatus === 'OVERLOAD' && (totalFeeUsd > 0 || totalFeeKes > 0);
  const isOverloaded = overallStatus === 'OVERLOAD';
  const isLegalOrWarning = overallStatus === 'LEGAL' || overallStatus === 'WARNING';
  const actionsDisabled = !requiredFieldsValid;

  // Commercial mode: always show green border (no enforcement compliance verdict)
  const borderColor = isCommercial
    ? 'border-t-blue-500'
    : isOverloaded
      ? 'border-t-red-500'
      : overallStatus === 'WARNING'
        ? 'border-t-yellow-500'
        : 'border-t-green-500';

  return (
    <Card className={cn('border-t-4 rounded-xl', borderColor, className)}>
      <CardContent className="p-4 sm:p-6 space-y-4">
        {/* Status Section */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            {/* Commercial mode: show fee info instead of enforcement compliance badge */}
            {isCommercial ? (
              <div className="flex items-center gap-3">
                <Badge className="px-4 py-2 text-base font-semibold bg-blue-100 text-blue-800 border-blue-300">
                  Commercial Weighing
                </Badge>
                <span className="text-sm text-gray-600">
                  Weighing fee:{' '}
                  <span className="font-bold text-blue-700">KES {commercialWeighingFeeKes.toLocaleString()}</span>
                </span>
              </div>
            ) : (
              <>
                <Badge className={cn('px-4 py-2 text-base font-semibold', getStatusColor(overallStatus))}>
                  {statusMessage}
                </Badge>

                {showFee && (
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600">
                      Fee:{' '}
                      <span className="font-bold text-red-600">{formatFee(totalFeeUsd, totalFeeKes, chargingCurrency)}</span>
                    </span>
                    {demeritPoints > 0 && (
                      <span className="text-gray-600">
                        Demerit:{' '}
                        <span className="font-bold text-red-600">{demeritPoints}</span>
                      </span>
                    )}
                  </div>
                )}

                {overallStatus === 'WARNING' && (
                  <div className="flex items-center gap-2 text-sm text-yellow-700">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Within operational tolerance (≤{operationalToleranceKg}kg)</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Print button - always available (enforcement mode) */}
          {!isCommercial && canPrint && onPrintTicket && (
            <Button variant="outline" size="sm" onClick={onPrintTicket}>
              <Printer className="mr-2 h-4 w-4" />
              Print Ticket
            </Button>
          )}
        </div>

        {/* Missing Fields Warning */}
        {!requiredFieldsValid && missingFields.length > 0 && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">Missing required fields</p>
              <p className="text-amber-700">
                Please fill in: {missingFields.join(', ')} before taking action.
              </p>
            </div>
          </div>
        )}

        {/* Decision Actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {/* Finish & Exit - always visible */}
          {onFinishExit && (
            <Button
              variant="outline"
              className="flex-1 sm:flex-initial border-green-600 text-green-700 hover:bg-green-50 hover:text-green-800"
              onClick={onFinishExit}
              disabled={isFinishing}
            >
              {isFinishing ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              {isFinishing ? 'Finishing...' : 'Finish & Exit'}
            </Button>
          )}

          {/* ── COMMERCIAL MODE ACTIONS ── */}
          {isCommercial && (
            <>
              {/* Issue Commercial Ticket - primary action (print & finish) */}
              {onFinishAndPrint && (
                <Button
                  className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={onFinishAndPrint}
                  disabled={actionsDisabled || isFinishing}
                >
                  <Ticket className="mr-2 h-4 w-4" />
                  Issue Commercial Ticket
                </Button>
              )}

              {/* Collect Payment */}
              {onCollectPayment && (
                <Button
                  variant="outline"
                  className="flex-1 sm:flex-initial border-blue-500 text-blue-700 hover:bg-blue-50"
                  onClick={onCollectPayment}
                  disabled={actionsDisabled}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Collect Payment
                </Button>
              )}
            </>
          )}

          {/* ── ENFORCEMENT MODE ACTIONS ── */}
          {!isCommercial && (
            <>
              {/* Finish & Print Ticket - for LEGAL/WARNING */}
              {isLegalOrWarning && onFinishAndPrint && (
                <Button
                  className="flex-1 sm:flex-initial bg-green-600 hover:bg-green-700 text-white"
                  onClick={onFinishAndPrint}
                  disabled={actionsDisabled || isFinishing}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Finish & Print Ticket
                </Button>
              )}

              {/* Send to Yard - for OVERLOAD (hidden when already sent) */}
              {isOverloaded && canSendToYard && !isSentToYard && (
                <Button
                  variant="destructive"
                  className="flex-1 sm:flex-initial"
                  onClick={onSendToYard}
                  disabled={actionsDisabled || isSendingToYard}
                >
                  {isSendingToYard ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Truck className="mr-2 h-4 w-4" />
                  )}
                  {isSendingToYard ? 'Sending...' : 'Send to Yard'}
                </Button>
              )}

              {/* Vehicle sent to yard info */}
              {isOverloaded && isSentToYard && (
                <div className="flex items-center gap-2 p-3 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700">
                  <Truck className="h-4 w-4 text-slate-500" />
                  <span>Vehicle has been sent to yard</span>
                </div>
              )}

              {/* Special Release - for OVERLOAD/WARNING */}
              {(isOverloaded || overallStatus === 'WARNING') && canSpecialRelease && (
                <Button
                  variant="secondary"
                  className="flex-1 sm:flex-initial bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={onSpecialRelease}
                  disabled={actionsDisabled}
                >
                  <FileCheck className="mr-2 h-4 w-4" />
                  Special Release
                </Button>
              )}
            </>
          )}

          {/* Re-weigh - optional, when allowed (both modes) */}
          {canReweigh && reweighCycleNo < 8 && (
            <Button
              variant="outline"
              className="flex-1 sm:flex-initial"
              onClick={onReweigh}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Re-weigh {reweighCycleNo > 0 && `(${reweighCycleNo}/8)`}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
