"use client";

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CreateTransporterRequest, Transporter } from '@/types/weighing';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { EntityModal, ModalMode } from './EntityModal';

interface TransporterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ModalMode;
  transporter?: Transporter | null;
  onSave: (data: CreateTransporterRequest) => Promise<void>;
  isSaving?: boolean;
}

/**
 * TransporterModal - Create/Edit/View transporter details
 *
 * Fields mapped from Backend Model: Models/Weighing/Transporter.cs
 */
export function TransporterModal({
  open,
  onOpenChange,
  mode,
  transporter,
  onSave,
  isSaving = false,
}: TransporterModalProps) {
  const isViewMode = mode === 'view';

  const { register, handleSubmit, reset, formState: { errors, isValid } } = useForm<CreateTransporterRequest>({
    defaultValues: {
      code: '',
      name: '',
      registrationNo: '',
      phone: '',
      email: '',
      address: '',
      ntacNo: '',
    },
  });

  useEffect(() => {
    if (transporter && (mode === 'edit' || mode === 'view')) {
      reset({
        code: transporter.code || '',
        name: transporter.name || '',
        registrationNo: transporter.registrationNo || '',
        phone: transporter.phone || '',
        email: transporter.email || '',
        address: transporter.address || '',
        ntacNo: transporter.ntacNo || '',
      });
    } else if (mode === 'create') {
      reset({
        code: '',
        name: '',
        registrationNo: '',
        phone: '',
        email: '',
        address: '',
        ntacNo: '',
      });
    }
  }, [transporter, mode, reset]);

  const onSubmit = async (data: CreateTransporterRequest) => {
    await onSave(data);
  };

  return (
    <EntityModal
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      title="Transporter"
      description={mode === 'create' ? 'Add a new transport company' : undefined}
      onSave={handleSubmit(onSubmit)}
      isSaving={isSaving}
      isValid={isValid}
      maxWidth="lg"
    >
      <form className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Code */}
          <div className="space-y-2">
            <Label htmlFor="code" className="text-sm font-medium">
              Code <span className="text-red-500">*</span>
            </Label>
            <Input
              id="code"
              placeholder="e.g., TRN001"
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
              Company Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Transport company name"
              {...register('name', { required: 'Company name is required' })}
              disabled={isViewMode}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Registration Number */}
          <div className="space-y-2">
            <Label htmlFor="registrationNo" className="text-sm font-medium">
              Business Registration No.
            </Label>
            <Input
              id="registrationNo"
              placeholder="Business registration number"
              {...register('registrationNo')}
              disabled={isViewMode}
              className="font-mono"
            />
          </div>

          {/* NTAC Number */}
          <div className="space-y-2">
            <Label htmlFor="ntacNo" className="text-sm font-medium">
              NTAC Number
            </Label>
            <Input
              id="ntacNo"
              placeholder="National Transport Authority Code"
              {...register('ntacNo')}
              disabled={isViewMode}
              className="font-mono"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+254 XXX XXX XXX"
              {...register('phone')}
              disabled={isViewMode}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="company@example.com"
              {...register('email')}
              disabled={isViewMode}
            />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="address" className="text-sm font-medium">Address</Label>
          <Textarea
            id="address"
            placeholder="Physical address"
            {...register('address')}
            disabled={isViewMode}
            rows={2}
          />
        </div>
      </form>
    </EntityModal>
  );
}
