"use client";

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AxleConfiguration, CreateVehicleRequest, Transporter, Vehicle } from '@/types/weighing';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { EntityModal, ModalMode } from './EntityModal';

interface VehicleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ModalMode;
  vehicle?: Vehicle | null;
  transporters: Transporter[];
  axleConfigurations: AxleConfiguration[];
  onSave: (data: CreateVehicleRequest) => Promise<void>;
  isSaving?: boolean;
}

/**
 * VehicleModal - Create/Edit/View vehicle details
 *
 * Fields mapped from Backend Model: Models/Weighing/Vehicle.cs
 * - regNo (required)
 * - make, model, vehicleType, color
 * - yearOfManufacture, chassisNo, engineNo
 * - transporterId (select)
 * - axleConfigurationId (select)
 */
export function VehicleModal({
  open,
  onOpenChange,
  mode,
  vehicle,
  transporters,
  axleConfigurations,
  onSave,
  isSaving = false,
}: VehicleModalProps) {
  const isViewMode = mode === 'view';

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isValid } } = useForm<CreateVehicleRequest>({
    defaultValues: {
      regNo: '',
      make: '',
      model: '',
      vehicleType: '',
      color: '',
      yearOfManufacture: undefined,
      chassisNo: '',
      engineNo: '',
      transporterId: '',
      axleConfigurationId: '',
    },
  });

  useEffect(() => {
    if (vehicle && (mode === 'edit' || mode === 'view')) {
      reset({
        regNo: vehicle.regNo,
        make: vehicle.make || '',
        model: vehicle.model || '',
        vehicleType: vehicle.vehicleType || '',
        color: vehicle.color || '',
        yearOfManufacture: vehicle.yearOfManufacture,
        chassisNo: vehicle.chassisNo || '',
        engineNo: vehicle.engineNo || '',
        transporterId: vehicle.transporterId || '',
        axleConfigurationId: vehicle.axleConfigurationId || '',
      });
    } else if (mode === 'create') {
      reset({
        regNo: '',
        make: '',
        model: '',
        vehicleType: '',
        color: '',
        yearOfManufacture: undefined,
        chassisNo: '',
        engineNo: '',
        transporterId: '',
        axleConfigurationId: '',
      });
    }
  }, [vehicle, mode, reset]);

  const onSubmit = async (data: CreateVehicleRequest) => {
    await onSave(data);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

  return (
    <EntityModal
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      title="Vehicle"
      description={mode === 'create' ? 'Add a new vehicle to the system' : undefined}
      onSave={handleSubmit(onSubmit)}
      isSaving={isSaving}
      isValid={isValid}
      maxWidth="2xl"
    >
      <form className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Registration Number */}
          <div className="space-y-2">
            <Label htmlFor="regNo" className="text-sm font-medium">
              Registration Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="regNo"
              placeholder="KAA 123A"
              {...register('regNo', { required: 'Registration number is required' })}
              disabled={isViewMode}
              className="font-mono uppercase"
            />
            {errors.regNo && (
              <p className="text-xs text-red-500">{errors.regNo.message}</p>
            )}
          </div>

          {/* Axle Configuration */}
          <div className="space-y-2">
            <Label htmlFor="axleConfigurationId" className="text-sm font-medium">
              Axle Configuration
            </Label>
            <Select
              value={watch('axleConfigurationId') || ''}
              onValueChange={(value) => setValue('axleConfigurationId', value)}
              disabled={isViewMode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select configuration" />
              </SelectTrigger>
              <SelectContent>
                {axleConfigurations.map((config) => (
                  <SelectItem key={config.id} value={config.id}>
                    <span className="font-mono">{config.axleCode}</span>
                    <span className="text-gray-500 ml-2">- {config.description || config.axleName}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Make */}
          <div className="space-y-2">
            <Label htmlFor="make" className="text-sm font-medium">Make</Label>
            <Input
              id="make"
              placeholder="e.g., Mercedes-Benz"
              {...register('make')}
              disabled={isViewMode}
            />
          </div>

          {/* Model */}
          <div className="space-y-2">
            <Label htmlFor="model" className="text-sm font-medium">Model</Label>
            <Input
              id="model"
              placeholder="e.g., Actros 2644"
              {...register('model')}
              disabled={isViewMode}
            />
          </div>

          {/* Vehicle Type */}
          <div className="space-y-2">
            <Label htmlFor="vehicleType" className="text-sm font-medium">Vehicle Type</Label>
            <Select
              value={watch('vehicleType') || ''}
              onValueChange={(value) => setValue('vehicleType', value)}
              disabled={isViewMode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Truck">Truck</SelectItem>
                <SelectItem value="Semi-Trailer">Semi-Trailer</SelectItem>
                <SelectItem value="Full-Trailer">Full-Trailer</SelectItem>
                <SelectItem value="Tanker">Tanker</SelectItem>
                <SelectItem value="Container">Container</SelectItem>
                <SelectItem value="Flatbed">Flatbed</SelectItem>
                <SelectItem value="Tipper">Tipper</SelectItem>
                <SelectItem value="Bus">Bus</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label htmlFor="color" className="text-sm font-medium">Color</Label>
            <Input
              id="color"
              placeholder="e.g., White"
              {...register('color')}
              disabled={isViewMode}
            />
          </div>

          {/* Year of Manufacture */}
          <div className="space-y-2">
            <Label htmlFor="yearOfManufacture" className="text-sm font-medium">Year of Manufacture</Label>
            <Select
              value={watch('yearOfManufacture')?.toString() || ''}
              onValueChange={(value) => setValue('yearOfManufacture', parseInt(value))}
              disabled={isViewMode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transporter */}
          <div className="space-y-2">
            <Label htmlFor="transporterId" className="text-sm font-medium">Transporter</Label>
            <Select
              value={watch('transporterId') || ''}
              onValueChange={(value) => setValue('transporterId', value)}
              disabled={isViewMode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select transporter" />
              </SelectTrigger>
              <SelectContent>
                {transporters.map((transporter) => (
                  <SelectItem key={transporter.id} value={transporter.id}>
                    <span className="font-mono">{transporter.code}</span>
                    <span className="text-gray-500 ml-2">- {transporter.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Chassis Number */}
          <div className="space-y-2">
            <Label htmlFor="chassisNo" className="text-sm font-medium">Chassis Number</Label>
            <Input
              id="chassisNo"
              placeholder="Chassis number"
              {...register('chassisNo')}
              disabled={isViewMode}
              className="font-mono"
            />
          </div>

          {/* Engine Number */}
          <div className="space-y-2">
            <Label htmlFor="engineNo" className="text-sm font-medium">Engine Number</Label>
            <Input
              id="engineNo"
              placeholder="Engine number"
              {...register('engineNo')}
              disabled={isViewMode}
              className="font-mono"
            />
          </div>
        </div>
      </form>
    </EntityModal>
  );
}
