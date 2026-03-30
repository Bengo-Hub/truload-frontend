'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CreateTransporterRequest } from '@/types/weighing';

export type TransporterFormValues = Partial<CreateTransporterRequest>;

export interface TransporterFormFieldsProps {
  values: TransporterFormValues;
  onChange: (field: keyof CreateTransporterRequest, value: string | undefined) => void;
  errors?: Partial<Record<keyof CreateTransporterRequest, string>>;
  disabled?: boolean;
  /** Required fields to show asterisk and validate. Default: code, name (for standalone); use ['name'] for escalate. */
  requiredFields?: (keyof CreateTransporterRequest)[];
  /** Prefix for input ids to avoid collisions when multiple instances exist. */
  idPrefix?: string;
}

const defaultRequired: (keyof CreateTransporterRequest)[] = ['code', 'name'];

export function TransporterFormFields({
  values,
  onChange,
  errors = {},
  disabled = false,
  requiredFields = defaultRequired,
  idPrefix = 'transporter-form',
}: TransporterFormFieldsProps) {
  const required = (k: keyof CreateTransporterRequest) => requiredFields.includes(k);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-name`} className="text-sm font-medium">
            Company Name {required('name') && <span className="text-red-500">*</span>}
          </Label>
          <Input
            id={`${idPrefix}-name`}
            placeholder="Transport company name"
            value={values.name ?? ''}
            onChange={(e) => {
              const newName = e.target.value;
              onChange('name', newName);
              // Auto-generate code if empty or looks like a default code
              if (newName.trim()) {
                const generatedCode = newName
                  .trim()
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, '')
                  .substring(0, 10);
                onChange('code', generatedCode);
              }
            }}
            disabled={disabled}
          />
          {errors.name && (
            <p className="text-xs text-red-500">{errors.name}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-code`} className="text-sm font-medium">
            Code {required('code') && <span className="text-red-500">*</span>}
          </Label>
          <Input
            id={`${idPrefix}-code`}
            placeholder="AUTO-GENERATED"
            value={values.code ?? ''}
            onChange={(e) => onChange('code', e.target.value)}
            disabled={true} // Always disabled as per request
            className="font-mono uppercase bg-gray-50"
          />
          {errors.code && (
            <p className="text-xs text-red-500">{errors.code}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-registrationNo`} className="text-sm font-medium">
            Business Registration No.
          </Label>
          <Input
            id={`${idPrefix}-registrationNo`}
            placeholder="Business registration number"
            value={values.registrationNo ?? ''}
            onChange={(e) => onChange('registrationNo', e.target.value)}
            disabled={disabled}
            className="font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-phone`} className="text-sm font-medium">Phone</Label>
          <Input
            id={`${idPrefix}-phone`}
            type="tel"
            placeholder="+254 XXX XXX XXX"
            value={values.phone ?? ''}
            onChange={(e) => onChange('phone', e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-email`} className="text-sm font-medium">Email</Label>
          <Input
            id={`${idPrefix}-email`}
            type="email"
            placeholder="company@example.com"
            value={values.email ?? ''}
            onChange={(e) => onChange('email', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-address`} className="text-sm font-medium">Address</Label>
        <Textarea
          id={`${idPrefix}-address`}
          placeholder="Physical address"
          value={values.address ?? ''}
          onChange={(e) => onChange('address', e.target.value)}
          disabled={disabled}
          rows={2}
        />
      </div>
    </div>
  );
}
