'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UpdateUserRequest } from '@/types/setup';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

interface UserFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<UpdateUserRequest & { id: string; email: string }>;
  onSubmit: (data: any) => Promise<void>;
  onCancel?: () => void;
  organizations?: Array<{ id: string; name: string }>;
  stations?: Array<{ id: string; name: string }>;
  departments?: Array<{ id: string; name: string }>;
}

export function UserForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  organizations = [],
  stations = [],
  departments = [],
}: UserFormProps) {
  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      email: initialData?.email || '',
      fullName: initialData?.fullName || '',
      phoneNumber: initialData?.phoneNumber || '',
      organizationId: initialData?.organizationId || '',
      stationId: initialData?.stationId || '',
      departmentId: initialData?.departmentId || '',
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        email: initialData.email || '',
        fullName: initialData.fullName || '',
        phoneNumber: initialData.phoneNumber || '',
        organizationId: initialData.organizationId || '',
        stationId: initialData.stationId || '',
        departmentId: initialData.departmentId || '',
        password: '',
        confirmPassword: '',
      });
    }
  }, [initialData, reset]);

  const handleFormSubmit = async (data: any) => {
    if (mode === 'create' && data.password !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      // Remove confirmPassword before submission
      const { confirmPassword, ...submitData } = data;
      
      // For edit mode, remove password if empty
      if (mode === 'edit' && !submitData.password) {
        delete submitData.password;
        delete submitData.email; // Email can't be changed
      }

      await onSubmit(submitData);
      toast.success(mode === 'create' ? 'User created successfully' : 'User updated successfully');
      
      if (mode === 'create') {
        reset();
      }
    } catch (error) {
      toast.error(`Failed to ${mode} user`);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Email (disabled in edit mode) */}
        <div className="space-y-2">
          <Label htmlFor="email" className="required">Email</Label>
          <Input
            id="email"
            type="email"
            {...register('email', { required: 'Email is required' })}
            disabled={mode === 'edit'}
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message as string}</p>
          )}
        </div>

        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="fullName" className="required">Full Name</Label>
          <Input
            id="fullName"
            {...register('fullName', { required: 'Full name is required' })}
            className={errors.fullName ? 'border-red-500' : ''}
          />
          {errors.fullName && (
            <p className="text-sm text-red-500">{errors.fullName.message as string}</p>
          )}
        </div>

        {/* Phone Number */}
        <div className="space-y-2">
          <Label htmlFor="phoneNumber">Phone Number</Label>
          <Input
            id="phoneNumber"
            type="tel"
            {...register('phoneNumber')}
          />
        </div>

        {/* Organization */}
        <div className="space-y-2">
          <Label htmlFor="organizationId">Organization</Label>
          <Controller
            name="organizationId"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Station */}
        <div className="space-y-2">
          <Label htmlFor="stationId">Station</Label>
          <Controller
            name="stationId"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent>
                  {stations.map((station) => (
                    <SelectItem key={station.id} value={station.id}>
                      {station.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Department */}
        <div className="space-y-2">
          <Label htmlFor="departmentId">Department</Label>
          <Controller
            name="departmentId"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {/* Password fields (create mode only, or optional in edit mode) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="password" className={mode === 'create' ? 'required' : ''}>
            {mode === 'create' ? 'Password' : 'New Password (optional)'}
          </Label>
          <Input
            id="password"
            type="password"
            {...register('password', {
              required: mode === 'create' ? 'Password is required' : false,
              minLength: { value: 8, message: 'Password must be at least 8 characters' },
            })}
            className={errors.password ? 'border-red-500' : ''}
          />
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message as string}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className={mode === 'create' ? 'required' : ''}>
            Confirm Password
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            {...register('confirmPassword', {
              required: mode === 'create' ? 'Please confirm password' : false,
            })}
            className={errors.confirmPassword ? 'border-red-500' : ''}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-red-500">{errors.confirmPassword.message as string}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create User' : 'Update User'}
        </Button>
      </div>
    </form>
  );
}
