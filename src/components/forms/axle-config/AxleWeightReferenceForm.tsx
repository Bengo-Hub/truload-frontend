'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';

import type { AxleConfigurationLookupData, AxleWeightReferenceResponse } from '@/types/setup';

interface WeightReferenceFormData {
  axlePosition: number;
  axleLegalWeightKg: number;
  axleGrouping: 'A' | 'B' | 'C' | 'D';
  axleGroupId: string;
  tyreTypeId?: string;
}

interface AxleWeightReferenceFormProps {
  lookupData: AxleConfigurationLookupData;
  axleNumber: number;
  gvwPermissibleKg: number;
  editingReference?: AxleWeightReferenceResponse | null;
  availablePositions: number[];
  onSubmit: (data: WeightReferenceFormData) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

export function AxleWeightReferenceForm({
  lookupData,
  axleNumber: _axleNumber,
  gvwPermissibleKg,
  editingReference,
  availablePositions,
  onSubmit,
  onCancel,
  isLoading,
}: AxleWeightReferenceFormProps) {
  const { register, handleSubmit, reset: _reset, setValue, watch, formState: { errors } } = useForm<WeightReferenceFormData>({
    defaultValues: {
      axlePosition: editingReference?.axlePosition || 1,
      axleLegalWeightKg: editingReference?.axleLegalWeightKg || 0,
      axleGrouping: (editingReference?.axleGrouping as 'A' | 'B' | 'C' | 'D') || 'A',
      axleGroupId: editingReference?.axleGroupId || '',
      tyreTypeId: editingReference?.tyreTypeId || undefined,
    },
  });

  const validateWeight = (weight: number) => {
    if (weight <= 0 || weight > 15000) {
      return 'Weight must be between 1 and 15,000 kg';
    }
    if (weight > gvwPermissibleKg) {
      return `Weight cannot exceed GVW limit of ${gvwPermissibleKg} kg`;
    }
    return undefined;
  };

  const handleFormSubmit = async (data: WeightReferenceFormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 p-4 border rounded-lg bg-muted/30">
      {/* Row 1: Position, Grouping, Weight */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="axlePosition">
            Position <span className="text-red-500">*</span>
          </Label>
          <Select
            value={watch('axlePosition')?.toString()}
            onValueChange={(value) => setValue('axlePosition', parseInt(value))}
            disabled={!!editingReference}
          >
            <SelectTrigger className={editingReference ? 'bg-muted' : ''}>
              <SelectValue placeholder="Select position" />
            </SelectTrigger>
            <SelectContent>
              {availablePositions.map(pos => (
                <SelectItem key={pos} value={pos.toString()}>
                  Position {pos}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {editingReference && (
            <p className="text-xs text-muted-foreground">Position cannot be changed</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="axleGrouping">
            Deck Grouping <span className="text-red-500">*</span>
          </Label>
          <Select
            value={watch('axleGrouping')}
            onValueChange={(value) => setValue('axleGrouping', value as 'A' | 'B' | 'C' | 'D')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A">
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-blue-500 text-white text-xs flex items-center justify-center font-bold">A</span>
                  Front (Steering)
                </span>
              </SelectItem>
              <SelectItem value="B">
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-green-500 text-white text-xs flex items-center justify-center font-bold">B</span>
                  Coupling
                </span>
              </SelectItem>
              <SelectItem value="C">
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-orange-500 text-white text-xs flex items-center justify-center font-bold">C</span>
                  Mid Section
                </span>
              </SelectItem>
              <SelectItem value="D">
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-purple-500 text-white text-xs flex items-center justify-center font-bold">D</span>
                  Rear
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="axleLegalWeightKg">
            Permissible Weight (kg) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="axleLegalWeightKg"
            type="number"
            min="1"
            max="15000"
            placeholder="e.g., 8000"
            {...register('axleLegalWeightKg', {
              valueAsNumber: true,
              validate: validateWeight
            })}
            className={errors.axleLegalWeightKg ? 'border-red-500 focus-visible:ring-red-500' : ''}
          />
          {errors.axleLegalWeightKg && (
            <p className="text-sm text-red-600">{errors.axleLegalWeightKg.message}</p>
          )}
        </div>
      </div>

      {/* Row 2: Axle Group, Tyre Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="axleGroupId">
            Axle Group <span className="text-red-500">*</span>
          </Label>
          <Select
            value={watch('axleGroupId')}
            onValueChange={(value) => setValue('axleGroupId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select axle group" />
            </SelectTrigger>
            <SelectContent>
              {lookupData.axleGroups.map(group => (
                <SelectItem key={group.id} value={group.id}>
                  <span className="font-mono">{group.code}</span> - {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tyreTypeId">Tyre Type</Label>
          <Select
            value={watch('tyreTypeId') || 'none'}
            onValueChange={(value) => setValue('tyreTypeId', value === 'none' ? undefined : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Optional - No selection" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No selection</SelectItem>
              {lookupData.tyreTypes.map(tyre => (
                <SelectItem key={tyre.id} value={tyre.id}>
                  <span className="font-mono">{tyre.code}</span> - {tyre.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : editingReference ? 'Update Reference' : 'Add Reference'}
        </Button>
      </div>
    </form>
  );
}