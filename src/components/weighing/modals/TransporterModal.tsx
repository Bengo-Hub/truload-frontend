"use client";

import { CreateTransporterRequest, Transporter } from '@/types/weighing';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { EntityModal, ModalMode } from './EntityModal';
import { TransporterFormFields } from './TransporterFormFields';

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
 * Uses shared TransporterFormFields. Fields mapped from Backend Model: Models/Weighing/Transporter.cs
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

  const { handleSubmit, reset, watch, setValue, setError, formState: { errors } } = useForm<CreateTransporterRequest>({
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
  const formValues = watch();
  const isValid = !!formValues.code?.trim() && !!formValues.name?.trim();

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
    if (!data.code?.trim()) {
      setError('code', { message: 'Code is required' });
      return;
    }
    if (!data.name?.trim()) {
      setError('name', { message: 'Company name is required' });
      return;
    }
    await onSave(data);
  };

  const errorMap: Partial<Record<keyof CreateTransporterRequest, string>> = {};
  if (errors.code?.message) errorMap.code = String(errors.code.message);
  if (errors.name?.message) errorMap.name = String(errors.name.message);

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
        <TransporterFormFields
          idPrefix="transporter-modal"
          values={formValues}
          onChange={(field, value) => setValue(field, value)}
          errors={errorMap}
          disabled={isViewMode}
          requiredFields={['code', 'name']}
        />
      </form>
    </EntityModal>
  );
}
