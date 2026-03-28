"use client";

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AxleConfiguration } from '@/types/weighing';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EmptyAxleSlot, TyreTypeIcon } from './TyreTypeIcon';

type TyreType = 'S' | 'D' | 'W' | 'L';

/** Legal weight limits per tyre type and position context */
const TYRE_WEIGHTS: Record<TyreType, { steering: number; single: number; tandem: number }> = {
  S: { steering: 8000, single: 7500, tandem: 7500 },
  D: { steering: 10000, single: 10000, tandem: 9000 },
  W: { steering: 8000, single: 8000, tandem: 8000 },
  L: { steering: 6000, single: 6000, tandem: 6000 },
};

const TYRE_CYCLE: (TyreType | null)[] = ['S', 'D', 'W', null];

const GROUP_LABELS: Record<string, { 
  name: string; 
  description: string; 
  color: string; 
  bg: string; 
  border: string;
  allowedTyres: TyreType[];
}> = {
  A: { name: 'Steering', description: 'Front axle(s)', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', allowedTyres: ['S', 'W'] },
  B: { name: 'Drive', description: 'Drive axle(s)', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', allowedTyres: ['D', 'S', 'W'] },
  C: { name: 'Trailer', description: 'Trailer axle(s)', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', allowedTyres: ['D', 'S', 'W', 'L'] },
  D: { name: 'Rear', description: 'Rear trailer', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', allowedTyres: ['D', 'S', 'W', 'L'] },
};

interface GroupState {
  label: string;
  axleCount: number;
  tyreType: TyreType | null;
}

interface InteractiveAxleGroupGridProps {
  /** All available axle configurations (for matching) */
  axleConfigurations: AxleConfiguration[];
  /** Weight references for the currently selected config (from setup API) */
  weightReferences?: { axlePosition: number; axleGrouping: string; tyreTypeCode?: string; axleLegalWeightKg?: number }[];
  /** Currently selected config code */
  selectedConfig?: string;
  /** Callback when a matching config is found via interactive selection */
  onConfigMatch: (configCode: string) => void;
  /** Captured axle numbers (for visual state) */
  capturedAxles?: number[];
  /** Current axle being weighed */
  currentAxle?: number;
  /** Click handler for axle position */
  onAxleSelect?: (axlePosition: number) => void;
  className?: string;
}

/**
 * InteractiveAxleGroupGrid — Visual axle group selector for weighing.
 *
 * Displays 4 group columns (A-D) with clickable tyre type icons.
 * Clicking cycles through tyre types and counts. After 2+ groups are set,
 * auto-matches against available axle configurations.
 *
 * Designed so a layman can look at a vehicle's physical axle layout
 * and tap the matching configuration without understanding codes.
 */
export function InteractiveAxleGroupGrid({
  axleConfigurations,
  weightReferences,
  selectedConfig,
  onConfigMatch,
  capturedAxles = [],
  currentAxle,
  onAxleSelect,
  className,
}: InteractiveAxleGroupGridProps) {
  // Initialize groups from weight references (if config is selected)
  const initialGroups = useMemo((): GroupState[] => {
    if (weightReferences && weightReferences.length > 0) {
      const groupMap = new Map<string, { count: number; tyreCode: string | null }>();
      for (const ref of weightReferences) {
        const g = ref.axleGrouping || 'A';
        const existing = groupMap.get(g);
        if (existing) {
          existing.count++;
        } else {
          groupMap.set(g, { count: 1, tyreCode: ref.tyreTypeCode || null });
        }
      }
      return ['A', 'B', 'C', 'D'].map(label => {
        const data = groupMap.get(label);
        return {
          label,
          axleCount: data?.count || 0,
          tyreType: (data?.tyreCode as TyreType) || null,
        };
      });
    }
    // Default: empty groups
    return ['A', 'B', 'C', 'D'].map(label => ({
      label,
      axleCount: 0,
      tyreType: null,
    }));
  }, [weightReferences]);

  const [groups, setGroups] = useState<GroupState[]>(initialGroups);
  // Track the last config that was set externally (dropdown) vs matched by user clicks
  const lastMatchedConfigRef = useRef<string | undefined>(undefined);

  // Always sync groups from weight refs when selectedConfig changes externally
  // (i.e., when selectedConfig differs from what the grid last matched)
  useEffect(() => {
    if (selectedConfig !== lastMatchedConfigRef.current) {
      setGroups(initialGroups);
    }
  }, [selectedConfig, initialGroups]);

  // Calculate permissible weight for a group
  const getGroupWeight = useCallback((group: GroupState): number => {
    if (!group.tyreType || group.axleCount === 0) return 0;
    const weights = TYRE_WEIGHTS[group.tyreType];
    const isMultiAxle = group.axleCount >= 2;
    if (group.label === 'A') {
      // First axle is steering, rest follow group rules
      const steeringWeight = weights.steering;
      const remainingWeight = isMultiAxle
        ? (group.axleCount - 1) * weights.tandem
        : 0;
      return steeringWeight + remainingWeight;
    }
    return group.axleCount * (isMultiAxle ? weights.tandem : weights.single);
  }, []);

  // Total GVW from current group state
  const totalGvw = useMemo(() =>
    groups.reduce((sum, g) => sum + getGroupWeight(g), 0),
    [groups, getGroupWeight]
  );

  // Total axle count
  const totalAxles = useMemo(() =>
    groups.reduce((sum, g) => sum + g.axleCount, 0),
    [groups]
  );

  // Count of groups with at least 1 axle set
  const activeGroupCount = useMemo(() =>
    groups.filter(g => g.axleCount > 0).length,
    [groups]
  );

  // Config matching — find best matching config from the pattern
  const matchResult = useMemo(() => {
    if (activeGroupCount < 2) return null;

    // Build pattern from groups
    const pattern = groups
      .map(g => g.tyreType ? g.tyreType.repeat(g.axleCount) : '')
      .join('|');
    const searchCode = `${totalAxles}*${pattern}`;

    // Try exact code match first
    const exactMatch = axleConfigurations.find(c => c.axleCode === searchCode);
    if (exactMatch) return { config: exactMatch, type: 'exact' as const };

    // Try matching by axle count + weight reference pattern
    const candidates = axleConfigurations.filter(c => c.axleNumber === totalAxles);
    for (const candidate of candidates) {
      const refs = candidate.weightReferences;
      if (!refs || refs.length !== totalAxles) continue;

      // Build pattern from candidate's weight refs
      const refGroupMap = new Map<string, string[]>();
      for (const ref of refs) {
        const g = ref.axleGrouping || 'A';
        if (!refGroupMap.has(g)) refGroupMap.set(g, []);
        refGroupMap.get(g)!.push((ref as any).tyreTypeCode || '?');
      }
      const refPattern = ['A', 'B', 'C', 'D']
        .map(g => (refGroupMap.get(g) || []).join(''))
        .join('|');

      if (refPattern === pattern) {
        return { config: candidate, type: 'exact' as const };
      }
    }

    // Try partial match by axle count only
    const axleCountMatch = candidates[0];
    if (axleCountMatch) return { config: axleCountMatch, type: 'partial' as const };

    return null;
  }, [groups, activeGroupCount, totalAxles, axleConfigurations]);

  // Auto-select matching config when user clicks grid and finds a match
  useEffect(() => {
    if (matchResult?.type === 'exact' && matchResult.config.axleCode !== selectedConfig) {
      lastMatchedConfigRef.current = matchResult.config.axleCode;
      onConfigMatch(matchResult.config.axleCode);
    }
  }, [matchResult, selectedConfig, onConfigMatch]);

  // Handle clicking on a group to cycle tyre type
  const handleGroupClick = useCallback((groupLabel: string) => {
    setGroups(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(g => g.label === groupLabel);
      if (idx === -1) return prev;

      const meta = GROUP_LABELS[groupLabel];
      const allowedTyres = meta.allowedTyres;
      const group = { ...updated[idx] };

      if (group.tyreType === null) {
        // Empty → add 1st allowed tyre
        group.tyreType = allowedTyres[0];
        group.axleCount = 1;
      } else {
        // Cycle: increase axle count, then change tyre type, then clear
        const maxAxles = groupLabel === 'A' ? 2 : 4;
        
        if (group.axleCount < maxAxles) {
          // Add another axle of same type
          group.axleCount++;
        } else {
          // Cycle tyre type within allowed list
          const currentIdx = allowedTyres.indexOf(group.tyreType);
          if (currentIdx < allowedTyres.length - 1) {
            group.tyreType = allowedTyres[currentIdx + 1];
            group.axleCount = 1;
          } else {
            // End of cycle → clear
            group.tyreType = null;
            group.axleCount = 0;
          }
        }
      }

      updated[idx] = group;
      return updated;
    });
  }, []);

  // Build position map for captured/current axle highlighting
  const positionMap = useMemo(() => {
    const map = new Map<number, { group: string; index: number }>();
    let pos = 1;
    for (const group of groups) {
      for (let i = 0; i < group.axleCount; i++) {
        map.set(pos, { group: group.label, index: i });
        pos++;
      }
    }
    return map;
  }, [groups]);

  const getAxleState = useCallback((position: number) => {
    if (capturedAxles.includes(position)) return 'captured' as const;
    if (position === currentAxle) return 'current' as const;
    return 'default' as const;
  }, [capturedAxles, currentAxle]);

  const getGroupTypeLabel = (group: GroupState): string => {
    if (group.axleCount === 0) return 'Empty';
    if (group.axleCount === 1) return group.label === 'A' ? 'Steering' : 'Single';
    if (group.axleCount === 2) return 'Tandem';
    if (group.axleCount === 3) return 'Tridem';
    return 'Quad';
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Group Grid */}
      <div className="grid grid-cols-4 gap-2">
        {groups.map((group) => {
          const meta = GROUP_LABELS[group.label];
          const weight = getGroupWeight(group);
          const groupPositions: number[] = [];
          let startPos = 1;
          for (const g of groups) {
            if (g.label === group.label) {
              for (let i = 0; i < g.axleCount; i++) groupPositions.push(startPos + i);
              break;
            }
            startPos += g.axleCount;
          }

          return (
            <div
              key={group.label}
              className={cn(
                'rounded-lg border-2 p-2 text-center transition-all cursor-pointer select-none',
                group.axleCount > 0
                  ? `${meta.bg} ${meta.border}`
                  : 'border-dashed border-gray-300 hover:border-blue-300 hover:bg-blue-50/30',
              )}
              onClick={() => handleGroupClick(group.label)}
              title={`Click to ${group.axleCount > 0 ? 'change' : 'add'} Group ${group.label} (${meta.name})`}
            >
              {/* Group Header */}
              <div className={cn('text-[10px] font-bold uppercase tracking-wider mb-1', meta.color)}>
                {group.label} — {meta.name}
              </div>

              {/* Tyre Visuals */}
              <div className="flex justify-center items-center gap-1 min-h-[56px]">
                {group.axleCount > 0 && group.tyreType ? (
                  <div className="flex gap-1">
                    {Array.from({ length: group.axleCount }, (_, i) => {
                      const pos = groupPositions[i];
                      return (
                        <div
                          key={i}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAxleSelect?.(pos);
                          }}
                          className="cursor-pointer"
                        >
                          <TyreTypeIcon
                            tyreType={group.tyreType!}
                            size="md"
                            state={pos ? getAxleState(pos) : 'default'}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyAxleSlot size="md" />
                )}
              </div>

              {/* Group Info */}
              <div className="mt-1 space-y-0.5">
                <div className={cn('text-[10px] font-semibold', meta.color)}>
                  {getGroupTypeLabel(group)}
                  {group.axleCount > 0 && ` (${group.axleCount})`}
                </div>
                {weight > 0 && (
                  <div className="text-[10px] font-mono text-muted-foreground">
                    {weight.toLocaleString()} kg
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* GVW Summary + Match Status */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          {totalAxles > 0 && (
            <Badge variant="outline" className="font-mono text-xs">
              {totalAxles} axles | GVW: {totalGvw.toLocaleString()} kg
            </Badge>
          )}
        </div>

        {/* Match indicator */}
        {activeGroupCount >= 2 && (
          <div className="flex items-center gap-1.5">
            {matchResult?.type === 'exact' ? (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">
                  Matched: {matchResult.config.axleCode}
                </span>
              </div>
            ) : matchResult?.type === 'partial' ? (
              <div className="flex items-center gap-1 text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">
                  Closest: {matchResult.config.axleCode}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-gray-400">
                <Info className="h-3.5 w-3.5" />
                <span className="text-xs">No match — adjust groups</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Help hint */}
      {activeGroupCount === 0 && (
        <p className="text-xs text-center text-muted-foreground px-4">
          Click each group box to set the tyre type. Click again to add more axles (tandem/tridem) or change tyre type.
        </p>
      )}
    </div>
  );
}

export default InteractiveAxleGroupGrid;
