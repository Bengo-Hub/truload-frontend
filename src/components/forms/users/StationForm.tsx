'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

interface StationFormData {
  name: string;
  location?: string;
  code?: string;
}

interface StationFormProps {
  mode: 'create' | 'edit';
  initialData?: StationFormData & { id?: string };
  onSubmit: (data: StationFormData) => Promise<void>;
  onCancel?: () => void;
}

export function StationForm({ mode, initialData, onSubmit, onCancel }: StationFormProps) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<StationFormData>({
    defaultValues: {
      name: initialData?.name || '',
      location: initialData?.location || '',
      code: initialData?.code || '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || '',
        location: initialData.location || '',
        code: initialData.code || '',
      });
    }
  }, [initialData, reset]);

  const handleFormSubmit = async (data: StationFormData) => {
    try {
      await onSubmit(data);
      toast.success(mode === 'create' ? 'Station created successfully' : 'Station updated successfully');
      
      if (mode === 'create') {
        reset();
      }
    } catch (error) {
      toast.error(`Failed to ${mode} station`);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {/* Station Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="required">Station Name</Label>
          <Input
            id="name"
            {...register('name', { required: 'Station name is required' })}
            placeholder="e.g., Nairobi Weighbridge, Mombasa Station"
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Station Code */}
          <div className="space-y-2">
            <Label htmlFor="code">Station Code</Label>
            <Input
              id="code"
              {...register('code')}
              placeholder="e.g., NRB-001"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              {...register('location')}
              placeholder="e.g., Nairobi, Kenya"
            />
          </div>
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
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Station' : 'Update Station'}
        </Button>
      </div>
    </form>
  );
}
