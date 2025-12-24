'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

interface ShiftFormData {
  name: string;
  startTime: string;
  endTime: string;
  description?: string;
}

interface ShiftFormProps {
  mode: 'create' | 'edit';
  initialData?: ShiftFormData & { id?: string };
  onSubmit: (data: ShiftFormData) => Promise<void>;
  onCancel?: () => void;
}

export function ShiftForm({ mode, initialData, onSubmit, onCancel }: ShiftFormProps) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ShiftFormData>({
    defaultValues: {
      name: initialData?.name || '',
      startTime: initialData?.startTime || '',
      endTime: initialData?.endTime || '',
      description: initialData?.description || '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || '',
        startTime: initialData.startTime || '',
        endTime: initialData.endTime || '',
        description: initialData.description || '',
      });
    }
  }, [initialData, reset]);

  const handleFormSubmit = async (data: ShiftFormData) => {
    try {
      await onSubmit(data);
      toast.success(mode === 'create' ? 'Shift created successfully' : 'Shift updated successfully');
      
      if (mode === 'create') {
        reset();
      }
    } catch (error) {
      toast.error(`Failed to ${mode} shift`);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {/* Shift Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="required">Shift Name</Label>
          <Input
            id="name"
            {...register('name', { required: 'Shift name is required' })}
            placeholder="e.g., Morning Shift, Night Shift"
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Start Time */}
          <div className="space-y-2">
            <Label htmlFor="startTime" className="required">Start Time</Label>
            <Input
              id="startTime"
              type="time"
              {...register('startTime', { required: 'Start time is required' })}
              className={errors.startTime ? 'border-red-500' : ''}
            />
            {errors.startTime && (
              <p className="text-sm text-red-500">{errors.startTime.message}</p>
            )}
          </div>

          {/* End Time */}
          <div className="space-y-2">
            <Label htmlFor="endTime" className="required">End Time</Label>
            <Input
              id="endTime"
              type="time"
              {...register('endTime', { required: 'End time is required' })}
              className={errors.endTime ? 'border-red-500' : ''}
            />
            {errors.endTime && (
              <p className="text-sm text-red-500">{errors.endTime.message}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Enter shift description (optional)"
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
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Shift' : 'Update Shift'}
        </Button>
      </div>
    </form>
  );
}
