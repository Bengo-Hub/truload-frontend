"use client";

import { CreateDriverRequest, Driver } from '@/types/weighing';
import { format } from 'date-fns';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { DriverFormFields, TransporterOption } from './DriverFormFields';
import { EntityModal, ModalMode } from './EntityModal';
import { Label } from '@/components/ui/label';

interface DriverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ModalMode;
  driver?: Driver | null;
  onSave: (data: CreateDriverRequest) => Promise<void>;
  isSaving?: boolean;
  /** Optional list of transporters to show the employer selector */
  transporters?: TransporterOption[];
  /** Pre-select a transporter when opening in create mode */
  defaultTransporterId?: string;
}

/**
 * DriverModal - Create/Edit/View driver details
 *
 * Uses shared DriverFormFields. Fields mapped from Backend Model: Models/Weighing/Driver.cs
 */
export function DriverModal({
  open,
  onOpenChange,
  mode,
  driver,
  onSave,
  isSaving = false,
  transporters,
  defaultTransporterId,
}: DriverModalProps) {
  const isViewMode = mode === 'view';

  const { handleSubmit, reset, watch, setValue, setError, formState: { errors } } = useForm<CreateDriverRequest>({
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
      transporterId: defaultTransporterId,
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

  const formValues = watch();
  const isValid = !!formValues.fullNames?.trim() && !!formValues.surname?.trim();

  const onSubmit = async (data: CreateDriverRequest) => {
    if (!data.fullNames?.trim()) {
      setError('fullNames', { message: 'Full names are required' });
      return;
    }
    if (!data.surname?.trim()) {
      setError('surname', { message: 'Surname is required' });
      return;
    }
    await onSave(data);
  };

  const errorMap: Partial<Record<keyof CreateDriverRequest, string>> = {};
  if (errors.fullNames?.message) errorMap.fullNames = String(errors.fullNames.message);
  if (errors.surname?.message) errorMap.surname = String(errors.surname.message);

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
        <DriverFormFields
          idPrefix="driver-modal"
          values={formValues}
          onChange={(field, value) => setValue(field, value as never)}
          errors={errorMap}
          disabled={isViewMode}
          requiredFields={['fullNames', 'surname']}
          transporters={transporters}
        />
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
