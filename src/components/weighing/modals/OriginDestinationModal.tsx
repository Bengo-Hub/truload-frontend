"use client";

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateOriginDestinationRequest, LocationType, OriginDestination } from '@/types/weighing';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { EntityModal, ModalMode } from './EntityModal';

interface OriginDestinationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ModalMode;
  location?: OriginDestination | null;
  onSave: (data: CreateOriginDestinationRequest) => Promise<void>;
  isSaving?: boolean;
}

const LOCATION_TYPES: { value: LocationType; label: string }[] = [
  { value: 'city', label: 'City' },
  { value: 'town', label: 'Town' },
  { value: 'port', label: 'Port' },
  { value: 'border', label: 'Border Crossing' },
  { value: 'warehouse', label: 'Warehouse' },
];

const EAC_COUNTRIES = [
  'Kenya',
  'Uganda',
  'Tanzania',
  'Rwanda',
  'Burundi',
  'South Sudan',
  'DRC',
];

/**
 * OriginDestinationModal - Create/Edit/View origin/destination location
 *
 * Fields mapped from Backend Model: Models/Infrastructure/OriginsDestinations.cs
 */
export function OriginDestinationModal({
  open,
  onOpenChange,
  mode,
  location,
  onSave,
  isSaving = false,
}: OriginDestinationModalProps) {
  const isViewMode = mode === 'view';

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isValid } } = useForm<CreateOriginDestinationRequest>({
    defaultValues: {
      code: '',
      name: '',
      locationType: 'city',
      country: 'Kenya',
    },
  });

  useEffect(() => {
    if (location && (mode === 'edit' || mode === 'view')) {
      reset({
        code: location.code || '',
        name: location.name || '',
        locationType: location.locationType || 'city',
        country: location.country || 'Kenya',
      });
    } else if (mode === 'create') {
      reset({
        code: '',
        name: '',
        locationType: 'city',
        country: 'Kenya',
      });
    }
  }, [location, mode, reset]);

  const onSubmit = async (data: CreateOriginDestinationRequest) => {
    await onSave(data);
  };

  return (
    <EntityModal
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      title="Location"
      description={mode === 'create' ? 'Add a new origin/destination location' : undefined}
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
            placeholder="e.g., NBI, MBA, MSA"
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
            Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            placeholder="Location name"
            {...register('name', { required: 'Name is required' })}
            disabled={isViewMode}
          />
          {errors.name && (
            <p className="text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Location Type */}
        <div className="space-y-2">
          <Label htmlFor="locationType" className="text-sm font-medium">Location Type</Label>
          <Select
            value={watch('locationType') || 'city'}
            onValueChange={(value) => setValue('locationType', value as LocationType)}
            disabled={isViewMode}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {LOCATION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Country */}
        <div className="space-y-2">
          <Label htmlFor="country" className="text-sm font-medium">Country</Label>
          <Select
            value={watch('country') || 'Kenya'}
            onValueChange={(value) => setValue('country', value)}
            disabled={isViewMode}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {EAC_COUNTRIES.map((country) => (
                <SelectItem key={country} value={country}>
                  {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </form>
    </EntityModal>
  );
}
