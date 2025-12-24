'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

interface AxleConfigFormData {
  name: string;
  numberOfAxles: number;
  maxGrossWeight: number;
  description?: string;
}

interface AxleConfigurationFormProps {
  mode: 'create' | 'edit';
  initialData?: AxleConfigFormData & { id?: string };
  onSubmit: (data: AxleConfigFormData) => Promise<void>;
  onCancel?: () => void;
}

export function AxleConfigurationForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
}: AxleConfigurationFormProps) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AxleConfigFormData>({
    defaultValues: {
      name: initialData?.name || '',
      numberOfAxles: initialData?.numberOfAxles || 0,
      maxGrossWeight: initialData?.maxGrossWeight || 0,
      description: initialData?.description || '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || '',
        numberOfAxles: initialData.numberOfAxles || 0,
        maxGrossWeight: initialData.maxGrossWeight || 0,
        description: initialData.description || '',
      });
    }
  }, [initialData, reset]);

  const handleFormSubmit = async (data: AxleConfigFormData) => {
    try {
      await onSubmit(data);
      toast.success(mode === 'create' ? 'Axle configuration created successfully' : 'Axle configuration updated successfully');
      
      if (mode === 'create') {
        reset();
      }
    } catch (error) {
      toast.error(`Failed to ${mode} axle configuration`);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {/* Configuration Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="required">Configuration Name</Label>
          <Input
            id="name"
            {...register('name', { required: 'Configuration name is required' })}
            placeholder="e.g., 2-Axle, 3-Axle"
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Number of Axles */}
          <div className="space-y-2">
            <Label htmlFor="numberOfAxles" className="required">Number of Axles</Label>
            <Input
              id="numberOfAxles"
              type="number"
              min="1"
              {...register('numberOfAxles', {
                required: 'Number of axles is required',
                valueAsNumber: true,
                min: { value: 1, message: 'Must be at least 1' },
              })}
              className={errors.numberOfAxles ? 'border-red-500' : ''}
            />
            {errors.numberOfAxles && (
              <p className="text-sm text-red-500">{errors.numberOfAxles.message}</p>
            )}
          </div>

          {/* Max Gross Weight */}
          <div className="space-y-2">
            <Label htmlFor="maxGrossWeight" className="required">Max Gross Weight (kg)</Label>
            <Input
              id="maxGrossWeight"
              type="number"
              min="0"
              step="0.01"
              {...register('maxGrossWeight', {
                required: 'Max gross weight is required',
                valueAsNumber: true,
                min: { value: 0, message: 'Must be at least 0' },
              })}
              className={errors.maxGrossWeight ? 'border-red-500' : ''}
            />
            {errors.maxGrossWeight && (
              <p className="text-sm text-red-500">{errors.maxGrossWeight.message}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Enter configuration description (optional)"
            rows={3}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Configuration' : 'Update Configuration'}
        </Button>
      </div>
    </form>
  );
}
