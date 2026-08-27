"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CommercialNetWeightDisplay } from '@/components/weighing/CommercialNetWeightDisplay';
import { cn } from '@/lib/utils';
import { formatWeight } from '@/lib/weighing-utils';
import type { CommercialWeighingResult, UpdateQualityDeductionRequest } from '@/types/weighing';
import { AlertTriangle, CheckCircle2, CreditCard, FileDown, Printer } from 'lucide-react';
import { useState } from 'react';

/** The subset of CargoType fields needed to decide whether the formula-driven quality deduction UI applies. */
export interface CargoQualityParams {
  moistureTargetPercent?: number;
  foreignMatterLimitPercent?: number;
}

interface CommercialTicketStepProps {
  /** Current transaction result */
  result: CommercialWeighingResult;
  /** Cargo details form values */
  cargoDetails: CargoDetailsForm;
  /** Callback when cargo details change */
  onCargoDetailsChange: (details: Partial<CargoDetailsForm>) => void;
  /** Quality parameters (moisture target / foreign matter limit) of the selected cargo type, when configured. */
  cargoQualityParams?: CargoQualityParams;
  /** Apply a quality deduction — either a manual kg override or actual moisture/FM readings for the backend to compute from. */
  onApplyQualityDeduction: (payload: UpdateQualityDeductionRequest) => void;
  /** Whether a quality deduction update is in progress */
  isApplyingDeduction: boolean;
  /** Print ticket callback */
  onPrintTicket: () => void;
  /** Complete transaction callback */
  onComplete: () => void;
  /** Open treasury payment modal (commercial only) */
  onCollectPayment?: () => void;
  /** Whether operations are loading */
  isLoading: boolean;
  className?: string;
}

export interface CargoDetailsForm {
  consignmentNo: string;
  orderReference: string;
  cargoType: string;
  origin: string;
  destination: string;
  sealNumbers: string;
  trailerRegNo: string;
  expectedNetWeightKg: string;
  remarks: string;
}

/**
 * CommercialTicketStep - Final step: cargo details, weight summary, print ticket.
 */
export function CommercialTicketStep({
  result,
  cargoDetails,
  onCargoDetailsChange,
  cargoQualityParams,
  onApplyQualityDeduction,
  isApplyingDeduction,
  onPrintTicket,
  onComplete,
  onCollectPayment,
  isLoading,
  className,
}: CommercialTicketStepProps) {
  const [showDeductionForm, setShowDeductionForm] = useState(false);
  const expectedNet = cargoDetails.expectedNetWeightKg ? parseInt(cargoDetails.expectedNetWeightKg, 10) : null;
  const discrepancy = expectedNet && result.netWeightKg
    ? result.netWeightKg - expectedNet
    : null;

  // Quality deduction: either derived from a formula (actual moisture/FM readings vs. the
  // cargo type's configured target/limit) or a flat manual kg override + reason.
  const moistureTarget = cargoQualityParams?.moistureTargetPercent;
  const foreignMatterLimit = cargoQualityParams?.foreignMatterLimitPercent;
  const hasQualityParams = moistureTarget != null || foreignMatterLimit != null;

  const [deductionMode, setDeductionMode] = useState<'automatic' | 'manual'>('automatic');
  const [actualMoisturePercent, setActualMoisturePercent] = useState('');
  const [actualForeignMatterPercent, setActualForeignMatterPercent] = useState('');
  const [manualDeductionKg, setManualDeductionKg] = useState('');
  const [manualDeductionReason, setManualDeductionReason] = useState('');

  const netForPreview = result.netWeightKg ?? 0;
  const actualMoistureNum = parseFloat(actualMoisturePercent);
  const actualForeignMatterNum = parseFloat(actualForeignMatterPercent);
  const moistureDeductionKg = (moistureTarget != null && !isNaN(actualMoistureNum) && actualMoistureNum > moistureTarget)
    ? netForPreview * (actualMoistureNum - moistureTarget) / 100
    : 0;
  const foreignMatterDeductionKg = (foreignMatterLimit != null && !isNaN(actualForeignMatterNum) && actualForeignMatterNum > foreignMatterLimit)
    ? netForPreview * actualForeignMatterNum / 100
    : 0;
  const previewDeductionKg = moistureDeductionKg + foreignMatterDeductionKg;

  const openDeductionForm = () => {
    setDeductionMode(hasQualityParams ? 'automatic' : 'manual');
    setShowDeductionForm(true);
  };

  const closeDeductionForm = () => {
    setShowDeductionForm(false);
    setActualMoisturePercent('');
    setActualForeignMatterPercent('');
    setManualDeductionKg('');
    setManualDeductionReason('');
  };

  const handleApplyAutomatic = () => {
    const payload: UpdateQualityDeductionRequest = {};
    if (!isNaN(actualMoistureNum)) payload.actualMoisturePercent = actualMoistureNum;
    if (!isNaN(actualForeignMatterNum)) payload.actualForeignMatterPercent = actualForeignMatterNum;
    onApplyQualityDeduction(payload);
  };

  const handleApplyManual = () => {
    const kg = parseInt(manualDeductionKg, 10);
    if (!kg || kg <= 0) return;
    onApplyQualityDeduction({ qualityDeductionKg: kg, reason: manualDeductionReason || undefined });
  };

  const canApplyAutomatic = actualMoisturePercent.trim().length > 0 || actualForeignMatterPercent.trim().length > 0;
  const canApplyManual = manualDeductionKg.trim().length > 0 && parseInt(manualDeductionKg, 10) > 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Net weight display */}
      <CommercialNetWeightDisplay
        tareWeightKg={result.tareWeightKg ?? undefined}
        grossWeightKg={result.grossWeightKg ?? undefined}
        netWeightKg={result.netWeightKg ?? undefined}
        qualityDeductionKg={result.qualityDeductionKg ?? undefined}
        adjustedNetWeightKg={result.adjustedNetWeightKg ?? undefined}
      />

      {/* Weight summary card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Weight Summary
            <span className="font-mono text-sm text-gray-500">#{result.ticketNumber}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xs text-gray-500 uppercase mb-1">Tare</div>
              <div className="font-mono text-lg font-bold text-blue-700">
                {formatWeight(result.tareWeightKg ?? 0)}
              </div>
              <div className="text-xs text-gray-500">kg</div>
              {result.tareSource && result.tareSource !== 'measured' && (
                <div className="text-xs text-blue-500 mt-1">{result.tareSource}</div>
              )}
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg">
              <div className="text-xs text-gray-500 uppercase mb-1">Gross</div>
              <div className="font-mono text-lg font-bold text-amber-700">
                {formatWeight(result.grossWeightKg ?? 0)}
              </div>
              <div className="text-xs text-gray-500">kg</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="text-xs text-gray-500 uppercase mb-1">Net Weight</div>
              <div className="font-mono text-xl font-bold text-green-700">
                {formatWeight(result.netWeightKg ?? 0)}
              </div>
              <div className="text-xs text-gray-500">kg</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 uppercase mb-1">
                {result.qualityDeductionKg ? 'Adjusted Net' : 'Quality Ded.'}
              </div>
              <div className="font-mono text-lg font-bold text-gray-700">
                {result.qualityDeductionKg
                  ? formatWeight(result.adjustedNetWeightKg ?? result.netWeightKg ?? 0)
                  : '--'}
              </div>
              <div className="text-xs text-gray-500">
                {result.qualityDeductionKg ? 'kg' : 'None'}
              </div>
            </div>
          </div>

          {/* Discrepancy indicator */}
          {discrepancy != null && (
            <div className={cn(
              'mt-4 p-3 rounded-lg flex items-center gap-2 text-sm',
              Math.abs(discrepancy) > (expectedNet! * 0.02)
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-green-50 border border-green-200 text-green-800'
            )}>
              {Math.abs(discrepancy) > (expectedNet! * 0.02) ? (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              )}
              <span>
                Expected: <span className="font-mono font-bold">{formatWeight(expectedNet!)}</span> kg
                {' | '}
                Actual: <span className="font-mono font-bold">{formatWeight(result.netWeightKg ?? 0)}</span> kg
                {' | '}
                Discrepancy: <span className="font-mono font-bold">
                  {discrepancy > 0 ? '+' : ''}{formatWeight(discrepancy)}
                </span> kg
              </span>
            </div>
          )}

          {/* Quality deduction */}
          {!showDeductionForm && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={openDeductionForm}
            >
              {result.qualityDeductionKg ? 'Edit Quality Deduction' : 'Add Quality Deduction'}
            </Button>
          )}

          {showDeductionForm && (
            <div className="mt-4 p-3 border border-gray-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Label className="text-sm font-medium">Quality Deduction</Label>
                {hasQualityParams && (
                  <div className="flex gap-1 rounded-md border p-0.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={deductionMode === 'automatic' ? 'default' : 'ghost'}
                      className="h-7 px-2 text-xs"
                      onClick={() => setDeductionMode('automatic')}
                    >
                      Automatic (formula)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={deductionMode === 'manual' ? 'default' : 'ghost'}
                      className="h-7 px-2 text-xs"
                      onClick={() => setDeductionMode('manual')}
                    >
                      Manual override
                    </Button>
                  </div>
                )}
              </div>

              {deductionMode === 'automatic' && hasQualityParams ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {moistureTarget != null && (
                      <div>
                        <Label className="text-xs text-gray-500">Actual Moisture % (target {moistureTarget}%)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="0.1"
                          value={actualMoisturePercent}
                          onChange={(e) => setActualMoisturePercent(e.target.value)}
                          placeholder="0.0"
                        />
                      </div>
                    )}
                    {foreignMatterLimit != null && (
                      <div>
                        <Label className="text-xs text-gray-500">Actual Foreign Matter % (limit {foreignMatterLimit}%)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="0.1"
                          value={actualForeignMatterPercent}
                          onChange={(e) => setActualForeignMatterPercent(e.target.value)}
                          placeholder="0.0"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Estimated deduction:{' '}
                    <span className="font-mono font-semibold text-gray-700">
                      {formatWeight(previewDeductionKg)} kg
                    </span>{' '}
                    — preview only, the server computes and persists the final value.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={!canApplyAutomatic || isApplyingDeduction}
                      onClick={handleApplyAutomatic}
                    >
                      {isApplyingDeduction ? 'Applying...' : 'Apply Deduction'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={closeDeductionForm}>
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500">Deduction (kg)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={manualDeductionKg}
                        onChange={(e) => setManualDeductionKg(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Reason</Label>
                      <Input
                        value={manualDeductionReason}
                        onChange={(e) => setManualDeductionReason(e.target.value)}
                        placeholder="e.g. Moisture"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={!canApplyManual || isApplyingDeduction}
                      onClick={handleApplyManual}
                    >
                      {isApplyingDeduction ? 'Applying...' : 'Apply Deduction'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={closeDeductionForm}>
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cargo details form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cargo Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-gray-500">Consignment No</Label>
              <Input
                value={cargoDetails.consignmentNo}
                onChange={(e) => onCargoDetailsChange({ consignmentNo: e.target.value })}
                placeholder="Delivery note / consignment number"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Order Reference</Label>
              <Input
                value={cargoDetails.orderReference}
                onChange={(e) => onCargoDetailsChange({ orderReference: e.target.value })}
                placeholder="PO / Sales order / Dispatch ref"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Seal Numbers</Label>
              <Input
                value={cargoDetails.sealNumbers}
                onChange={(e) => onCargoDetailsChange({ sealNumbers: e.target.value })}
                placeholder="Container/trailer seals (comma-separated)"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Trailer Registration</Label>
              <Input
                value={cargoDetails.trailerRegNo}
                onChange={(e) => onCargoDetailsChange({ trailerRegNo: e.target.value })}
                placeholder="Trailer reg number"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Expected Net Weight (kg)</Label>
              <Input
                type="number"
                value={cargoDetails.expectedNetWeightKg}
                onChange={(e) => onCargoDetailsChange({ expectedNetWeightKg: e.target.value })}
                placeholder="Expected weight from order"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-gray-500">Remarks</Label>
              <Textarea
                value={cargoDetails.remarks}
                onChange={(e) => onCargoDetailsChange({ remarks: e.target.value })}
                placeholder="Operator notes or observations"
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-4">
        <Button
          variant="outline"
          size="lg"
          className="gap-2"
          onClick={onPrintTicket}
          disabled={isLoading}
        >
          <Printer className="h-4 w-4" />
          Print Ticket
        </Button>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              onPrintTicket();
            }}
            disabled={isLoading}
          >
            <FileDown className="h-4 w-4" />
            Download PDF
          </Button>
          {onCollectPayment && (
            <Button
              size="lg"
              variant="outline"
              className="gap-2 border-amber-500 text-amber-700 hover:bg-amber-50"
              onClick={onCollectPayment}
              disabled={isLoading || result.invoiceStatus === 'paid'}
            >
              <CreditCard className="h-4 w-4" />
              {result.invoiceStatus === 'paid' ? 'Paid' : `Pay ${result.invoiceAmountKes ? `KES ${result.invoiceAmountKes.toLocaleString()}` : 'Fee'}`}
            </Button>
          )}
          <Button
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white gap-2"
            onClick={onComplete}
            disabled={isLoading}
          >
            <CheckCircle2 className="h-4 w-4" />
            {isLoading ? 'Processing...' : 'Complete'}
          </Button>
        </div>
      </div>
    </div>
  );
}
