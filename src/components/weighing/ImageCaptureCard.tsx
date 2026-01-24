"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Camera,
  RefreshCw,
  Search,
  Trash2,
  Zap,
} from 'lucide-react';

// Truck front view SVG placeholder
const TruckFrontSvg = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 60" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="15" y="20" width="70" height="35" rx="3" className="fill-blue-200 stroke-blue-400" strokeWidth="1.5"/>
    <rect x="25" y="8" width="50" height="15" rx="2" className="fill-blue-100 stroke-blue-400" strokeWidth="1.5"/>
    <rect x="30" y="25" width="15" height="12" rx="1" className="fill-white stroke-blue-400" strokeWidth="1"/>
    <rect x="55" y="25" width="15" height="12" rx="1" className="fill-white stroke-blue-400" strokeWidth="1"/>
    <circle cx="25" cy="55" r="6" className="fill-gray-300 stroke-gray-500" strokeWidth="1.5"/>
    <circle cx="75" cy="55" r="6" className="fill-gray-300 stroke-gray-500" strokeWidth="1.5"/>
    <rect x="42" y="40" width="16" height="8" rx="1" className="fill-gray-200 stroke-gray-400" strokeWidth="1"/>
    <text x="50" y="47" textAnchor="middle" className="fill-gray-500" fontSize="6" fontWeight="bold">PLATE</text>
  </svg>
);

// Truck overview/side view SVG placeholder
const TruckOverviewSvg = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 120 60" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="25" width="30" height="25" rx="2" className="fill-blue-200 stroke-blue-400" strokeWidth="1.5"/>
    <rect x="8" y="15" width="24" height="12" rx="1" className="fill-blue-100 stroke-blue-400" strokeWidth="1.5"/>
    <rect x="10" y="17" width="8" height="8" rx="1" className="fill-white stroke-blue-300" strokeWidth="1"/>
    <rect x="35" y="20" width="80" height="30" rx="2" className="fill-gray-200 stroke-gray-400" strokeWidth="1.5"/>
    <line x1="55" y1="20" x2="55" y2="50" className="stroke-gray-300" strokeWidth="1"/>
    <line x1="75" y1="20" x2="75" y2="50" className="stroke-gray-300" strokeWidth="1"/>
    <line x1="95" y1="20" x2="95" y2="50" className="stroke-gray-300" strokeWidth="1"/>
    <circle cx="20" cy="50" r="6" className="fill-gray-300 stroke-gray-500" strokeWidth="1.5"/>
    <circle cx="50" cy="50" r="5" className="fill-gray-300 stroke-gray-500" strokeWidth="1.5"/>
    <circle cx="65" cy="50" r="5" className="fill-gray-300 stroke-gray-500" strokeWidth="1.5"/>
    <circle cx="90" cy="50" r="5" className="fill-gray-300 stroke-gray-500" strokeWidth="1.5"/>
    <circle cx="105" cy="50" r="5" className="fill-gray-300 stroke-gray-500" strokeWidth="1.5"/>
  </svg>
);

interface ImageCaptureCardProps {
  frontImage?: string;
  overviewImage?: string;
  rearImage?: string;
  sideImage?: string;
  onCaptureFront?: () => void;
  onCaptureOverview?: () => void;
  onCaptureRear?: () => void;
  onCaptureSide?: () => void;
  onClearFront?: () => void;
  onClearOverview?: () => void;
  onClearRear?: () => void;
  onClearSide?: () => void;
  /** Show ANPR badge on front view */
  showANPRBadge?: boolean;
  /** Read-only mode - no capture/clear buttons */
  isReadOnly?: boolean;
  /** Compact mode with smaller images */
  compact?: boolean;
  /** Auto-enquire callback - triggered to fetch existing vehicle data */
  onAutoEnquire?: () => void;
  /** Auto-capture callback - triggered automatically based on weighing mode */
  onAutoCapture?: () => void;
  /** Whether auto-capture is enabled */
  isAutoCaptureEnabled?: boolean;
  /** Whether auto-capture is currently in progress */
  isAutoCapturing?: boolean;
  /** Weighing mode for auto-capture behavior */
  weighingMode?: 'mobile' | 'multideck';
  /** Current deck (for multideck - auto captures on last deck) */
  currentDeck?: number;
  /** Total decks (for multideck) */
  totalDecks?: number;
  className?: string;
}

/**
 * ImageCaptureCard - Shared vehicle image capture component
 *
 * Modern compact design with:
 * - Wide rectangular image placeholders (16:9 aspect ratio - landscape orientation)
 * - Truck SVG placeholders (front view and side/overview views)
 * - Theme colors (blue primary)
 * - Support for multiple image types (front, overview, rear, side)
 * - ANPR badge indicator
 * - Auto-Enquire button to fetch existing vehicle data
 * - Auto-capture support:
 *   - Multideck: Automatically captures when vehicle is on last deck
 *   - Mobile: Captures when manually triggered
 * - Used by both mobile and multideck weighing screens
 */
export function ImageCaptureCard({
  frontImage,
  overviewImage,
  rearImage,
  sideImage,
  onCaptureFront,
  onCaptureOverview,
  onCaptureRear,
  onCaptureSide,
  onClearFront,
  onClearOverview,
  onClearRear,
  onClearSide,
  showANPRBadge = true,
  isReadOnly = false,
  compact = false,
  onAutoEnquire,
  onAutoCapture,
  isAutoCaptureEnabled = true,
  isAutoCapturing = false,
  weighingMode = 'mobile',
  currentDeck,
  totalDecks = 4,
  className,
}: ImageCaptureCardProps) {
  const imageSlots: Array<{
    key: string;
    label: string;
    sublabel?: string;
    image?: string;
    onCapture?: () => void;
    onClear?: () => void;
    viewType: 'front' | 'overview' | 'rear' | 'side';
  }> = [
    {
      key: 'front',
      label: 'Front View',
      sublabel: showANPRBadge ? 'ANPR' : undefined,
      image: frontImage,
      onCapture: onCaptureFront,
      onClear: onClearFront,
      viewType: 'front',
    },
    {
      key: 'overview',
      label: 'Overview',
      sublabel: undefined,
      image: overviewImage,
      onCapture: onCaptureOverview,
      onClear: onClearOverview,
      viewType: 'overview',
    },
  ];

  // Add rear and side if handlers provided
  if (onCaptureRear) {
    imageSlots.push({
      key: 'rear',
      label: 'Rear View',
      sublabel: undefined,
      image: rearImage,
      onCapture: onCaptureRear,
      onClear: onClearRear,
      viewType: 'rear',
    });
  }

  if (onCaptureSide) {
    imageSlots.push({
      key: 'side',
      label: 'Side View',
      sublabel: undefined,
      image: sideImage,
      onCapture: onCaptureSide,
      onClear: onClearSide,
      viewType: 'side',
    });
  }

  // Check if on last deck for auto-capture indicator
  const isOnLastDeck = weighingMode === 'multideck' && currentDeck === totalDecks;
  const shouldShowAutoCaptureIndicator = weighingMode === 'multideck' && isAutoCaptureEnabled;

  return (
    <Card className={cn('border-blue-100 shadow-sm', className)}>
      <CardHeader className={cn('pb-2', compact ? 'py-2 px-4' : 'pt-4 px-5')}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
            <Camera className="h-4 w-4 text-blue-600" />
            Vehicle Image Capture
            {shouldShowAutoCaptureIndicator && (
              <span className={cn(
                "ml-2 px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1",
                isOnLastDeck
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              )}>
                <Zap className="h-3 w-3" />
                {isOnLastDeck ? 'Auto-capture ready' : `Auto-capture on Deck ${totalDecks}`}
              </span>
            )}
          </CardTitle>

          {/* Auto-Enquire Button */}
          {onAutoEnquire && !isReadOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAutoEnquire}
              className="border-blue-300 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
            >
              <Search className="h-4 w-4 mr-1.5" />
              Auto-Enquire
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className={cn(compact ? 'px-4 pb-4' : 'px-5 pb-5')}>
        {/* Auto-capture status for multideck */}
        {isAutoCapturing && (
          <div className="mb-4 flex items-center justify-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="animate-pulse h-2 w-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-blue-700 font-medium">
              Auto-capturing images...
            </span>
          </div>
        )}

        <div className={cn(
          'grid gap-4',
          imageSlots.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'
        )}>
          {imageSlots.map((slot) => (
            <ImageSlot
              key={slot.key}
              label={slot.label}
              sublabel={slot.sublabel}
              image={slot.image}
              onCapture={slot.onCapture}
              onClear={slot.onClear}
              isReadOnly={isReadOnly}
              compact={compact}
              viewType={slot.viewType}
            />
          ))}
        </div>

        {/* Manual capture button for mobile mode */}
        {weighingMode === 'mobile' && onAutoCapture && !isReadOnly && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              onClick={onAutoCapture}
              disabled={isAutoCapturing}
              className="border-green-300 text-green-700 hover:bg-green-50"
            >
              <Camera className="h-4 w-4 mr-2" />
              {isAutoCapturing ? 'Capturing...' : 'Capture All Images'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ImageSlotProps {
  label: string;
  sublabel?: string;
  image?: string;
  placeholder?: string;
  onCapture?: () => void;
  onClear?: () => void;
  isReadOnly?: boolean;
  compact?: boolean;
  /** Type of view for SVG placeholder */
  viewType?: 'front' | 'overview' | 'rear' | 'side';
}

function ImageSlot({
  label,
  sublabel,
  image,
  onCapture,
  onClear,
  isReadOnly,
  compact,
  viewType = 'front',
}: ImageSlotProps) {
  const hasImage = !!image;
  const isFrontView = viewType === 'front' || viewType === 'rear';

  return (
    <div className="flex flex-col">
      {/* Label */}
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            {label}
          </span>
          {sublabel && (
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">
              {sublabel}
            </span>
          )}
        </div>
      </div>

      {/* Wide Rectangular Image Container (16:9 aspect ratio - wider than tall) */}
      <div
        className={cn(
          'relative rounded-lg overflow-hidden transition-all duration-200',
          'border-2',
          // Wide rectangular size (16:9 aspect ratio for landscape vehicle images)
          compact ? 'aspect-[16/9] min-h-[100px]' : 'aspect-[16/9] min-h-[120px] md:min-h-[140px]',
          hasImage
            ? 'border-blue-400 shadow-md'
            : 'border-dashed border-gray-300 hover:border-blue-400',
          !isReadOnly && !hasImage && 'cursor-pointer hover:bg-blue-50/50 group',
          'bg-gradient-to-br from-gray-50 to-gray-100'
        )}
        onClick={!isReadOnly && !hasImage && onCapture ? onCapture : undefined}
      >
        {hasImage ? (
          <>
            <img
              src={image}
              alt={label}
              className="w-full h-full object-cover"
            />
            {/* Overlay controls */}
            {!isReadOnly && (
              <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {onCapture && (
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 bg-white/90 hover:bg-white shadow-md"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCapture();
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
                {onClear && (
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8 shadow-md"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClear();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
            {/* Captured indicator */}
            <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 bg-green-500 text-white text-[10px] font-medium rounded-full flex items-center gap-1 shadow">
              <Camera className="h-2.5 w-2.5" />
              Captured
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-3">
            {/* Truck SVG placeholder */}
            {isFrontView ? (
              <TruckFrontSvg className={cn(
                'mb-2 opacity-60 group-hover:opacity-80 transition-opacity',
                compact ? 'w-16 h-10' : 'w-24 h-14'
              )} />
            ) : (
              <TruckOverviewSvg className={cn(
                'mb-2 opacity-60 group-hover:opacity-80 transition-opacity',
                compact ? 'w-20 h-10' : 'w-28 h-14'
              )} />
            )}
            <span className={cn(
              'text-center text-gray-500 font-medium',
              compact ? 'text-xs' : 'text-sm'
            )}>
              {isReadOnly ? 'No image' : 'Tap to capture'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImageCaptureCard;
