"use client";

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CreateDriverRequest, Driver } from '@/types/weighing';
import { format } from 'date-fns';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { EntityModal, ModalMode } from './EntityModal';

interface DriverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ModalMode;
  driver?: Driver | null;
  onSave: (data: CreateDriverRequest) => Promise<void>;
  isSaving?: boolean;
}

const LICENSE_CLASSES = [
  { value: 'A', label: 'A - Motorcycles' },
  { value: 'B', label: 'B - Light Vehicles' },
  { value: 'C', label: 'C - Medium Goods Vehicles' },
  { value: 'D', label: 'D - Heavy Goods Vehicles' },
  { value: 'E', label: 'E - Trailers' },
  { value: 'BCE', label: 'BCE - Commercial' },
  { value: 'BCDE', label: 'BCDE - All Commercial' },
];

const NATIONALITIES = [
  'Kenyan',
  'Ugandan',
  'Tanzanian',
  'Rwandan',
  'Burundian',
  'South Sudanese',
  'Ethiopian',
  'Congolese',
  'Other',
];

/**
 * DriverModal - Create/Edit/View driver details
 *
 * Fields mapped from Backend Model: Models/Weighing/Driver.cs
 */
export function DriverModal({
  open,
  onOpenChange,
  mode,
  driver,
  onSave,
  isSaving = false,
}: DriverModalProps) {
  const isViewMode = mode === 'view';

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isValid } } = useForm<CreateDriverRequest>({
    defaultValues: {
      ntsaId: '',
      idNumber: '',
      drivingLicenseNo: '',
      fullNames: '',
      surname: '',
      gender: '',
      nationality: 'Kenyan',
      dateOfBirth: '',
      address: '',
      phoneNumber: '',
      email: '',
      licenseClass: '',
      licenseIssueDate: '',
      licenseExpiryDate: '',
      isProfessionalDriver: false,
    },
  });

  useEffect(() => {
    if (driver && (mode === 'edit' || mode === 'view')) {
      reset({
        ntsaId: driver.ntsaId || '',
        idNumber: driver.idNumber || '',
        drivingLicenseNo: driver.drivingLicenseNo || '',
        fullNames: driver.fullNames || '',
        surname: driver.surname || '',
        gender: driver.gender || '',
        nationality: driver.nationality || 'Kenyan',
        dateOfBirth: driver.dateOfBirth ? format(new Date(driver.dateOfBirth), 'yyyy-MM-dd') : '',
        address: driver.address || '',
        phoneNumber: driver.phoneNumber || '',
        email: driver.email || '',
        licenseClass: driver.licenseClass || '',
        licenseIssueDate: driver.licenseIssueDate ? format(new Date(driver.licenseIssueDate), 'yyyy-MM-dd') : '',
        licenseExpiryDate: driver.licenseExpiryDate ? format(new Date(driver.licenseExpiryDate), 'yyyy-MM-dd') : '',
        isProfessionalDriver: driver.isProfessionalDriver,
      });
    } else if (mode === 'create') {
      reset({
        ntsaId: '',
        idNumber: '',
        drivingLicenseNo: '',
        fullNames: '',
        surname: '',
        gender: '',
        nationality: 'Kenyan',
        dateOfBirth: '',
        address: '',
        phoneNumber: '',
        email: '',
        licenseClass: '',
        licenseIssueDate: '',
        licenseExpiryDate: '',
        isProfessionalDriver: false,
      });
    }
  }, [driver, mode, reset]);

  const onSubmit = async (data: CreateDriverRequest) => {
    await onSave(data);
  };

  return (
    <EntityModal
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      title="Driver"
      description={mode === 'create' ? 'Add a new driver to the system' : undefined}
      onSave={handleSubmit(onSubmit)}
      isSaving={isSaving}
      isValid={isValid}
      maxWidth="2xl"
    >
      <form className="space-y-6">
        {/* Personal Information */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-700 border-b pb-2">Personal Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Names */}
            <div className="space-y-2">
              <Label htmlFor="fullNames" className="text-sm font-medium">
                Full Names <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fullNames"
                placeholder="First and middle names"
                {...register('fullNames', { required: 'Full names are required' })}
                disabled={isViewMode}
              />
              {errors.fullNames && (
                <p className="text-xs text-red-500">{errors.fullNames.message}</p>
              )}
            </div>

            {/* Surname */}
            <div className="space-y-2">
              <Label htmlFor="surname" className="text-sm font-medium">
                Surname <span className="text-red-500">*</span>
              </Label>
              <Input
                id="surname"
                placeholder="Last name"
                {...register('surname', { required: 'Surname is required' })}
                disabled={isViewMode}
              />
              {errors.surname && (
                <p className="text-xs text-red-500">{errors.surname.message}</p>
              )}
            </div>

            {/* ID Number */}
            <div className="space-y-2">
              <Label htmlFor="idNumber" className="text-sm font-medium">ID/Passport Number</Label>
              <Input
                id="idNumber"
                placeholder="National ID or Passport"
                {...register('idNumber')}
                disabled={isViewMode}
                className="font-mono"
              />
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label htmlFor="gender" className="text-sm font-medium">Gender</Label>
              <Select
                value={watch('gender') || ''}
                onValueChange={(value) => setValue('gender', value)}
                disabled={isViewMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Nationality */}
            <div className="space-y-2">
              <Label htmlFor="nationality" className="text-sm font-medium">Nationality</Label>
              <Select
                value={watch('nationality') || 'Kenyan'}
                onValueChange={(value) => setValue('nationality', value)}
                disabled={isViewMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select nationality" />
                </SelectTrigger>
                <SelectContent>
                  {NATIONALITIES.map((nat) => (
                    <SelectItem key={nat} value={nat}>{nat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth" className="text-sm font-medium">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                {...register('dateOfBirth')}
                disabled={isViewMode}
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-sm font-medium">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="+254 7XX XXX XXX"
                {...register('phoneNumber')}
                disabled={isViewMode}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="driver@example.com"
                {...register('email')}
                disabled={isViewMode}
              />
            </div>
          </div>
        </div>

        {/* License Information */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-700 border-b pb-2">License Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* NTSA ID */}
            <div className="space-y-2">
              <Label htmlFor="ntsaId" className="text-sm font-medium">NTSA ID</Label>
              <Input
                id="ntsaId"
                placeholder="NTSA registration ID"
                {...register('ntsaId')}
                disabled={isViewMode}
                className="font-mono"
              />
            </div>

            {/* Driving License Number */}
            <div className="space-y-2">
              <Label htmlFor="drivingLicenseNo" className="text-sm font-medium">License Number</Label>
              <Input
                id="drivingLicenseNo"
                placeholder="Driving license number"
                {...register('drivingLicenseNo')}
                disabled={isViewMode}
                className="font-mono"
              />
            </div>

            {/* License Class */}
            <div className="space-y-2">
              <Label htmlFor="licenseClass" className="text-sm font-medium">License Class</Label>
              <Select
                value={watch('licenseClass') || ''}
                onValueChange={(value) => setValue('licenseClass', value)}
                disabled={isViewMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {LICENSE_CLASSES.map((cls) => (
                    <SelectItem key={cls.value} value={cls.value}>{cls.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Professional Driver */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Professional Driver</Label>
              <div className="flex items-center gap-2 pt-2">
                <Switch
                  checked={watch('isProfessionalDriver') || false}
                  onCheckedChange={(checked) => setValue('isProfessionalDriver', checked)}
                  disabled={isViewMode}
                />
                <span className="text-sm text-gray-600">
                  {watch('isProfessionalDriver') ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            {/* License Issue Date */}
            <div className="space-y-2">
              <Label htmlFor="licenseIssueDate" className="text-sm font-medium">Issue Date</Label>
              <Input
                id="licenseIssueDate"
                type="date"
                {...register('licenseIssueDate')}
                disabled={isViewMode}
              />
            </div>

            {/* License Expiry Date */}
            <div className="space-y-2">
              <Label htmlFor="licenseExpiryDate" className="text-sm font-medium">Expiry Date</Label>
              <Input
                id="licenseExpiryDate"
                type="date"
                {...register('licenseExpiryDate')}
                disabled={isViewMode}
              />
            </div>
          </div>
        </div>

        {/* View Mode: Additional Info */}
        {isViewMode && driver && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 border-b pb-2">Status Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm text-gray-500">License Status</Label>
                <p className={`font-medium ${
                  driver.licenseStatus === 'active' ? 'text-green-600' :
                  driver.licenseStatus === 'expired' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {driver.licenseStatus.toUpperCase()}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-gray-500">Demerit Points</Label>
                <p className={`font-mono font-bold ${
                  driver.currentDemeritPoints >= 10 ? 'text-red-600' :
                  driver.currentDemeritPoints >= 5 ? 'text-yellow-600' :
                  'text-gray-900'
                }`}>
                  {driver.currentDemeritPoints}
                </p>
              </div>
            </div>
          </div>
        )}
      </form>
    </EntityModal>
  );
}
