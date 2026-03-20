'use client';

/**
 * Platform Security & Policy page.
 * Password policy, shift settings, and 2FA enforcement.
 * Moved from tenant [orgSlug]/setup/security to platform admin.
 */

import { PlatformShell } from '@/components/layout/PlatformShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  usePasswordPolicy,
  useShiftSettings,
  useUpdatePasswordPolicy,
  useUpdateShiftSettings,
} from '@/hooks/queries';
import { Clock, Key, Loader2, Save, Shield } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

interface PasswordPolicyForm {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigit: boolean;
  requireSpecial: boolean;
  lockoutThreshold: number;
  lockoutMinutes: number;
  passwordExpiryDays: number;
}

interface ShiftSettingsForm {
  defaultShiftDuration: number;
  graceMinutes: number;
  enforceShiftOnLogin: boolean;
  bypassShiftCheck: boolean;
  excludedRoles: string;
  require2FA: boolean;
}

export default function PlatformSecurityPage() {
  return (
    <PlatformShell title="Security & Policy" subtitle="Password policy, shift settings, and access controls">
      <Tabs defaultValue="password" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="password" className="gap-2"><Key className="h-4 w-4" />Password Policy</TabsTrigger>
          <TabsTrigger value="shifts" className="gap-2"><Clock className="h-4 w-4" />Shift Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="password" className="mt-6"><PasswordPolicyTab /></TabsContent>
        <TabsContent value="shifts" className="mt-6"><ShiftSettingsTab /></TabsContent>
      </Tabs>
    </PlatformShell>
  );
}

function PasswordPolicyTab() {
  const { data: policy, isLoading } = usePasswordPolicy();
  const updateMutation = useUpdatePasswordPolicy();
  const { register, control, handleSubmit, reset, formState: { isDirty } } = useForm<PasswordPolicyForm>();

  useEffect(() => {
    if (policy) reset({
      minLength: policy.minLength,
      requireUppercase: policy.requireUppercase,
      requireLowercase: policy.requireLowercase,
      requireDigit: policy.requireDigit,
      requireSpecial: policy.requireSpecial,
      lockoutThreshold: policy.lockoutThreshold,
      lockoutMinutes: policy.lockoutMinutes,
      passwordExpiryDays: policy.passwordExpiryDays,
    });
  }, [policy, reset]);

  const onSubmit = async (data: PasswordPolicyForm) => {
    try {
      await updateMutation.mutateAsync(data);
      toast.success('Password policy updated');
    } catch { toast.error('Failed to update password policy'); }
  };

  if (isLoading) return <Card className="p-8 text-center text-gray-500">Loading password policy...</Card>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Shield className="h-5 w-5" />Password Requirements</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Minimum Length</Label><Input type="number" {...register('minLength', { valueAsNumber: true })} min={6} max={128} /></div>
            <div><Label>Password Expiry (days, 0 = never)</Label><Input type="number" {...register('passwordExpiryDays', { valueAsNumber: true })} min={0} max={365} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border p-3"><Label>Require uppercase</Label><Controller name="requireUppercase" control={control} render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} /></div>
            <div className="flex items-center justify-between rounded-lg border p-3"><Label>Require lowercase</Label><Controller name="requireLowercase" control={control} render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} /></div>
            <div className="flex items-center justify-between rounded-lg border p-3"><Label>Require digit</Label><Controller name="requireDigit" control={control} render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} /></div>
            <div className="flex items-center justify-between rounded-lg border p-3"><Label>Require special character</Label><Controller name="requireSpecial" control={control} render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Account Lockout</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div><Label>Failed attempts before lockout</Label><Input type="number" {...register('lockoutThreshold', { valueAsNumber: true })} min={1} max={50} /></div>
          <div><Label>Lockout duration (minutes)</Label><Input type="number" {...register('lockoutMinutes', { valueAsNumber: true })} min={1} max={1440} /></div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={!isDirty || updateMutation.isPending}>
          {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Policy
        </Button>
      </div>
    </form>
  );
}

function ShiftSettingsTab() {
  const { data: settings, isLoading } = useShiftSettings();
  const updateMutation = useUpdateShiftSettings();
  const { register, control, handleSubmit, reset, formState: { isDirty } } = useForm<ShiftSettingsForm>();

  useEffect(() => {
    if (settings) reset({
      defaultShiftDuration: settings.defaultShiftDuration,
      graceMinutes: settings.graceMinutes,
      enforceShiftOnLogin: settings.enforceShiftOnLogin,
      bypassShiftCheck: settings.bypassShiftCheck,
      excludedRoles: settings.excludedRoles ?? '',
      require2FA: settings.require2FA,
    });
  }, [settings, reset]);

  const onSubmit = async (data: ShiftSettingsForm) => {
    try {
      await updateMutation.mutateAsync(data);
      toast.success('Shift settings updated');
    } catch { toast.error('Failed to update shift settings'); }
  };

  if (isLoading) return <Card className="p-8 text-center text-gray-500">Loading shift settings...</Card>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Shift Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Default shift duration (hours)</Label><Input type="number" {...register('defaultShiftDuration', { valueAsNumber: true })} min={1} max={24} /></div>
            <div><Label>Grace period (minutes)</Label><Input type="number" {...register('graceMinutes', { valueAsNumber: true })} min={0} max={120} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border p-3"><Label>Enforce shift on login</Label><Controller name="enforceShiftOnLogin" control={control} render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} /></div>
            <div className="flex items-center justify-between rounded-lg border p-3"><Label>Bypass shift check</Label><Controller name="bypassShiftCheck" control={control} render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} /></div>
            <div className="flex items-center justify-between rounded-lg border p-3"><Label>Require 2FA for shift</Label><Controller name="require2FA" control={control} render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} /></div>
          </div>
          <div><Label>Excluded roles (comma-separated)</Label><Input {...register('excludedRoles')} placeholder="e.g. SUPERUSER,MIDDLEWARE_SERVICE" /></div>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button type="submit" disabled={!isDirty || updateMutation.isPending}>
          {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Settings
        </Button>
      </div>
    </form>
  );
}
