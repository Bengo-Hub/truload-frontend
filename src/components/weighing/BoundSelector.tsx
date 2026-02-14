'use client';

import { Station } from '@/lib/api/weighing';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeftRight } from 'lucide-react';

interface BoundSelectorProps {
  station: Station | null;
  selectedBound: string | undefined;
  onBoundChange: (bound: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

/**
 * BoundSelector - Select bound (A/B) for bidirectional weighing stations
 *
 * Only renders if the station supports bidirectional weighing.
 * Used on weighing screens (mobile and multideck) to select the traffic direction.
 */
export function BoundSelector({
  station,
  selectedBound,
  onBoundChange,
  disabled = false,
  compact = false,
}: BoundSelectorProps) {
  // Don't render if station doesn't support bidirectional
  if (!station?.supportsBidirectional) {
    return null;
  }

  // Get bound options from station
  const boundACode = station.boundACode || 'A';
  const boundBCode = station.boundBCode || 'B';

  // Format display label for bounds
  const _getBoundLabel = (code: string) => {
    // Common naming conventions for traffic directions
    if (code.toUpperCase().includes('INBOUND') || code === 'A') {
      return `Bound A (${code})`;
    }
    if (code.toUpperCase().includes('OUTBOUND') || code === 'B') {
      return `Bound B (${code})`;
    }
    return code;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
        <Select
          value={selectedBound || boundACode}
          onValueChange={onBoundChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue placeholder="Select Bound" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={boundACode}>
              <div className="flex items-center gap-2">
                <span className="font-medium">A</span>
                <span className="text-muted-foreground text-xs">({boundACode})</span>
              </div>
            </SelectItem>
            <SelectItem value={boundBCode}>
              <div className="flex items-center gap-2">
                <span className="font-medium">B</span>
                <span className="text-muted-foreground text-xs">({boundBCode})</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm font-medium">
        <ArrowLeftRight className="h-4 w-4" />
        Traffic Direction
      </Label>
      <Select
        value={selectedBound || boundACode}
        onValueChange={onBoundChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select Bound" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={boundACode}>
            <div className="flex flex-col">
              <span className="font-medium">Bound A</span>
              <span className="text-muted-foreground text-xs">{boundACode}</span>
            </div>
          </SelectItem>
          <SelectItem value={boundBCode}>
            <div className="flex flex-col">
              <span className="font-medium">Bound B</span>
              <span className="text-muted-foreground text-xs">{boundBCode}</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Select the traffic direction for this weighing session
      </p>
    </div>
  );
}

export default BoundSelector;
