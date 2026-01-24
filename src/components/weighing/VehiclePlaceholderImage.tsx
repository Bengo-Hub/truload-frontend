"use client";

import { cn } from '@/lib/utils';
import { Camera } from 'lucide-react';
import Image from 'next/image';

type ImageType = 'frontView' | 'overView';

interface VehiclePlaceholderImageProps {
  type: ImageType;
  imageUrl?: string;
  plateNumber?: string;
  isLoading?: boolean;
  className?: string;
  onCapture?: () => void;
}

/**
 * VehiclePlaceholderImage - Placeholder/actual image display for ANPR and overview cameras
 *
 * Used in Step 1 (Capture) of the weighing workflow.
 * - frontView: Shows vehicle front with license plate (ANPR camera)
 * - overView: Shows full vehicle overview (overview camera)
 */
export function VehiclePlaceholderImage({
  type,
  imageUrl,
  plateNumber,
  isLoading = false,
  className,
  onCapture,
}: VehiclePlaceholderImageProps) {
  const isFrontView = type === 'frontView';

  if (imageUrl) {
    // Actual captured image
    return (
      <div className={cn('relative rounded-lg overflow-hidden bg-gray-900', className)}>
        <Image
          src={imageUrl}
          alt={isFrontView ? 'Vehicle front view' : 'Vehicle overview'}
          fill
          className="object-cover"
        />
        {isFrontView && plateNumber && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-yellow-400 px-4 py-1 rounded font-mono font-bold text-gray-900 text-lg tracking-wider shadow-lg">
            {plateNumber}
          </div>
        )}
        <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
          {isFrontView ? 'ANPR' : 'Overview'}
        </div>
      </div>
    );
  }

  // Placeholder SVG
  return (
    <div
      className={cn(
        'relative rounded-lg overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center',
        onCapture && 'cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-colors',
        className
      )}
      onClick={onCapture}
    >
      {isLoading ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Capturing...</span>
        </div>
      ) : isFrontView ? (
        // Front view placeholder (vehicle front with plate area)
        <FrontViewSVG plateNumber={plateNumber} />
      ) : (
        // Overview placeholder (truck silhouette)
        <OverViewSVG />
      )}

      {/* Camera indicator */}
      <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">
        <Camera className="h-3 w-3" />
        {isFrontView ? 'ANPR Camera' : 'Overview Camera'}
      </div>

      {/* Click to capture hint */}
      {onCapture && !isLoading && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-gray-500">
          Click to capture
        </div>
      )}
    </div>
  );
}

/**
 * FrontViewSVG - Placeholder for vehicle front view with plate area
 */
function FrontViewSVG({ plateNumber }: { plateNumber?: string }) {
  return (
    <svg viewBox="0 0 200 150" className="w-32 h-24 text-gray-400">
      {/* Truck cab outline */}
      <rect x="30" y="20" width="140" height="90" rx="8" fill="none" stroke="currentColor" strokeWidth="2" />

      {/* Windshield */}
      <rect x="45" y="30" width="110" height="40" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" />

      {/* Mirrors */}
      <rect x="15" y="40" width="15" height="8" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="170" y="40" width="15" height="8" rx="2" fill="currentColor" opacity="0.5" />

      {/* Headlights */}
      <ellipse cx="55" cy="85" rx="12" ry="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx="145" cy="85" rx="12" ry="8" fill="none" stroke="currentColor" strokeWidth="1.5" />

      {/* Grille */}
      <rect x="75" y="75" width="50" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="1" />
      <line x1="85" y1="75" x2="85" y2="95" stroke="currentColor" strokeWidth="1" />
      <line x1="100" y1="75" x2="100" y2="95" stroke="currentColor" strokeWidth="1" />
      <line x1="115" y1="75" x2="115" y2="95" stroke="currentColor" strokeWidth="1" />

      {/* Bumper */}
      <rect x="25" y="105" width="150" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />

      {/* License plate area */}
      <rect x="65" y="120" width="70" height="20" rx="2" fill="#FCD34D" stroke="#92400E" strokeWidth="1.5" />

      {/* Plate text */}
      {plateNumber ? (
        <text x="100" y="134" textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="#1F2937">
          {plateNumber.length > 10 ? plateNumber.slice(0, 10) : plateNumber}
        </text>
      ) : (
        <text x="100" y="134" textAnchor="middle" fontSize="8" fontFamily="sans-serif" fill="#6B7280">
          PLATE
        </text>
      )}
    </svg>
  );
}

/**
 * OverViewSVG - Placeholder for vehicle overview (side view truck)
 */
function OverViewSVG() {
  return (
    <svg viewBox="0 0 250 100" className="w-40 h-20 text-gray-400">
      {/* Cab */}
      <path
        d="M10 60 L10 30 Q10 20 20 20 L60 20 Q70 20 75 30 L80 45 L80 60"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />

      {/* Cab window */}
      <path
        d="M15 35 L25 35 Q30 35 35 30 L55 25 Q60 25 60 30 L60 45 L15 45 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />

      {/* Trailer */}
      <rect x="75" y="15" width="165" height="50" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />

      {/* Chassis */}
      <rect x="5" y="60" width="235" height="8" fill="none" stroke="currentColor" strokeWidth="1.5" />

      {/* Wheels - Cab */}
      <circle cx="35" cy="75" r="12" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="35" cy="75" r="6" fill="none" stroke="currentColor" strokeWidth="1" />

      {/* Wheels - Tandem 1 */}
      <circle cx="145" cy="75" r="12" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="145" cy="75" r="6" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="170" cy="75" r="12" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="170" cy="75" r="6" fill="none" stroke="currentColor" strokeWidth="1" />

      {/* Wheels - Tandem 2 */}
      <circle cx="200" cy="75" r="12" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="200" cy="75" r="6" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="225" cy="75" r="12" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="225" cy="75" r="6" fill="none" stroke="currentColor" strokeWidth="1" />

      {/* Mud flaps */}
      <rect x="28" y="68" width="3" height="18" fill="currentColor" opacity="0.3" />
      <rect x="138" y="68" width="3" height="18" fill="currentColor" opacity="0.3" />
      <rect x="218" y="68" width="3" height="18" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

export default VehiclePlaceholderImage;
