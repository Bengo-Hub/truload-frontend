'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHasPermission } from '@/hooks/useAuth';
import { Clock, Database, Download, FileText, Key, RefreshCcw, Save, Shield, Upload } from 'lucide-react';
import { useState } from 'react';
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
}

interface TwoFactorSettings {
  enabled: boolean;
  method: 'app' | 'sms';
}

interface ShiftSettingsForm {
  defaultShiftDuration: number;
  graceMinutes: number;
  overtimeThreshold: number;
  require2FA: boolean;
}

export default function SecurityPage() {
  const canEdit = useHasPermission(['system.view_config', 'system.manage_security'], 'any');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [backupId, setBackupId] = useState('');

  const passwordForm = useForm<PasswordPolicyForm>({
    defaultValues: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireDigit: true,
      requireSpecial: false,
      lockoutThreshold: 5,
      lockoutMinutes: 15,
    },
  });

  const shiftForm = useForm<ShiftSettingsForm>({
    defaultValues: {
      defaultShiftDuration: 8,
      graceMinutes: 15,
      overtimeThreshold: 40,
      require2FA: false,
    },
  });

  const handlePasswordPolicySave = async (data: PasswordPolicyForm) => {
    try {
      // TODO: Wire to backend API
      console.log('Password policy:', data);
      toast.success('Password policy updated successfully');
    } catch (error) {
      toast.error('Failed to update password policy');
    }
  };

  const handleEnable2FA = async () => {
    try {
      // TODO: Wire to backend 2FA setup API
      toast.success('2FA setup initiated. Check your authenticator app.');
      setTwoFactorEnabled(true);
    } catch (error) {
      toast.error('Failed to enable 2FA');
    }
  };

  const handleDisable2FA = async () => {
    try {
      // TODO: Wire to backend 2FA disable API
      toast.success('2FA disabled');
      setTwoFactorEnabled(false);
    } catch (error) {
      toast.error('Failed to disable 2FA');
    }
  };

  const handleTriggerBackup = async () => {
    try {
      // TODO: Wire to backend backup API
      toast.success('Database backup initiated');
    } catch (error) {
      toast.error('Failed to trigger backup');
    }
  };

  const handleRestoreBackup = async () => {
    if (!backupId) {
      toast.error('Please enter a backup ID');
      return;
    }
    try {
      // TODO: Wire to backend restore API
      toast.success(`Restore initiated for backup: ${backupId}`);
    } catch (error) {
      toast.error('Failed to restore backup');
    }
  };

  const handleShiftSettingsSave = async (data: ShiftSettingsForm) => {
    try {
      // TODO: Wire to backend shift settings API
      console.log('Shift settings:', data);
      toast.success('Shift settings updated successfully');
    } catch (error) {
      toast.error('Failed to update shift settings');
    }
  };

  return (
    <AppShell title="Security" subtitle="Manage security settings, policies, and system backups">
      <ProtectedRoute requiredPermissions={["system.view_config"]}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Security & System Configuration</h2>
              <p className="text-sm text-gray-500">Configure password policies, 2FA, backups, and shift settings</p>
            </div>
            <Button variant="outline" size="icon">
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>

          <Tabs defaultValue="password" className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
              <TabsTrigger value="password" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                <span className="hidden sm:inline">Password Policy</span>
                <span className="sm:hidden">Password</span>
              </TabsTrigger>
              <TabsTrigger value="2fa" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Two-Factor Auth</span>
                <span className="sm:hidden">2FA</span>
              </TabsTrigger>
              <TabsTrigger value="backup" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline">Backup & Restore</span>
                <span className="sm:hidden">Backup</span>
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Audit Logs</span>
                <span className="sm:hidden">Logs</span>
              </TabsTrigger>
              <TabsTrigger value="shifts" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Shift Settings</span>
                <span className="sm:hidden">Shifts</span>
              </TabsTrigger>
            </TabsList>

            {/* Password Policy Tab */}
            <TabsContent value="password" className="space-y-4">
              <Card className="p-6">
                <form onSubmit={passwordForm.handleSubmit(handlePasswordPolicySave)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="minLength">Minimum Length</Label>
                      <Input
                        id="minLength"
                        type="number"
                        min={6}
                        {...passwordForm.register('minLength', { valueAsNumber: true })}
                        disabled={!canEdit}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lockoutThreshold">Lockout Threshold</Label>
                      <Input
                        id="lockoutThreshold"
                        type="number"
                        min={0}
                        {...passwordForm.register('lockoutThreshold', { valueAsNumber: true })}
                        disabled={!canEdit}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lockoutMinutes">Lockout Duration (minutes)</Label>
                      <Input
                        id="lockoutMinutes"
                        type="number"
                        min={0}
                        {...passwordForm.register('lockoutMinutes', { valueAsNumber: true })}
                        disabled={!canEdit}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>Complexity Requirements</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { field: 'requireUppercase', label: 'Require Uppercase (A-Z)' },
                        { field: 'requireLowercase', label: 'Require Lowercase (a-z)' },
                        { field: 'requireDigit', label: 'Require Digits (0-9)' },
                        { field: 'requireSpecial', label: 'Require Special Characters' },
                      ].map(({ field, label }) => (
                        <div key={field} className="flex items-center space-x-2">
                          <Controller
                            name={field as any}
                            control={passwordForm.control}
                            render={({ field: { value, onChange } }) => (
                              <input
                                type="checkbox"
                                checked={value}
                                onChange={(e) => onChange(e.target.checked)}
                                disabled={!canEdit}
                                className="h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                              />
                            )}
                          />
                          <label className="text-sm text-gray-700">{label}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={!canEdit}>
                      <Save className="mr-2 h-4 w-4" />
                      Save Policy
                    </Button>
                  </div>
                </form>
              </Card>
            </TabsContent>

            {/* Two-Factor Authentication Tab */}
            <TabsContent value="2fa" className="space-y-4">
              <Card className="p-6">
                <div className="space-y-6">
                  <div className={`p-4 rounded-lg border ${twoFactorEnabled ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className={`font-semibold mb-1 ${twoFactorEnabled ? 'text-green-800' : 'text-amber-800'}`}>
                          {twoFactorEnabled ? '2FA is Active' : '2FA is Not Enabled'}
                        </h3>
                        <p className={`text-sm ${twoFactorEnabled ? 'text-green-700' : 'text-amber-700'}`}>
                          {twoFactorEnabled
                            ? 'Your account is protected with two-factor authentication.'
                            : 'Enable two-factor authentication to enhance your account security.'}
                        </p>
                      </div>
                      <Button
                        onClick={twoFactorEnabled ? handleDisable2FA : handleEnable2FA}
                        variant={twoFactorEnabled ? 'destructive' : 'default'}
                        size="sm"
                        disabled={!canEdit}
                      >
                        {twoFactorEnabled ? 'Disable' : 'Enable 2FA'}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm text-gray-700">
                    <p className="font-medium">How it works:</p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600">•</span>
                        Download an authenticator app (Google Authenticator, Authy, Microsoft Authenticator)
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600">•</span>
                        Scan the QR code provided during setup
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600">•</span>
                        Save backup codes in a secure location
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600">•</span>
                        Enter a code from your app each time you login
                      </li>
                    </ul>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Backup & Restore Tab */}
            <TabsContent value="backup" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Download className="h-5 w-5 text-emerald-600" />
                      <h3 className="text-lg font-semibold">Create Backup</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Create a full database backup including all weighing data, users, and configurations.
                    </p>
                    <Button onClick={handleTriggerBackup} disabled={!canEdit} className="w-full">
                      <Database className="mr-2 h-4 w-4" />
                      Trigger Backup
                    </Button>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Upload className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold">Restore from Backup</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Restore database from a previous backup. This will replace all current data.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="backupId">Backup ID</Label>
                      <Input
                        id="backupId"
                        placeholder="Enter backup ID"
                        value={backupId}
                        onChange={(e) => setBackupId(e.target.value)}
                        disabled={!canEdit}
                      />
                    </div>
                    <Button onClick={handleRestoreBackup} variant="destructive" disabled={!canEdit} className="w-full">
                      <Upload className="mr-2 h-4 w-4" />
                      Restore Backup
                    </Button>
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* Audit Logs Tab */}
            <TabsContent value="audit" className="space-y-4">
              <Card>
                <div className="p-6 border-b">
                  <h3 className="text-lg font-semibold">System Audit Logs</h3>
                  <p className="text-sm text-gray-500">View recent system activities and user actions</p>
                </div>
                <div className="p-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-sm text-gray-500" colSpan={5}>
                          No audit logs found. Wire to backend audit logs API.
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            {/* Shift Settings Tab */}
            <TabsContent value="shifts" className="space-y-4">
              <Card className="p-6">
                <form onSubmit={shiftForm.handleSubmit(handleShiftSettingsSave)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="defaultShiftDuration">Default Shift Duration (hours)</Label>
                      <Input
                        id="defaultShiftDuration"
                        type="number"
                        min={1}
                        {...shiftForm.register('defaultShiftDuration', { valueAsNumber: true })}
                        disabled={!canEdit}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="graceMinutes">Grace Period (minutes)</Label>
                      <Input
                        id="graceMinutes"
                        type="number"
                        min={0}
                        {...shiftForm.register('graceMinutes', { valueAsNumber: true })}
                        disabled={!canEdit}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="overtimeThreshold">Overtime Threshold (hours/week)</Label>
                      <Input
                        id="overtimeThreshold"
                        type="number"
                        min={0}
                        {...shiftForm.register('overtimeThreshold', { valueAsNumber: true })}
                        disabled={!canEdit}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>Security Settings</Label>
                    <div className="flex items-center space-x-2">
                      <Controller
                        name="require2FA"
                        control={shiftForm.control}
                        render={({ field: { value, onChange } }) => (
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => onChange(e.target.checked)}
                            disabled={!canEdit}
                            className="h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                          />
                        )}
                      />
                      <label className="text-sm text-gray-700">
                        Require 2FA for shift clock-in (following ERP pattern)
                      </label>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                    <p className="font-medium mb-1">Shift Settings Scope</p>
                    <p>
                      These settings apply globally to all shifts. Individual shift configurations can override grace periods
                      and 2FA requirements in the Shift Management module.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={!canEdit}>
                      <Save className="mr-2 h-4 w-4" />
                      Save Settings
                    </Button>
                  </div>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ProtectedRoute>
    </AppShell>
  );
}
