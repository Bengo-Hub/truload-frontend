"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DecisionPanel } from '../DecisionPanel';
import { ComplianceStatus } from '@/types/weighing';
import { ChevronLeft } from 'lucide-react';

interface WeighingDecisionStepProps {
  ticketNumber: string;
  vehiclePlate: string;
  gvwMeasured: number;
  reweighCycleNo: number;
  overallStatus: ComplianceStatus;
  totalFeeUsd: number;
  totalFeeKes?: number;
  chargingCurrency?: string;
  isValid: boolean;
  missingFields: string[];
  isSentToYard?: boolean;

  // Permissions
  canPrint?: boolean;
  canSendToYard?: boolean;
  canSpecialRelease?: boolean;
  canReweigh?: boolean;

  // Handlers
  onFinishOnly: () => void;
  onFinishAndNew: () => void;
  onSendToYard: () => void;
  onSpecialRelease: () => void;
  onReweigh: () => void;
  onPrintTicket: () => void;
  onCollectPayment?: () => void;

  // Loading states
  isFinishing?: boolean;
  isSendingToYard?: boolean;

  // Commercial mode
  isCommercial?: boolean;
  commercialWeighingFeeKes?: number;

  // Navigation
  onBack?: () => void;
  operationalToleranceKg?: number;
}

export function WeighingDecisionStep({
  ticketNumber,
  vehiclePlate,
  gvwMeasured,
  reweighCycleNo,
  overallStatus,
  totalFeeUsd,
  totalFeeKes,
  chargingCurrency,
  isValid,
  missingFields,
  isSentToYard,
  canPrint,
  canSendToYard,
  canSpecialRelease,
  canReweigh,
  onFinishOnly,
  onFinishAndNew,
  onSendToYard,
  onSpecialRelease,
  onReweigh,
  onPrintTicket,
  onCollectPayment,
  isFinishing,
  isSendingToYard,
  isCommercial = false,
  commercialWeighingFeeKes,
  onBack,
  operationalToleranceKg,
}: WeighingDecisionStepProps) {
  return (
    <div className="space-y-4">
      {/* Vehicle Summary */}
      <Card className="border border-gray-200 rounded-xl">
        <CardContent className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">Vehicle:</span>
              <span className="font-mono font-bold text-lg">{vehiclePlate}</span>
              <span className="text-sm text-gray-400">|</span>
              <span className="text-sm text-gray-500">Ticket:</span>
              <span className="font-mono font-bold text-blue-600">{ticketNumber}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">GVW:</span>
              <span className="font-mono font-bold">
                {gvwMeasured.toLocaleString()} kg
              </span>
            </div>
          </div>
          {reweighCycleNo > 0 && (
            <span className="text-xs bg-gray-800 text-white px-2 py-1 rounded">
              Re-weigh: {reweighCycleNo}
            </span>
          )}
        </CardContent>
      </Card>

      {/* Decision Panel */}
      <DecisionPanel
        overallStatus={overallStatus}
        totalFeeUsd={totalFeeUsd}
        totalFeeKes={totalFeeKes}
        chargingCurrency={chargingCurrency}
        demeritPoints={0}
        reweighCycleNo={reweighCycleNo}
        requiredFieldsValid={isValid}
        missingFields={missingFields}
        onFinishExit={onFinishOnly}
        onFinishAndPrint={onFinishAndNew}
        onSendToYard={onSendToYard}
        onSpecialRelease={onSpecialRelease}
        onReweigh={onReweigh}
        onPrintTicket={onPrintTicket}
        onCollectPayment={onCollectPayment}
        canPrint={canPrint}
        canSendToYard={canSendToYard}
        canSpecialRelease={canSpecialRelease}
        canReweigh={canReweigh}
        isSentToYard={isSentToYard}
        isFinishing={isFinishing}
        isSendingToYard={isSendingToYard}
        isCommercial={isCommercial}
        commercialWeighingFeeKes={commercialWeighingFeeKes}
        operationalToleranceKg={operationalToleranceKg}
      />

      {onBack && (
        <div className="flex justify-start">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      )}
    </div>
  );
}
