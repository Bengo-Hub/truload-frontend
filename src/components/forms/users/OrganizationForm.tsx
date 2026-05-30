'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

interface OrganizationFormData {
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  streetAddress?: string;
  poBox?: string;
  city?: string;
  country?: string;
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
      website: initialData?.website || '',
      streetAddress: initialData?.streetAddress || '',
      poBox: initialData?.poBox || '',
      city: initialData?.city || '',
      country: initialData?.country || '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || '',
        contactEmail: initialData.contactEmail || '',
        contactPhone: initialData.contactPhone || '',
        website: initialData.website || '',
        streetAddress: initialData.streetAddress || '',
        poBox: initialData.poBox || '',
        city: initialData.city || '',
        country: initialData.country || '',
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
    } catch {
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
                  value: /^$|^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
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
              placeholder="e.g., 0717105233"
            />
          </div>

          {/* Website */}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              {...register('website')}
              placeholder="e.g., www.organisation.go.ke"
            />
          </div>
        </div>

        {/* Address Section */}
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground">Address Details</p>

          {/* Street Address */}
          <div className="space-y-2">
            <Label htmlFor="streetAddress">Street Address</Label>
            <Input
              id="streetAddress"
              {...register('streetAddress')}
              placeholder="e.g., Barabara Plaza-JKIA, Off Airport South Road Along Mazao Road"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* PO Box */}
            <div className="space-y-2">
              <Label htmlFor="poBox">P.O Box</Label>
              <Input
                id="poBox"
                {...register('poBox')}
                placeholder="e.g., 41727-00100"
              />
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                {...register('city')}
                placeholder="e.g., Nairobi"
              />
            </div>

            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                {...register('country')}
                placeholder="e.g., Kenya"
              />
            </div>
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
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Organization' : 'Update Organization'}
        </Button>
      </div>
    </form>
  );
}
