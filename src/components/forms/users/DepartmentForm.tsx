'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

interface DepartmentFormData {
  name: string;
  description?: string;
}

interface DepartmentFormProps {
  mode: 'create' | 'edit';
  initialData?: DepartmentFormData & { id?: string };
  onSubmit: (data: DepartmentFormData) => Promise<void>;
  onCancel?: () => void;
}

export function DepartmentForm({ mode, initialData, onSubmit, onCancel }: DepartmentFormProps) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DepartmentFormData>({
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || '',
        description: initialData.description || '',
      });
    }
  }, [initialData, reset]);

  const handleFormSubmit = async (data: DepartmentFormData) => {
    try {
      await onSubmit(data);
      toast.success(mode === 'create' ? 'Department created successfully' : 'Department updated successfully');
      
      if (mode === 'create') {
        reset();
      }
    } catch (error) {
      toast.error(`Failed to ${mode} department`);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {/* Department Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="required">Department Name</Label>
          <Input
            id="name"
            {...register('name', { required: 'Department name is required' })}
            placeholder="e.g., Operations, Administration"
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Enter department description (optional)"
            rows={4}
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
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Department' : 'Update Department'}
        </Button>
      </div>
    </form>
  );
}
