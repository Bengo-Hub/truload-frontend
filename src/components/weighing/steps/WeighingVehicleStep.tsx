"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AxleConfiguration, ComplianceStatus } from '@/types/weighing';
import { ChevronLeft, ChevronRight, Scale } from 'lucide-react';
import React from 'react';
import { AxleConfigurationCard } from '../AxleConfigurationCard';
import { ComplianceBanner } from '../ComplianceBanner';
import { ComplianceTable } from '../ComplianceTable';
import { VehicleDetailsCard } from '../VehicleDetailsCard';

interface WeighingVehicleStepProps {
  // Vehicle Header Info
  ticketNumber: string;
  vehiclePlate: string;
  handleCancelWeighing: () => void;
  
  // Left Column - Axle Config
  selectedConfig: string;
  axleConfigurations: AxleConfiguration[];
  onConfigChange: (config: string) => void;
  capturedAxles: number[];
  currentAxle: number;
  onAxleSelect?: (axle: number) => void;
  
  // Custom Middle Section (e.g. Mobile WeightCaptureCard or Multideck Weight Results)
  children?: React.ReactNode;
  
  // Left Column - Compliance Table
  groupResults: any[];
  gvwPermissible: number;
  gvwMeasured: number;
  gvwOverload: number;
  overallStatus: ComplianceStatus;
  
  // Right Column - Vehicle Details
  vehicleDetailsProps: any; // Props for VehicleDetailsCard
  
  // Right Column - Compliance Banner
  allAxlesCaptured: boolean;
  reweighCycleNo: number;
  
  isWeightConfirmed?: boolean; // Added
  onTakeWeight?: () => void; // Added
  handlePrevStep: () => void;
  handleProceedToDecision: () => void;
  isProceedDisabled: boolean;
  isWeighingLoading: boolean;
  proceedButtonText?: string;
}

export function WeighingVehicleStep({
  ticketNumber,
  vehiclePlate,
  handleCancelWeighing,
  selectedConfig,
  axleConfigurations,
  onConfigChange,
  capturedAxles,
  currentAxle,
  onAxleSelect,
  children,
  groupResults,
  gvwPermissible,
  gvwMeasured,
  gvwOverload,
  overallStatus,
  vehicleDetailsProps,
  allAxlesCaptured,
  reweighCycleNo,
  isWeightConfirmed = false, // Added with default
  onTakeWeight, // Added
  handlePrevStep,
  handleProceedToDecision,
  isProceedDisabled,
  isWeighingLoading,
  proceedButtonText = 'Proceed to Decision',
}: WeighingVehicleStepProps) {
  return (
    <div className="space-y-4">
      {/* Top Row: Ticket Info */}
      <Card className="border-gray-200">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-mono font-bold text-lg">{ticketNumber}</span>
            <span className="text-gray-400">|</span>
            <span className="font-mono text-xl font-bold text-blue-600">{vehiclePlate}</span>
          </div>
          <Button variant="destructive" size="sm" onClick={handleCancelWeighing}>
            CANCEL WEIGHING
          </Button>
        </CardContent>
      </Card>

      {/* Left column sets height (no scroll); right column scrolls when it exceeds that height */}
      <div className="relative">
        {/* Left: in flow — defines wrapper height, never scrolls */}
        <div className="w-full lg:w-[58.333%] lg:pr-4 space-y-4">
          <AxleConfigurationCard
            selectedConfig={selectedConfig}
            axleConfigurations={axleConfigurations}
            onConfigChange={onConfigChange}
            vehiclePlate={vehiclePlate}
            ticketNumber={ticketNumber}
            capturedAxles={capturedAxles}
            currentAxle={currentAxle}
            onAxleSelect={onAxleSelect}
          />

          {children}

          <ComplianceTable
            groupResults={groupResults}
            gvwPermissible={gvwPermissible}
            gvwMeasured={gvwMeasured}
            gvwOverload={gvwOverload}
            overallStatus={overallStatus}
          />
        </div>

        {/* Right: on lg, absolute so height = left; scrolls when content exceeds left height */}
        <div className="mt-4 lg:mt-0 lg:absolute lg:top-0 lg:right-0 lg:w-[41.667%] lg:h-full lg:overflow-hidden flex flex-col gap-4">
          <div className="min-h-0 flex-1 flex flex-col overflow-hidden lg:h-full">
            <VehicleDetailsCard
              {...vehicleDetailsProps}
              vehiclePlate={vehiclePlate}
              selectedConfig={selectedConfig}
              onConfigChange={onConfigChange}
              axleConfigurations={axleConfigurations}
              fillHeightAndScroll
            />
          </div>
          <ComplianceBanner
            status={allAxlesCaptured ? overallStatus : 'PENDING'}
            gvwMeasured={gvwMeasured}
            gvwOverload={gvwOverload}
            reweighCount={reweighCycleNo}
            className="shrink-0"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button variant="ghost" onClick={handlePrevStep} disabled={isWeighingLoading}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Photo Capture
        </Button>

        <div className="flex items-center gap-3">
          {allAxlesCaptured && !isWeightConfirmed && onTakeWeight && (
            <Button
              onClick={onTakeWeight}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={isWeighingLoading}
            >
              <Scale className="mr-2 h-4 w-4" />
              Take Weight
            </Button>
          )}

          <Button
            onClick={handleProceedToDecision}
            disabled={isProceedDisabled || isWeighingLoading || (allAxlesCaptured && !isWeightConfirmed)}
          >
            {isWeighingLoading ? 'Processing...' : proceedButtonText}
            {!isWeighingLoading && <ChevronRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
