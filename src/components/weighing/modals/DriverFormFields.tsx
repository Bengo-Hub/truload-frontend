'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { CreateDriverRequest } from '@/types/weighing';

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

export type DriverFormValues = Partial<CreateDriverRequest>;

export interface DriverFormFieldsProps {
  values: DriverFormValues;
  onChange: (field: keyof CreateDriverRequest, value: string | boolean | undefined) => void;
  errors?: Partial<Record<keyof CreateDriverRequest, string>>;
  disabled?: boolean;
  /** Required fields to show asterisk and validate. Default: fullNames, surname */
  requiredFields?: (keyof CreateDriverRequest)[];
  /** Prefix for input ids to avoid collisions when multiple instances exist. */
  idPrefix?: string;
}

const defaultRequired: (keyof CreateDriverRequest)[] = ['fullNames', 'surname'];

export function DriverFormFields({
  values,
  onChange,
  errors = {},
  disabled = false,
  requiredFields = defaultRequired,
  idPrefix = 'driver-form',
}: DriverFormFieldsProps) {
  const required = (k: keyof CreateDriverRequest) => requiredFields.includes(k);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-700 border-b pb-2">Personal Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-fullNames`} className="text-sm font-medium">
              Full Names {required('fullNames') && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={`${idPrefix}-fullNames`}
              placeholder="First and middle names"
              value={values.fullNames ?? ''}
              onChange={(e) => onChange('fullNames', e.target.value)}
              disabled={disabled}
            />
            {errors.fullNames && (
              <p className="text-xs text-red-500">{errors.fullNames}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-surname`} className="text-sm font-medium">
              Surname {required('surname') && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={`${idPrefix}-surname`}
              placeholder="Last name"
              value={values.surname ?? ''}
              onChange={(e) => onChange('surname', e.target.value)}
              disabled={disabled}
            />
            {errors.surname && (
              <p className="text-xs text-red-500">{errors.surname}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-idNumber`} className="text-sm font-medium">ID/Passport Number</Label>
            <Input
              id={`${idPrefix}-idNumber`}
              placeholder="National ID or Passport"
              value={values.idNumber ?? ''}
              onChange={(e) => onChange('idNumber', e.target.value)}
              disabled={disabled}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-gender`} className="text-sm font-medium">Gender</Label>
            <Select
              value={values.gender ?? ''}
              onValueChange={(v) => onChange('gender', v)}
              disabled={disabled}
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
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-nationality`} className="text-sm font-medium">Nationality</Label>
            <Select
              value={values.nationality ?? 'Kenyan'}
              onValueChange={(v) => onChange('nationality', v)}
              disabled={disabled}
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
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-dateOfBirth`} className="text-sm font-medium">Date of Birth</Label>
            <Input
              id={`${idPrefix}-dateOfBirth`}
              type="date"
              value={values.dateOfBirth ?? ''}
              onChange={(e) => onChange('dateOfBirth', e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-phoneNumber`} className="text-sm font-medium">Phone Number</Label>
            <Input
              id={`${idPrefix}-phoneNumber`}
              type="tel"
              placeholder="+254 7XX XXX XXX"
              value={values.phoneNumber ?? ''}
              onChange={(e) => onChange('phoneNumber', e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-email`} className="text-sm font-medium">Email</Label>
            <Input
              id={`${idPrefix}-email`}
              type="email"
              placeholder="driver@example.com"
              value={values.email ?? ''}
              onChange={(e) => onChange('email', e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={`${idPrefix}-address`} className="text-sm font-medium">Address</Label>
            <Input
              id={`${idPrefix}-address`}
              placeholder="Physical address"
              value={values.address ?? ''}
              onChange={(e) => onChange('address', e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-700 border-b pb-2">License Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-ntsaId`} className="text-sm font-medium">NTSA ID</Label>
            <Input
              id={`${idPrefix}-ntsaId`}
              placeholder="NTSA registration ID"
              value={values.ntsaId ?? ''}
              onChange={(e) => onChange('ntsaId', e.target.value)}
              disabled={disabled}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-drivingLicenseNo`} className="text-sm font-medium">License Number</Label>
            <Input
              id={`${idPrefix}-drivingLicenseNo`}
              placeholder="Driving license number"
              value={values.drivingLicenseNo ?? ''}
              onChange={(e) => onChange('drivingLicenseNo', e.target.value)}
              disabled={disabled}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-licenseClass`} className="text-sm font-medium">License Class</Label>
            <Select
              value={values.licenseClass ?? ''}
              onValueChange={(v) => onChange('licenseClass', v)}
              disabled={disabled}
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
          <div className="space-y-2">
            <Label className="text-sm font-medium">Professional Driver</Label>
            <div className="flex items-center gap-2 pt-2">
              <Switch
                checked={values.isProfessionalDriver ?? false}
                onCheckedChange={(checked) => onChange('isProfessionalDriver', checked)}
                disabled={disabled}
              />
              <span className="text-sm text-gray-600">
                {values.isProfessionalDriver ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-licenseIssueDate`} className="text-sm font-medium">Issue Date</Label>
            <Input
              id={`${idPrefix}-licenseIssueDate`}
              type="date"
              value={values.licenseIssueDate ?? ''}
              onChange={(e) => onChange('licenseIssueDate', e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-licenseExpiryDate`} className="text-sm font-medium">Expiry Date</Label>
            <Input
              id={`${idPrefix}-licenseExpiryDate`}
              type="date"
              value={values.licenseExpiryDate ?? ''}
              onChange={(e) => onChange('licenseExpiryDate', e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
