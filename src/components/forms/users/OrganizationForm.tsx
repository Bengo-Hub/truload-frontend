'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

interface OrganizationFormData {
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
}

interface OrganizationFormProps {
  mode: 'create' | 'edit';
  initialData?: OrganizationFormData & { id?: string };
  onSubmit: (data: OrganizationFormData) => Promise<void>;
  onCancel?: () => void;
}

export function OrganizationForm({ mode, initialData, onSubmit, onCancel }: OrganizationFormProps) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<OrganizationFormData>({
    defaultValues: {
      name: initialData?.name || '',
      contactEmail: initialData?.contactEmail || '',
      contactPhone: initialData?.contactPhone || '',
      address: initialData?.address || '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || '',
        contactEmail: initialData.contactEmail || '',
        contactPhone: initialData.contactPhone || '',
        address: initialData.address || '',
      });
    }
  }, [initialData, reset]);

  const handleFormSubmit = async (data: OrganizationFormData) => {
    try {
      await onSubmit(data);
      toast.success(mode === 'create' ? 'Organization created successfully' : 'Organization updated successfully');
      
      if (mode === 'create') {
        reset();
      }
    } catch (error) {
      toast.error(`Failed to ${mode} organization`);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {/* Organization Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="required">Organization Name</Label>
          <Input
            id="name"
            {...register('name', { required: 'Organization name is required' })}
            placeholder="e.g., Kenya Roads Board"
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Email */}
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact Email</Label>
            <Input
              id="contactEmail"
              type="email"
              {...register('contactEmail', {
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
              placeholder="e.g., info@organization.ke"
              className={errors.contactEmail ? 'border-red-500' : ''}
            />
            {errors.contactEmail && (
              <p className="text-sm text-red-500">{errors.contactEmail.message}</p>
            )}
          </div>

          {/* Contact Phone */}
          <div className="space-y-2">
            <Label htmlFor="contactPhone">Contact Phone</Label>
            <Input
              id="contactPhone"
              type="tel"
              {...register('contactPhone')}
              placeholder="e.g., +254 700 000000"
            />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            {...register('address')}
            placeholder="Enter organization address (optional)"
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
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Organization' : 'Update Organization'}
        </Button>
      </div>
    </form>
  );
}
