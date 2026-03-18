"use client";

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AxleConfiguration, CreateVehicleModelRequest, VehicleMake, VehicleModel } from '@/types/weighing';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { EntityModal, ModalMode } from './EntityModal';

interface VehicleModelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ModalMode;
  model?: VehicleModel | null;
  makes: VehicleMake[]; // Available makes for selection
  axleConfigurations?: AxleConfiguration[]; // Available configs for selection
  onSave: (data: CreateVehicleModelRequest) => Promise<void>;
  isSaving?: boolean;
}

const VEHICLE_CATEGORIES = [
  { value: 'Truck', label: 'Truck' },
  { value: 'Trailer', label: 'Trailer' },
  { value: 'Bus', label: 'Bus' },
  { value: 'Van', label: 'Van' },
  { value: 'Other', label: 'Other' },
];

/**
 * VehicleModelModal - Create/Edit/View vehicle model details
 *
 * Fields mapped from Backend Model: Models/Infrastructure/VehicleModel.cs
 */
export function VehicleModelModal({
  open,
  onOpenChange,
  mode,
  model,
  makes,
  axleConfigurations = [],
  onSave,
  isSaving = false,
}: VehicleModelModalProps) {
  const isViewMode = mode === 'view';

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isValid } } = useForm<CreateVehicleModelRequest>({
    defaultValues: {
      code: '',
      name: '',
      makeId: '',
      vehicleCategory: 'Truck',
      axleConfigurationId: '',
      description: '',
    },
  });

  useEffect(() => {
    if (model && (mode === 'edit' || mode === 'view')) {
      reset({
        code: model.code || '',
        name: model.name || '',
        makeId: model.makeId || '',
        vehicleCategory: model.vehicleCategory || 'Truck',
        axleConfigurationId: model.axleConfigurationId || '',
        description: model.description || '',
      });
    } else if (mode === 'create') {
      reset({
        code: '',
        name: '',
        makeId: '',
        vehicleCategory: 'Truck',
        axleConfigurationId: '',
        description: '',
      });
    }
  }, [model, mode, reset]);

  const onSubmit = async (data: CreateVehicleModelRequest) => {
    await onSave(data);
  };

  return (
    <EntityModal
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      title="Vehicle Model"
      description={mode === 'create' ? 'Add a new vehicle model' : undefined}
      onSave={handleSubmit(onSubmit)}
      isSaving={isSaving}
      isValid={isValid}
      maxWidth="lg"
    >
      <form className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Model Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Hilux Double Cab, Actros 2643"
              {...register('name', { 
                required: 'Name is required',
                onChange: (e) => {
                  if (mode === 'create') {
                    const val = e.target.value;
                    const generated = val.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
                    setValue('code', generated);
                  }
                }
              })}
              disabled={isViewMode}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Code */}
          <div className="space-y-2">
            <Label htmlFor="code" className="text-sm font-medium">
              Model Code <span className="text-red-500">*</span>
            </Label>
            <Input
              id="code"
              placeholder="AUTO-GENERATED"
              {...register('code', { required: 'Code is required' })}
              disabled={true}
              className="font-mono uppercase bg-gray-50"
            />
            {errors.code && (
              <p className="text-xs text-red-500">{errors.code.message}</p>
            )}
          </div>

          {/* Make */}
          <div className="space-y-2">
            <Label htmlFor="makeId" className="text-sm font-medium">
              Manufacturer <span className="text-red-500">*</span>
            </Label>
            <Select
              value={watch('makeId') || ''}
              onValueChange={(value) => setValue('makeId', value)}
              disabled={isViewMode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select manufacturer" />
              </SelectTrigger>
              <SelectContent>
                {makes.map((make) => (
                  <SelectItem key={make.id} value={make.id}>
                    {make.name} ({make.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.makeId && (
              <p className="text-xs text-red-500">{errors.makeId.message}</p>
            )}
          </div>

          {/* Vehicle Category */}
          <div className="space-y-2">
            <Label htmlFor="vehicleCategory" className="text-sm font-medium">Vehicle Category</Label>
            <Select
              value={watch('vehicleCategory') || 'Truck'}
              onValueChange={(value) => setValue('vehicleCategory', value as CreateVehicleModelRequest['vehicleCategory'])}
              disabled={isViewMode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Default Axle Configuration */}
          {axleConfigurations.length > 0 && (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="axleConfigurationId" className="text-sm font-medium">
                Default Axle Configuration
              </Label>
              <Select
                value={watch('axleConfigurationId') || 'none'}
                onValueChange={(value) => setValue('axleConfigurationId', value === 'none' ? '' : value)}
                disabled={isViewMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select default axle config (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {axleConfigurations.map((config) => (
                    <SelectItem key={config.id} value={config.id}>
                      {config.axleCode} - {config.axleName} ({config.axleNumber} axles)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Assign a default axle configuration for this vehicle model
              </p>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">Description</Label>
          <Textarea
            id="description"
            placeholder="Additional notes about this model..."
            {...register('description')}
            disabled={isViewMode}
            rows={2}
          />
        </div>

        {/* View Mode: Additional Info */}
        {isViewMode && model && (
          <div className="space-y-2 pt-4 border-t">
            <h4 className="text-sm font-semibold text-gray-700">Status Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm text-gray-500">Manufacturer</Label>
                <p className="font-medium">{model.makeName || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-gray-500">Status</Label>
                <p className={`font-medium ${model.isActive ? 'text-green-600' : 'text-red-600'}`}>
                  {model.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
          </div>
        )}
      </form>
    </EntityModal>
  );
}
