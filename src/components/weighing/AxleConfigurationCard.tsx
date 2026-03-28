"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { AxleConfiguration } from '@/types/weighing';
import { InteractiveAxleGroupGrid } from './InteractiveAxleGroupGrid';

interface AxleConfigurationCardProps {
  selectedConfig: string;
  axleConfigurations: AxleConfiguration[];
  onConfigChange: (config: string) => void;
  vehiclePlate: string;
  ticketNumber?: string;
  capturedAxles: number[];
  currentAxle: number;
  onAxleSelect?: (axle: number) => void;
  /** Weight references for the currently selected configuration (from setup API) */
  weightReferences?: { axlePosition: number; axleGrouping: string; tyreTypeCode?: string; axleLegalWeightKg?: number }[];
  permissibleWeights?: number[];
  className?: string;
}

/**
 * AxleConfigurationCard - Visual axle grouping configuration with interactive selection.
 *
 * Features:
 * - Interactive 4-column grid (A-D) with click-to-cycle tyre types
 * - SVG tyre type icons (Single/Dual/Wide) with capture state colors
 * - Auto-matching: after setting 2+ groups, finds matching config from database
 * - Dropdown fallback for manual selection
 * - Dynamic group rendering from weight references (no hardcoded map)
 * - Mobile responsive
 */
export function AxleConfigurationCard({
  selectedConfig,
  axleConfigurations,
  onConfigChange,
  vehiclePlate,
  ticketNumber,
  capturedAxles,
  currentAxle,
  onAxleSelect,
  weightReferences,
  className,
}: AxleConfigurationCardProps) {
  // Resolve selected config object
  const selectedConfigObj = axleConfigurations.find(c => c.axleCode === selectedConfig);
  const gvw = selectedConfigObj?.gvwPermissibleKg || 0;

  return (
    <Card className={cn('border-blue-200', className)}>
      <CardHeader className="py-3 px-4 bg-blue-50 border-b border-blue-200">
        <CardTitle className="text-sm font-semibold text-gray-800 flex items-center justify-between">
          <span>Vehicle Axle Grouping Configuration</span>
          {gvw > 0 && (
            <span className="text-xs font-mono text-blue-600">
              GVW: {gvw.toLocaleString()} kg
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {/* Interactive Axle Group Grid */}
        <InteractiveAxleGroupGrid
          axleConfigurations={axleConfigurations}
          weightReferences={weightReferences}
          selectedConfig={selectedConfig}
          onConfigMatch={onConfigChange}
          capturedAxles={capturedAxles}
          currentAxle={currentAxle}
          onAxleSelect={onAxleSelect}
        />

        {/* Config Dropdown + Ticket Info */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
            <span className="text-blue-600">→</span>
            <span>
              Ticket for <span className="font-bold">{vehiclePlate}</span> — Config:
            </span>
            <Select value={selectedConfig} onValueChange={onConfigChange}>
              <SelectTrigger className="h-7 w-auto min-w-[140px] px-2 text-xs bg-yellow-50 border-yellow-400">
                <SelectValue placeholder="Select config" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {axleConfigurations.map((cfg) => (
                  <SelectItem key={cfg.axleCode} value={cfg.axleCode}>
                    <span className="font-mono font-bold">{cfg.axleCode}</span>
                    <span className="text-muted-foreground ml-1.5">
                      {cfg.axleName} ({cfg.gvwPermissibleKg?.toLocaleString()} kg)
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {ticketNumber && (
            <div className="text-xs text-gray-500">
              Ticket: <span className="font-mono font-bold">{ticketNumber}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default AxleConfigurationCard;
