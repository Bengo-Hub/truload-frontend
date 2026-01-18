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
  axleNumber,
  gvwPermissibleKg,
  editingReference,
  availablePositions,
  onSubmit,
  onCancel,
  isLoading,
}: AxleWeightReferenceFormProps) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<WeightReferenceFormData>({
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
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="space-y-2">
          <Label htmlFor="axlePosition">Position</Label>
          <Select
            value={watch('axlePosition')?.toString()}
            onValueChange={(value) => setValue('axlePosition', parseInt(value))}
            disabled={!!editingReference}
          >
            <SelectTrigger>
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="axleGrouping">Grouping</Label>
          <Select
            value={watch('axleGrouping')}
            onValueChange={(value) => setValue('axleGrouping', value as 'A' | 'B' | 'C' | 'D')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A">A (Front)</SelectItem>
              <SelectItem value="B">B (Coupling)</SelectItem>
              <SelectItem value="C">C (Mid)</SelectItem>
              <SelectItem value="D">D (Rear)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="axleGroupId">Axle Group</Label>
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
                  {group.code} - {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tyreTypeId">Tyre Type (Optional)</Label>
          <Select
            value={watch('tyreTypeId') || ''}
            onValueChange={(value) => setValue('tyreTypeId', value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="No selection" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No selection</SelectItem>
              {lookupData.tyreTypes.map(tyre => (
                <SelectItem key={tyre.id} value={tyre.id}>
                  {tyre.code} - {tyre.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="axleLegalWeightKg">Weight (kg)</Label>
          <Input
            id="axleLegalWeightKg"
            type="number"
            min="1"
            max="15000"
            {...register('axleLegalWeightKg', {
              valueAsNumber: true,
              validate: validateWeight
            })}
            className={errors.axleLegalWeightKg ? 'border-red-500' : ''}
          />
          {errors.axleLegalWeightKg && (
            <p className="text-sm text-red-600">{errors.axleLegalWeightKg.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {editingReference ? 'Update' : 'Add'} Reference
        </Button>
      </div>
    </form>
  );
}