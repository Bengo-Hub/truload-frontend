"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StationDto } from '@/types/setup';
import { ChevronRight, Edit3, ScanLine } from 'lucide-react';
import React from 'react';
import { ImageCaptureCard } from '../ImageCaptureCard';
import { LocationConfigCard } from '../LocationConfigCard';
import { MiddlewarePrompt } from '../MiddlewarePrompt';
import { PendingTransactionCard } from '../PendingTransactionCard';
import type { ScaleInfo } from '../ScaleHealthPanel';
import { ScaleCard, ScaleHealthPanel } from '../ScaleHealthPanel';
import { ScaleTestBanner } from '../ScaleTestBanner';

interface WeighingCaptureStepProps {
  // Setup & Connection
  stationId?: string;
  middlewareConnected: boolean;
  scales?: ScaleInfo[];
  isScalesConnected?: boolean;
  isScaleTestCompleted?: boolean;
  lastScaleTestAt?: Date;
  weighingType?: string;
  isSimulationMode?: boolean;

  // Handlers
  handleResumeTransaction?: (tx: any) => void;
  handleDiscardTransaction?: (tx: any) => void;
  handleStartScaleTest?: () => void;
  handleConnectScales?: () => void;
  handleToggleScale?: (scaleId: string, active: boolean) => void;
  handleChangeWeighingType?: () => void;

  // Location State (enforcement only — ignored when isCommercial=true)
  selectedCountyId?: string;
  setSelectedCountyId?: (id: string) => void;
  selectedSubcountyId?: string;
  setSelectedSubcountyId?: (id: string) => void;
  selectedRoadId?: string;
  setSelectedRoadId?: (id: string) => void;

  // Images
  frontViewImage?: string;
  overviewImage?: string;
  setFrontViewImage?: (img?: string) => void;
  setOverviewImage?: (img?: string) => void;
  handleCaptureFront?: () => void;
  handleCaptureOverview?: () => void;

  // Plate & Actions
  vehiclePlate: string;
  setVehiclePlate: (plate: string) => void;
  isPlateDisabled?: boolean;
  handleScanPlate?: () => void;
  handleEditPlate?: () => void;
  handleProceedToVehicle: () => void;
  canProceedFromCapture: boolean;
  isCommercial?: boolean;

  // Middleware Handlers
  onEnter?: () => void;
  onMoveForward?: () => void;
  onMoveBack?: () => void;
  onStop?: () => void;

  // Station Bounds
  currentStation?: StationDto | null;
  currentBound?: string;
  handleBoundChange?: (bound: string) => void;

  // Custom Content (e.g. weights display or commercial extra fields)
  children?: React.ReactNode;

  // Transactions
  pendingTransactions?: any[];
}

const noop = () => {};

export function WeighingCaptureStep({
  stationId,
  middlewareConnected,
  scales = [],
  isScalesConnected = false,
  isScaleTestCompleted = false,
  lastScaleTestAt,
  weighingType = 'mobile',
  isSimulationMode = false,
  handleResumeTransaction = noop,
  handleDiscardTransaction,
  handleStartScaleTest = noop,
  handleConnectScales = noop,
  handleToggleScale = noop,
  handleChangeWeighingType = noop,
  selectedCountyId = '',
  setSelectedCountyId = noop,
  selectedSubcountyId = '',
  setSelectedSubcountyId = noop,
  selectedRoadId = '',
  setSelectedRoadId = noop,
  frontViewImage,
  overviewImage,
  setFrontViewImage = noop,
  setOverviewImage = noop,
  handleCaptureFront = noop,
  handleCaptureOverview = noop,
  vehiclePlate,
  setVehiclePlate,
  isPlateDisabled = false,
  handleScanPlate = noop,
  handleEditPlate = noop,
  handleProceedToVehicle,
  canProceedFromCapture,
  isCommercial = false,
  currentStation,
  currentBound,
  handleBoundChange = noop,
  children,
  pendingTransactions = [],
  onEnter,
  onMoveForward,
  onMoveBack,
  onStop,
}: WeighingCaptureStepProps) {
  return (
    <div className="space-y-4">
      {/* Pending transactions */}
      {pendingTransactions.length > 0 && (
        <PendingTransactionCard
          transactions={pendingTransactions}
          onResume={handleResumeTransaction}
          onDiscard={handleDiscardTransaction}
        />
      )}

      {/* Middleware Connection Prompt */}
      <MiddlewarePrompt
        isConnected={middlewareConnected}
        scales={scales as any}
      />

      {/* Mobile: scale test + scale health cards. Multideck: indicator status card only. */}
      {weighingType !== 'multideck' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ScaleTestBanner
            isScaleTestCompleted={isScaleTestCompleted}
            lastTestAt={lastScaleTestAt}
            onStartScaleTest={handleStartScaleTest}
            compact
          />
          {scales.length > 0 ? (
            <ScaleCard
              scale={scales[0]!}
              onToggle={(active) => handleToggleScale(scales[0]!.id, active)}
              compact
            />
          ) : (
            <Card className="border border-dashed border-gray-200 rounded-xl flex items-center justify-center min-h-[120px]">
              <CardContent className="py-6 text-center text-sm text-gray-500">
                No scales configured
              </CardContent>
            </Card>
          )}
          <ScaleHealthPanel
            scales={scales}
            isConnected={isScalesConnected}
            onConnect={handleConnectScales}
            onToggleScale={handleToggleScale}
            onChangeWeighingType={handleChangeWeighingType}
            weighingType={weighingType as any}
            compact
            showOnlyConnectionCard
            middlewareSynced={middlewareConnected}
            simulation={isSimulationMode}
            onEnter={onEnter}
            onMoveForward={onMoveForward}
            onMoveBack={onMoveBack}
            onStop={onStop}
          />
          {scales.length > 1 ? (
            <ScaleCard
              scale={scales[1]!}
              onToggle={(active) => handleToggleScale(scales[1]!.id, active)}
              compact
            />
          ) : scales.length === 1 ? (
            <Card className="border border-dashed border-gray-100 rounded-xl flex items-center justify-center min-h-[120px]">
              <CardContent className="py-6 text-center text-xs text-gray-400">
                —
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-dashed border-gray-200 rounded-xl flex items-center justify-center min-h-[120px]">
              <CardContent className="py-6 text-center text-sm text-gray-500">
                No scales configured
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ScaleTestBanner
            isScaleTestCompleted={isScaleTestCompleted}
            lastTestAt={lastScaleTestAt}
            onStartScaleTest={handleStartScaleTest}
            compact
          />
          <ScaleHealthPanel
            scales={scales}
            isConnected={isScalesConnected}
            onConnect={handleConnectScales}
            onToggleScale={handleToggleScale}
            onChangeWeighingType={handleChangeWeighingType}
            weighingType="multideck"
            displayMode="indicator"
            compact
            showOnlyConnectionCard
            middlewareSynced={middlewareConnected}
            simulation={isSimulationMode}
            onEnter={onEnter}
            onMoveForward={onMoveForward}
            onMoveBack={onMoveBack}
            onStop={onStop}
          />
        </div>
      )}

      {/* Custom Content: Multideck = MULTIDECK weight card only; Mobile = weight display */}
      {children}

      {/* Location Configurations (enforcement only) */}
      {!isCommercial && (
        <LocationConfigCard
          stationId={stationId}
          currentStation={currentStation}
          selectedCountyId={selectedCountyId}
          setSelectedCountyId={setSelectedCountyId}
          selectedSubcountyId={selectedSubcountyId}
          setSelectedSubcountyId={setSelectedSubcountyId}
          selectedRoadId={selectedRoadId}
          setSelectedRoadId={setSelectedRoadId}
        />
      )}

      {/* Vehicle Image Capture */}
      <ImageCaptureCard
        frontImage={frontViewImage}
        overviewImage={overviewImage}
        onCaptureFront={handleCaptureFront}
        onCaptureOverview={handleCaptureOverview}
        onClearFront={() => setFrontViewImage(undefined)}
        onClearOverview={() => setOverviewImage(undefined)}
        showANPRBadge={true}
      />

      {/* Vehicle Plate Entry Card */}
      <Card className="border-gray-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-stretch">
            {/* Bound Selector Section */}
            {currentStation?.supportsBidirectional && (
              <div className="flex items-center bg-gray-50 border-r border-gray-200 px-3 min-w-[120px]">
                <div className="flex flex-col items-center gap-1 w-full">
                  <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Bound</span>
                  <select
                    value={currentBound || currentStation?.boundACode || 'A'}
                    onChange={(e) => handleBoundChange(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm font-bold bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                  >
                    <option value={currentStation?.boundACode || 'A'}>
                      A ({currentStation?.boundACode || 'A'})
                    </option>
                    <option value={currentStation?.boundBCode || 'B'}>
                      B ({currentStation?.boundBCode || 'B'})
                    </option>
                  </select>
                </div>
              </div>
            )}

            {/* Plate Input Section */}
            <div className="flex-1 flex items-center justify-center px-4 py-4 bg-white">
              <div className="relative w-full max-w-md">
                <input
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                  disabled={isPlateDisabled}
                  placeholder="KAA 123A"
                  className="w-full font-mono text-2xl md:text-3xl uppercase tracking-[0.2em] px-4 py-3 border-2 border-gray-300 rounded-lg disabled:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-bold shadow-inner"
                />
                {isPlateDisabled && vehiclePlate && (
                  <span className="absolute -top-2 left-3 px-2 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700 rounded-full">
                    ✓ Locked
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons Section */}
            <div className="flex items-center gap-2 px-3 py-3 bg-gray-50 border-l border-gray-200">
              <Button
                onClick={handleScanPlate}
                size="icon"
                className="h-11 w-11 bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-sm"
                title="ANPR Scan"
              >
                <ScanLine className="h-5 w-5" />
              </Button>
              {isPlateDisabled && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleEditPlate}
                  className="h-11 w-11 border-amber-400 text-amber-700 hover:bg-amber-50 rounded-lg"
                  title="Edit Plate"
                >
                  <Edit3 className="h-5 w-5" />
                </Button>
              )}
              <Button
                onClick={handleProceedToVehicle}
                disabled={!canProceedFromCapture}
                size="lg"
                className="h-11 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-5 w-5 ml-1" />
              </Button>
            </div>
          </div>

          {/* Validation Footer */}
          {!canProceedFromCapture && (
            <div className="px-4 py-2 bg-amber-50 border-t border-amber-200">
              <p className="text-xs text-amber-700 text-center font-medium">
                {weighingType !== 'multideck' && !isScaleTestCompleted && '⚠ Complete scale test'}
                {weighingType !== 'multideck' && !isScaleTestCompleted && vehiclePlate.length < 5 && ' • '}
                {vehiclePlate.length < 5 && '⚠ Enter vehicle plate (min 5 chars)'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
