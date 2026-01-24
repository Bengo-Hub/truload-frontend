"use client";

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CreateVehicleMakeRequest, VehicleMake } from '@/types/weighing';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { EntityModal, ModalMode } from './EntityModal';

interface VehicleMakeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ModalMode;
  make?: VehicleMake | null;
  onSave: (data: CreateVehicleMakeRequest) => Promise<void>;
  isSaving?: boolean;
}

const MANUFACTURER_COUNTRIES = [
  'Japan',
  'Germany',
  'USA',
  'Sweden',
  'Italy',
  'France',
  'China',
  'India',
  'South Korea',
  'United Kingdom',
  'Other',
];

/**
 * VehicleMakeModal - Create/Edit/View vehicle manufacturer details
 *
 * Fields mapped from Backend Model: Models/Infrastructure/VehicleMake.cs
 */
export function VehicleMakeModal({
  open,
  onOpenChange,
  mode,
  make,
  onSave,
  isSaving = false,
}: VehicleMakeModalProps) {
  const isViewMode = mode === 'view';

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isValid } } = useForm<CreateVehicleMakeRequest>({
    defaultValues: {
      code: '',
      name: '',
      country: '',
      description: '',
    },
  });

  useEffect(() => {
    if (make && (mode === 'edit' || mode === 'view')) {
      reset({
        code: make.code || '',
        name: make.name || '',
        country: make.country || '',
        description: make.description || '',
      });
    } else if (mode === 'create') {
      reset({
        code: '',
        name: '',
        country: '',
        description: '',
      });
    }
  }, [make, mode, reset]);

  const onSubmit = async (data: CreateVehicleMakeRequest) => {
    await onSave(data);
  };

  return (
    <EntityModal
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      title="Vehicle Make"
      description={mode === 'create' ? 'Add a new vehicle manufacturer' : undefined}
      onSave={handleSubmit(onSubmit)}
      isSaving={isSaving}
      isValid={isValid}
      maxWidth="md"
    >
      <form className="space-y-4">
        {/* Code */}
        <div className="space-y-2">
          <Label htmlFor="code" className="text-sm font-medium">
            Code <span className="text-red-500">*</span>
          </Label>
          <Input
            id="code"
            placeholder="e.g., TOYOTA, SCANIA, VOLVO"
            {...register('code', { required: 'Code is required' })}
            disabled={isViewMode}
            className="font-mono uppercase"
          />
          {errors.code && (
            <p className="text-xs text-red-500">{errors.code.message}</p>
          )}
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">
            Manufacturer Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            placeholder="e.g., Toyota Motor Corporation"
            {...register('name', { required: 'Name is required' })}
            disabled={isViewMode}
          />
          {errors.name && (
            <p className="text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Country of Origin */}
        <div className="space-y-2">
          <Label htmlFor="country" className="text-sm font-medium">Country of Origin</Label>
          <Select
            value={watch('country') || ''}
            onValueChange={(value) => setValue('country', value)}
            disabled={isViewMode}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {MANUFACTURER_COUNTRIES.map((country) => (
                <SelectItem key={country} value={country}>
                  {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">Description</Label>
          <Textarea
            id="description"
            placeholder="Additional notes about this manufacturer..."
            {...register('description')}
            disabled={isViewMode}
            rows={2}
          />
        </div>
      </form>
    </EntityModal>
  );
}
