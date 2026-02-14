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

interface AxleGroupConfig {
  label: string;
  axles: {
    number: number;
    type: 'S' | 'D' | 'W'; // Single, Double, Wide
  }[];
}

// Default axle group configurations based on Kenya Traffic Act
const AXLE_CONFIGS: Record<string, AxleGroupConfig[]> = {
  '2A': [
    { label: 'A', axles: [{ number: 1, type: 'S' }] },
    { label: 'B', axles: [{ number: 2, type: 'D' }] },
  ],
  '3A': [
    { label: 'A', axles: [{ number: 1, type: 'S' }] },
    { label: 'B', axles: [{ number: 2, type: 'D' }, { number: 3, type: 'D' }] },
  ],
  '4A': [
    { label: 'A', axles: [{ number: 1, type: 'S' }] },
    { label: 'B', axles: [{ number: 2, type: 'D' }] },
    { label: 'C', axles: [{ number: 3, type: 'D' }, { number: 4, type: 'D' }] },
  ],
  '5A': [
    { label: 'A', axles: [{ number: 1, type: 'S' }] },
    { label: 'B', axles: [{ number: 2, type: 'D' }, { number: 3, type: 'D' }] },
    { label: 'C', axles: [{ number: 4, type: 'D' }, { number: 5, type: 'D' }] },
  ],
  '6C': [
    { label: 'A', axles: [{ number: 1, type: 'S' }] },
    { label: 'B', axles: [{ number: 2, type: 'D' }, { number: 3, type: 'D' }] },
    { label: 'C', axles: [{ number: 4, type: 'D' }, { number: 5, type: 'D' }, { number: 6, type: 'D' }] },
  ],
  '7A': [
    { label: 'A', axles: [{ number: 1, type: 'S' }] },
    { label: 'B', axles: [{ number: 2, type: 'D' }, { number: 3, type: 'D' }] },
    { label: 'C', axles: [{ number: 4, type: 'D' }, { number: 5, type: 'D' }] },
    { label: 'D', axles: [{ number: 6, type: 'D' }, { number: 7, type: 'D' }] },
  ],
  '7*S|DW|WW|WW': [
    { label: 'A', axles: [{ number: 1, type: 'S' }] },
    { label: 'B', axles: [{ number: 2, type: 'D' }, { number: 3, type: 'W' }] },
    { label: 'C', axles: [{ number: 4, type: 'W' }, { number: 5, type: 'W' }] },
    { label: 'D', axles: [{ number: 6, type: 'W' }, { number: 7, type: 'W' }] },
  ],
};

interface AxleConfigurationCardProps {
  selectedConfig: string;
  axleConfigurations: AxleConfiguration[];
  onConfigChange: (config: string) => void;
  vehiclePlate: string;
  ticketNumber?: string;
  capturedAxles: number[];
  currentAxle: number;
  onAxleSelect?: (axle: number) => void;
  permissibleWeights?: number[];
  className?: string;
}

/**
 * AxleConfigurationCard - Displays the visual axle grouping configuration
 *
 * Shows:
 * - Axle type selector dropdown
 * - Visual representation of axle groups (A, B, C, D)
 * - Each axle button showing tyre type (S/D/W)
 * - Highlighted current/captured axles
 * - Permissible weights per group
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
  permissibleWeights = [8000, 9000, 8000, 8000, 8000, 8000, 8000],
  className,
}: AxleConfigurationCardProps) {
  // Use selected config, fallback to 6C only for rendering (not for computation)
  const axleGroups = selectedConfig
    ? (AXLE_CONFIGS[selectedConfig] || AXLE_CONFIGS['6C'])
    : AXLE_CONFIGS['6C'];

  // Calculate group permissible weights from individual axle weights
  const _getGroupPermissible = (groupIndex: number): number => {
    const group = axleGroups[groupIndex];
    if (!group) return 0;
    return group.axles.reduce((sum, axle) => {
      return sum + (permissibleWeights[axle.number - 1] || 8000);
    }, 0);
  };

  // Get all permissible weights string for header
  const getAllPermissibleWeights = (): string => {
    const weights = axleGroups.flatMap(g => g.axles.map(a => permissibleWeights[a.number - 1] || 8000));
    return weights.join(', ');
  };

  return (
    <Card className={cn('border-blue-200', className)}>
      <CardHeader className="py-3 px-4 bg-blue-50 border-b border-blue-200">
        <CardTitle className="text-sm font-semibold text-gray-800 flex items-center justify-between">
          <span>Vehicle Axle Grouping Configuration [ {getAllPermissibleWeights()} ]</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* Axle Groups Visual */}
        <div className="flex justify-between items-start mb-4">
          {axleGroups.map((group, _idx) => (
            <div key={group.label} className="flex-1 text-center">
              <div className="text-xs font-semibold text-gray-600 mb-2">GROUP {group.label}</div>
              <div className="flex justify-center gap-1">
                {group.axles.map((axle) => (
                  <button
                    key={axle.number}
                    onClick={() => onAxleSelect?.(axle.number)}
                    disabled={!onAxleSelect}
                    className={cn(
                      'w-10 h-16 border-2 rounded flex flex-col items-center justify-center transition-all',
                      capturedAxles.includes(axle.number)
                        ? 'bg-green-100 border-green-500'
                        : axle.number === currentAxle
                          ? 'bg-yellow-100 border-yellow-500 ring-2 ring-yellow-400'
                          : 'bg-gray-100 border-gray-300 hover:border-blue-400',
                      onAxleSelect ? 'cursor-pointer' : 'cursor-default'
                    )}
                  >
                    {/* Tyre visual */}
                    <div className="flex flex-col items-center">
                      {axle.type === 'S' && (
                        <div className="w-1.5 h-8 bg-gray-600 rounded-sm" />
                      )}
                      {axle.type === 'D' && (
                        <div className="flex gap-0.5">
                          <div className="w-1.5 h-8 bg-gray-600 rounded-sm" />
                          <div className="w-1.5 h-8 bg-gray-600 rounded-sm" />
                        </div>
                      )}
                      {axle.type === 'W' && (
                        <div className="flex gap-0.5">
                          <div className="w-2 h-8 bg-gray-600 rounded-sm" />
                          <div className="w-2 h-8 bg-gray-600 rounded-sm" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                {group.axles.map(a => a.type).join(' ')}
              </div>
            </div>
          ))}
        </div>

        {/* Ticket Info Row */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-600">
            <span className="text-blue-600 mr-1">→</span>
            Ticket Details for <span className="font-bold">{vehiclePlate}</span> - Axle Grouping{' '}
            <Select value={selectedConfig} onValueChange={onConfigChange}>
              <SelectTrigger className="inline-flex h-7 w-auto min-w-[120px] px-2 text-xs bg-yellow-100 border-yellow-400">
                <SelectValue placeholder="Select config" />
              </SelectTrigger>
              <SelectContent>
                {axleConfigurations.map((cfg) => (
                  <SelectItem key={cfg.axleCode} value={cfg.axleCode}>
                    {cfg.axleCode} - {cfg.axleName || cfg.description}
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
