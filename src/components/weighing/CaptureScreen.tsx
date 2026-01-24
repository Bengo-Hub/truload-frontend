"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { DeckWeight, ScaleStatus } from '@/types/weighing';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Edit3,
  FileText,
  Play,
  RefreshCcw,
  Scan,
  Square,
  Truck,
} from 'lucide-react';
import { useState } from 'react';
import { VehiclePlaceholderImage } from './VehiclePlaceholderImage';

type WeighingMode = 'mobile' | 'multideck';

interface ScaleInfo {
  scaleA: { status: ScaleStatus; weight: number; temp: number; battery: number };
  scaleB?: { status: ScaleStatus; weight: number; temp: number; battery: number };
}

interface CaptureScreenProps {
  mode: WeighingMode;
  // Station info
  stationName?: string;
  bound?: string;

  // Scale info (mobile)
  scaleInfo?: ScaleInfo;

  // Deck weights (multideck)
  deckWeights?: DeckWeight[];
  totalGvw?: number;

  // Axle weight (mobile current reading)
  currentAxleWeight?: number;

  // Vehicle images
  frontViewImage?: string;
  overviewImage?: string;
  onCaptureFrontView?: () => void;
  onCaptureOverview?: () => void;

  // Vehicle plate
  vehiclePlate: string;
  onVehiclePlateChange: (value: string) => void;
  isPlateDisabled?: boolean;
  onScanPlate?: () => void;
  onEditPlate?: () => void;
  plateEditReason?: string;

  // Auto acquire
  autoAcquire: boolean;
  onAutoAcquireChange: (value: boolean) => void;

  // Scale test
  isScaleTestRequired?: boolean;
  onScaleTest?: () => void;

  // Weighbridge
  currentWeighbridge?: string;
  onChangeWeighbridge?: () => void;

  // Navigation
  onNext?: () => void;
  canProceed?: boolean;

  // Vehicle controls
  onEnter?: () => void;
  onMoveForward?: () => void;
  onMoveBack?: () => void;
  onProceedExit?: () => void;
  onProceedYard?: () => void;
  onPermit?: () => void;
  onStop?: () => void;
  onOpenExitBoom?: () => void;
  onResetExitBoom?: () => void;

  className?: string;
}

/**
 * CaptureScreen - Step 1 of the weighing workflow
 *
 * Displays:
 * - Scale status and weight readings
 * - Vehicle images (ANPR front view, overview camera)
 * - Vehicle plate entry (auto via ANPR or manual)
 * - Vehicle control buttons (traffic lights, booms)
 *
 * Based on KenloadV2 screen_1.png design.
 */
export function CaptureScreen({
  mode,
  stationName,
  bound,
  scaleInfo,
  deckWeights = [],
  totalGvw = 0,
  currentAxleWeight = 0,
  frontViewImage,
  overviewImage,
  onCaptureFrontView,
  onCaptureOverview,
  vehiclePlate,
  onVehiclePlateChange,
  isPlateDisabled = false,
  onScanPlate,
  onEditPlate,
  plateEditReason,
  autoAcquire,
  onAutoAcquireChange,
  isScaleTestRequired = false,
  onScaleTest,
  currentWeighbridge: _currentWeighbridge,
  onChangeWeighbridge,
  onNext,
  canProceed = false,
  onEnter,
  onMoveForward,
  onMoveBack,
  onProceedExit,
  onProceedYard,
  onPermit,
  onStop,
  onOpenExitBoom,
  onResetExitBoom,
  className,
}: CaptureScreenProps) {
  const [isCapturingFront, setIsCapturingFront] = useState(false);
  const [isCapturingOverview, setIsCapturingOverview] = useState(false);

  const handleCaptureFront = async () => {
    setIsCapturingFront(true);
    await onCaptureFrontView?.();
    setIsCapturingFront(false);
  };

  const handleCaptureOverview = async () => {
    setIsCapturingOverview(true);
    await onCaptureOverview?.();
    setIsCapturingOverview(false);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Mode Header */}
      <div className="flex items-center justify-between bg-gray-900 text-white px-4 py-2 rounded-lg">
        <span className="font-semibold uppercase tracking-wider">
          {mode === 'mobile' ? 'MOBILE' : 'MULTIDECK'}
        </span>
        {bound && (
          <span className="text-yellow-400">{bound}</span>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Scale Status & Weight Display */}
        <div className="space-y-4">
          {mode === 'mobile' ? (
            <MobileScalePanel
              scaleInfo={scaleInfo}
              currentAxleWeight={currentAxleWeight}
            />
          ) : (
            <MultideckPanel
              deckWeights={deckWeights}
              totalGvw={totalGvw}
            />
          )}
        </div>

        {/* Right Column: Vehicle Images */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-gray-500 uppercase">Front View (ANPR)</Label>
            <VehiclePlaceholderImage
              type="frontView"
              imageUrl={frontViewImage}
              plateNumber={vehiclePlate}
              isLoading={isCapturingFront}
              onCapture={onCaptureFrontView ? handleCaptureFront : undefined}
              className="h-40"
            />
            <div className="text-center text-xs text-gray-500">
              {stationName} {bound ? `- ${bound}` : ''}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-500 uppercase">Overview</Label>
            <VehiclePlaceholderImage
              type="overView"
              imageUrl={overviewImage}
              isLoading={isCapturingOverview}
              onCapture={onCaptureOverview ? handleCaptureOverview : undefined}
              className="h-40"
            />
            <div className="text-center text-xs text-gray-500">
              {stationName} {bound ? `- ${bound}` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Plate Section */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Weighbridge Selector */}
            {onChangeWeighbridge && (
              <Button
                variant="outline"
                size="sm"
                onClick={onChangeWeighbridge}
                className="shrink-0"
              >
                <RefreshCcw className="h-4 w-4 mr-1" />
                Change Weighbridge
              </Button>
            )}

            {/* Plate Input */}
            <div className="flex-1 flex items-center gap-2">
              <Label className="font-semibold text-gray-700 shrink-0">Vehicle Plate No:</Label>
              <Input
                value={vehiclePlate}
                onChange={(e) => onVehiclePlateChange(e.target.value.toUpperCase())}
                disabled={isPlateDisabled}
                placeholder="KAA 123A"
                className={cn(
                  'font-mono text-lg uppercase tracking-wider max-w-[200px]',
                  isPlateDisabled && 'bg-gray-100'
                )}
              />

              {/* Scan Button */}
              {onScanPlate && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onScanPlate}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black"
                >
                  <Scan className="h-4 w-4 mr-1" />
                  SCAN
                </Button>
              )}

              {/* Edit Plate Button */}
              {onEditPlate && isPlateDisabled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEditPlate}
                  className="bg-yellow-100 hover:bg-yellow-200 border-yellow-400"
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  EDIT NUMBER PLATE
                </Button>
              )}

              {/* Auto Acquire Toggle */}
              <div className="flex items-center gap-2 ml-4">
                <Switch
                  id="auto-acquire"
                  checked={autoAcquire}
                  onCheckedChange={onAutoAcquireChange}
                />
                <Label htmlFor="auto-acquire" className="text-sm text-gray-600 cursor-pointer">
                  AUTO ACQUIRE
                </Label>
              </div>

              {/* Next Button */}
              <Button
                onClick={onNext}
                disabled={!canProceed}
                className="ml-auto bg-green-600 hover:bg-green-700"
              >
                NEXT
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>

          {/* Scale Test Warning */}
          {isScaleTestRequired && (
            <div className="mt-3 flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                SCALE TEST REQUIRED (SCALE TEST NOT DONE).
              </span>
              {onScaleTest && (
                <Button variant="link" size="sm" onClick={onScaleTest} className="text-red-600">
                  Run Scale Test
                </Button>
              )}
            </div>
          )}

          {/* Plate Edit Notice */}
          {plateEditReason && (
            <div className="mt-2 text-xs text-orange-600 bg-orange-50 px-3 py-1 rounded">
              Plate edited: {plateEditReason}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vehicle Control Buttons */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Reset/Open Exit Boom */}
            <div className="flex gap-2 mr-4">
              {onResetExitBoom && (
                <Button variant="outline" size="sm" onClick={onResetExitBoom}>
                  RESET EXIT BOOM
                </Button>
              )}
              {onOpenExitBoom && (
                <Button variant="outline" size="sm" onClick={onOpenExitBoom}>
                  OPEN EXIT BOOM
                </Button>
              )}
            </div>

            {/* Traffic Controls */}
            <div className="flex gap-1">
              {onEnter && (
                <Button
                  size="sm"
                  onClick={onEnter}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="h-4 w-4 mr-1" />
                  ENTER
                </Button>
              )}
              {onMoveForward && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onMoveForward}
                  className="border-green-400 text-green-700 hover:bg-green-50"
                >
                  <ArrowRight className="h-4 w-4 mr-1" />
                  MOVE FORWARD
                </Button>
              )}
              {onMoveBack && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onMoveBack}
                  className="border-blue-400 text-blue-700 hover:bg-blue-50"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  MOVE BACK
                </Button>
              )}
              {onProceedExit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onProceedExit}
                  className="border-yellow-400 text-yellow-700 hover:bg-yellow-50"
                >
                  <Truck className="h-4 w-4 mr-1" />
                  PROCEED EXIT
                </Button>
              )}
              {onProceedYard && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onProceedYard}
                  className="border-orange-400 text-orange-700 hover:bg-orange-50"
                >
                  <Truck className="h-4 w-4 mr-1" />
                  PROCEED YARD
                </Button>
              )}
              {onPermit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onPermit}
                  className="border-purple-400 text-purple-700 hover:bg-purple-50"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  PERMIT
                </Button>
              )}
              {onStop && (
                <Button
                  size="sm"
                  onClick={onStop}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Square className="h-4 w-4 mr-1" />
                  STOP
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * MobileScalePanel - Scale status for mobile weighing mode
 */
function MobileScalePanel({
  scaleInfo,
  currentAxleWeight,
}: {
  scaleInfo?: ScaleInfo;
  currentAxleWeight: number;
}) {
  const scaleA = scaleInfo?.scaleA;
  const scaleB = scaleInfo?.scaleB;

  return (
    <div className="space-y-4">
      {/* Station Info Panel */}
      <Card className="border-yellow-400 bg-yellow-50">
        <CardContent className="p-3">
          <div className="grid grid-cols-2 gap-4">
            {/* Scale A Status */}
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-2">Station:</div>
              <div className="text-sm">
                <span className="text-gray-600">Actual (KG):</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Scale A</span> | <span className="text-gray-600">Scale B</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Temp A:</span> {scaleA?.temp || 0}°C |{' '}
                <span className="text-gray-600">Temp B:</span> {scaleB?.temp || 0}°C
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Weights A:</span> 0 |{' '}
                <span className="text-gray-600">Weights B:</span> 0 | <span className="text-gray-600">Total:</span> 0
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Battery A:</span> {scaleA?.battery || 0} |{' '}
                <span className="text-gray-600">Battery B:</span> {scaleB?.battery || 0}
              </div>
            </div>

            {/* Scale Status Indicators */}
            <div className="flex flex-col gap-2">
              <ScaleStatusButton status={scaleA?.status} label="SCALE OFF" />
              <ScaleStatusButton status={scaleB?.status} label="SCALE OFF" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Axle Weight Display */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">Axle Weight (KG)</div>
            <div className={cn(
              'text-6xl font-bold font-mono',
              currentAxleWeight > 0 ? 'text-green-600' : 'text-gray-400'
            )}>
              {currentAxleWeight.toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * MultideckPanel - Deck weights for multideck weighing mode
 */
function MultideckPanel({
  deckWeights,
  totalGvw,
}: {
  deckWeights: DeckWeight[];
  totalGvw: number;
}) {
  return (
    <Card className="border-gray-200">
      <CardContent className="p-4">
        <div className="grid grid-cols-6 gap-2 text-center">
          {/* Platform Info */}
          <div className="text-left">
            <div className="text-xs text-gray-500">Platform</div>
            <div className="text-sm font-semibold">ROMIA</div>
            <div className="text-xs text-gray-500 mt-2">Status</div>
            <div className="text-sm">Vehicle on Deck</div>
            <div className="text-xs text-gray-500 mt-2">Actual (Kg)</div>
          </div>

          {/* Deck 1 */}
          <DeckWeightDisplay deck={1} weight={deckWeights[0]?.weight || 0} status={deckWeights[0]?.status} />

          {/* Deck 2 */}
          <DeckWeightDisplay deck={2} weight={deckWeights[1]?.weight || 0} status={deckWeights[1]?.status} />

          {/* Deck 3 */}
          <DeckWeightDisplay deck={3} weight={deckWeights[2]?.weight || 0} status={deckWeights[2]?.status} />

          {/* Deck 4 */}
          <DeckWeightDisplay deck={4} weight={deckWeights[3]?.weight || 0} status={deckWeights[3]?.status} />

          {/* Total GVW */}
          <div>
            <div className="text-xs text-gray-500 mb-1">Total (GVW)</div>
            <div className={cn(
              'text-3xl font-bold font-mono',
              totalGvw > 0 ? 'text-green-600' : 'text-gray-400'
            )}>
              {totalGvw.toLocaleString()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * DeckWeightDisplay - Single deck weight display
 */
function DeckWeightDisplay({
  deck,
  weight,
  status,
}: {
  deck: number;
  weight: number;
  status?: 'stable' | 'unstable' | 'offline';
}) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">Deck {deck}</div>
      <div className={cn(
        'text-3xl font-bold font-mono',
        status === 'offline' ? 'text-red-400' :
        status === 'unstable' ? 'text-yellow-500' :
        weight > 0 ? 'text-green-600' : 'text-gray-400'
      )}>
        {weight.toLocaleString()}
      </div>
    </div>
  );
}

/**
 * ScaleStatusButton - Scale connection status indicator
 */
function ScaleStatusButton({
  status,
  label,
}: {
  status?: ScaleStatus;
  label: string;
}) {
  const isConnected = status === 'connected';

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        'w-full',
        isConnected
          ? 'bg-green-100 border-green-400 text-green-700'
          : 'bg-yellow-400 border-yellow-500 text-black font-bold'
      )}
    >
      {isConnected ? (
        <>
          <CheckCircle2 className="h-4 w-4 mr-1" />
          CONNECTED
        </>
      ) : (
        label
      )}
    </Button>
  );
}

export default CaptureScreen;
