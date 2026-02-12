"use client";

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AxleWeightReference } from '@/types/weighing';
import { Settings2 } from 'lucide-react';
import Image from 'next/image';

type TyreType = 'S' | 'D' | 'W'; // Single, Double, Wide

interface AxleGroupVisualProps {
  configCode: string;
  totalAxles: number;
  axleReferences?: AxleWeightReference[];
  groupWeights?: Record<string, number>; // { A: 6800, B: 17500, C: 23800 }
  capturedAxles?: number[];
  currentAxle?: number;
  onAxleClick?: (axlePosition: number) => void;
  onConfigureGroup?: (groupLabel: string) => void;
  showWeights?: boolean;
  showLimits?: boolean;
  isReadOnly?: boolean;
  className?: string;
}

// Default axle configurations based on common truck types
const DEFAULT_AXLE_CONFIGS: Record<string, { groups: { label: string; axles: { position: number; tyreType: TyreType }[] }[] }> = {
  '2A': {
    groups: [
      { label: 'A', axles: [{ position: 1, tyreType: 'S' }] },
      { label: 'B', axles: [{ position: 2, tyreType: 'D' }] },
    ],
  },
  '3A': {
    groups: [
      { label: 'A', axles: [{ position: 1, tyreType: 'S' }] },
      { label: 'B', axles: [{ position: 2, tyreType: 'D' }, { position: 3, tyreType: 'D' }] },
    ],
  },
  '4A': {
    groups: [
      { label: 'A', axles: [{ position: 1, tyreType: 'S' }] },
      { label: 'B', axles: [{ position: 2, tyreType: 'D' }] },
      { label: 'C', axles: [{ position: 3, tyreType: 'D' }, { position: 4, tyreType: 'D' }] },
    ],
  },
  '5A': {
    groups: [
      { label: 'A', axles: [{ position: 1, tyreType: 'S' }] },
      { label: 'B', axles: [{ position: 2, tyreType: 'D' }, { position: 3, tyreType: 'D' }] },
      { label: 'C', axles: [{ position: 4, tyreType: 'D' }, { position: 5, tyreType: 'D' }] },
    ],
  },
  '6C': {
    groups: [
      { label: 'A', axles: [{ position: 1, tyreType: 'S' }] },
      { label: 'B', axles: [{ position: 2, tyreType: 'D' }, { position: 3, tyreType: 'D' }] },
      { label: 'C', axles: [{ position: 4, tyreType: 'D' }, { position: 5, tyreType: 'D' }, { position: 6, tyreType: 'D' }] },
    ],
  },
  '7A': {
    groups: [
      { label: 'A', axles: [{ position: 1, tyreType: 'S' }] },
      { label: 'B', axles: [{ position: 2, tyreType: 'D' }, { position: 3, tyreType: 'D' }] },
      { label: 'C', axles: [{ position: 4, tyreType: 'D' }, { position: 5, tyreType: 'D' }] },
      { label: 'D', axles: [{ position: 6, tyreType: 'D' }, { position: 7, tyreType: 'D' }] },
    ],
  },
};

const TYRE_IMAGE_MAP: Record<TyreType, string> = {
  S: '/images/weighing/axle_single.png',
  D: '/images/weighing/axle_double.png',
  W: '/images/weighing/axle_wide.png',
};

const GROUP_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  A: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' },
  B: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700' },
  C: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700' },
  D: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700' },
};

/**
 * AxleGroupVisual - Visual representation of vehicle axle configuration
 *
 * Displays axle groups with visual indicators for:
 * - Tyre types (single, double, wide) using actual images
 * - Group labels (A, B, C, D)
 * - Captured/pending status
 * - Weight readings per group
 *
 * Used in Step 2 (Vehicle Details) of the weighing workflow.
 */
export function AxleGroupVisual({
  configCode,
  totalAxles,
  axleReferences,
  groupWeights = {},
  capturedAxles = [],
  currentAxle,
  onAxleClick,
  onConfigureGroup,
  showWeights = false,
  showLimits: _showLimits = false,
  isReadOnly = false,
  className,
}: AxleGroupVisualProps) {
  // Get configuration from references or defaults
  // Only fallback to 6C when rendering, not when computing defaults
  const config = configCode
    ? (DEFAULT_AXLE_CONFIGS[configCode.toUpperCase()] || DEFAULT_AXLE_CONFIGS['6C'])
    : DEFAULT_AXLE_CONFIGS['6C'];

  // Build groups from axleReferences if provided
  const groups = axleReferences?.length
    ? buildGroupsFromReferences(axleReferences)
    : config.groups;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Vehicle Axle Grouping Configuration</span>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-mono rounded">
            [{configCode.toUpperCase()}, {totalAxles} axles]
          </span>
        </div>
        {!isReadOnly && onConfigureGroup && (
          <Button variant="outline" size="sm" onClick={() => onConfigureGroup('all')}>
            <Settings2 className="h-4 w-4 mr-1" />
            Configure
          </Button>
        )}
      </div>

      {/* Visual Layout */}
      <div className="flex items-end gap-1 p-4 bg-gray-50 rounded-lg border border-gray-200 overflow-x-auto">
        {/* Truck cab indicator */}
        <div className="flex flex-col items-center mr-2">
          <div className="w-12 h-8 bg-gray-300 rounded-t-lg border-2 border-gray-400" />
          <span className="text-xs text-gray-500 mt-1">CAB</span>
        </div>

        {/* Axle Groups */}
        {groups.map((group) => {
          const colors = GROUP_COLORS[group.label] || GROUP_COLORS.A;
          const groupWeight = groupWeights[group.label] || 0;

          return (
            <div key={group.label} className="flex flex-col items-center">
              {/* Group label */}
              <div className={cn(
                'px-2 py-0.5 mb-1 rounded text-xs font-bold',
                colors.bg,
                colors.text
              )}>
                GROUP {group.label}
              </div>

              {/* Weight display */}
              {showWeights && (
                <div className="text-center mb-1">
                  <span className={cn(
                    'font-mono text-sm font-bold',
                    groupWeight > 0 ? 'text-gray-900' : 'text-gray-400'
                  )}>
                    {groupWeight > 0 ? `${groupWeight.toLocaleString()} kg` : '0 kg'}
                  </span>
                </div>
              )}

              {/* Axles in group */}
              <div className={cn(
                'flex items-end gap-0.5 p-2 rounded-lg border-2',
                colors.bg,
                colors.border
              )}>
                {group.axles.map((axle) => {
                  const isCaptured = capturedAxles.includes(axle.position);
                  const isCurrent = axle.position === currentAxle;

                  return (
                    <div
                      key={axle.position}
                      className={cn(
                        'relative flex flex-col items-center cursor-pointer transition-all',
                        isCurrent && 'ring-2 ring-yellow-400 ring-offset-1 rounded',
                        !isReadOnly && onAxleClick && 'hover:scale-105'
                      )}
                      onClick={() => !isReadOnly && onAxleClick?.(axle.position)}
                    >
                      {/* Axle number */}
                      <span className={cn(
                        'absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold z-10',
                        isCaptured
                          ? 'bg-emerald-500 text-white'
                          : isCurrent
                            ? 'bg-yellow-400 text-gray-900'
                            : 'bg-gray-300 text-gray-600'
                      )}>
                        {axle.position}
                      </span>

                      {/* Axle image */}
                      <div className={cn(
                        'w-12 h-16 relative',
                        isCaptured ? 'opacity-100' : 'opacity-50'
                      )}>
                        <Image
                          src={TYRE_IMAGE_MAP[axle.tyreType]}
                          alt={`Axle ${axle.position} (${axle.tyreType})`}
                          fill
                          className="object-contain"
                          onError={(e) => {
                            // Fallback to placeholder if image not found
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        {/* Fallback SVG if image fails */}
                        <AxleFallbackSVG tyreType={axle.tyreType} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Configure group button */}
              {!isReadOnly && onConfigureGroup && (
                <button
                  className="mt-1 text-xs text-gray-500 hover:text-gray-700 hover:underline"
                  onClick={() => onConfigureGroup(group.label)}
                >
                  Configure
                </button>
              )}
            </div>
          );
        })}

        {/* Trailer end indicator */}
        <div className="flex flex-col items-center ml-2">
          <div className="w-8 h-6 bg-gray-200 rounded-r-lg border-2 border-gray-300" />
          <span className="text-xs text-gray-500 mt-1">END</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>Captured</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <span>Current</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gray-300" />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-mono">S</span>
          <span>Single</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-mono">D</span>
          <span>Double</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-mono">W</span>
          <span>Wide</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Build groups from AxleWeightReference array
 */
function buildGroupsFromReferences(refs: AxleWeightReference[]): { label: string; axles: { position: number; tyreType: TyreType }[] }[] {
  const groupMap = new Map<string, { position: number; tyreType: TyreType }[]>();

  refs.forEach((ref) => {
    const existing = groupMap.get(ref.axleGrouping) || [];
    existing.push({
      position: ref.axlePosition,
      tyreType: ref.tyreType,
    });
    groupMap.set(ref.axleGrouping, existing);
  });

  return Array.from(groupMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, axles]) => ({
      label,
      axles: axles.sort((a, b) => a.position - b.position),
    }));
}

/**
 * Fallback SVG for axle visualization when images fail to load
 */
function AxleFallbackSVG({ tyreType }: { tyreType: TyreType }) {
  return (
    <svg
      viewBox="0 0 50 60"
      className="absolute inset-0 w-full h-full"
      style={{ display: 'none' }}
    >
      {/* Axle bar */}
      <rect x="23" y="5" width="4" height="50" fill="#6B7280" rx="1" />

      {/* Tyres */}
      {tyreType === 'S' && (
        <>
          <ellipse cx="25" cy="10" rx="15" ry="6" fill="#374151" />
          <ellipse cx="25" cy="50" rx="15" ry="6" fill="#374151" />
        </>
      )}
      {tyreType === 'D' && (
        <>
          <ellipse cx="15" cy="10" rx="10" ry="5" fill="#374151" />
          <ellipse cx="35" cy="10" rx="10" ry="5" fill="#374151" />
          <ellipse cx="15" cy="50" rx="10" ry="5" fill="#374151" />
          <ellipse cx="35" cy="50" rx="10" ry="5" fill="#374151" />
        </>
      )}
      {tyreType === 'W' && (
        <>
          <ellipse cx="25" cy="10" rx="22" ry="7" fill="#374151" />
          <ellipse cx="25" cy="50" rx="22" ry="7" fill="#374151" />
        </>
      )}
    </svg>
  );
}

/**
 * Get default axle configuration references for a given config code.
 * Returns empty array if config code is empty or not found (instead of defaulting to 6C).
 */
export function getDefaultAxleConfig(configCode: string): AxleWeightReference[] {
  if (!configCode) return [];

  const config = DEFAULT_AXLE_CONFIGS[configCode.toUpperCase()];
  if (!config) return [];

  const refs: AxleWeightReference[] = [];

  config.groups.forEach((group) => {
    group.axles.forEach((axle) => {
      refs.push({
        id: `${configCode}-${axle.position}`,
        axlePosition: axle.position,
        axleGrouping: group.label as 'A' | 'B' | 'C' | 'D',
        tyreType: axle.tyreType,
        permissibleWeightKg: getDefaultPermissible(group.label, group.axles.length),
      });
    });
  });

  return refs;
}

/**
 * Get default permissible weight based on group type
 */
function getDefaultPermissible(groupLabel: string, axleCount: number): number {
  // Based on Kenya Traffic Act Cap 403
  if (groupLabel === 'A') return 7000; // Steering axle
  if (axleCount === 1) return 10000; // Single drive
  if (axleCount === 2) return 16000; // Tandem
  if (axleCount === 3) return 24000; // Tridem
  return 8000; // Default per axle
}

export default AxleGroupVisual;
