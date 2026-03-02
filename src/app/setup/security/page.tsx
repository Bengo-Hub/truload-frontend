'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    use2FAStatus,
    useAuditLogs,
    useAuditLogSummary,
    useBackupList,
    useBackupStatus,
    useCreateBackup,
    useDeleteBackup,
    useDisable2FA,
    useDownloadBackup,
    useEnable2FA,
    useGenerate2FASetup,
    usePasswordPolicy,
    useRestoreBackup,
    useShiftSettings,
    useUpdatePasswordPolicy,
    useUpdateShiftSettings,
} from '@/hooks/queries';
import { useHasPermission } from '@/hooks/useAuth';
import { formatFileSize } from '@/lib/api/backup';
import { fetchRoles } from '@/lib/api/setup';
import type { RoleDto } from '@/types/setup';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Clock, Database, Download, FileText, Info, Key, Loader2, RefreshCcw, Save, Shield, ShieldAlert, Trash2, Upload, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
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

interface ShiftSettingsForm {
  defaultShiftDuration: number;
  graceMinutes: number;
  enforceShiftOnLogin: boolean;
  bypassShiftCheck: boolean;
  excludedRoles: string;
  require2FA: boolean;
}

export default function SecurityPage() {
  const canEdit = useHasPermission('system.security_policy');
  const [backupFileName, setBackupFileName] = useState('');
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');

  // Roles list for shift settings excluded roles
  const { data: allRoles } = useQuery({
    queryKey: ['roles-all'],
    queryFn: () => fetchRoles(false),
  });

  // Audit log state
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize] = useState(10);
  const [auditFilter, setAuditFilter] = useState<string>('all');

  // Fetch audit logs with pagination
  const { data: auditLogs, isLoading: isLoadingAuditLogs, refetch: refetchAuditLogs } = useAuditLogs({
    pageNumber: auditPage,
    pageSize: auditPageSize,
    action: auditFilter === 'all' ? undefined : auditFilter,
  });

  // Fetch audit summary for stats
  const { data: auditSummary } = useAuditLogSummary();

  // Settings queries
  const { data: passwordPolicy, isLoading: _isLoadingPasswordPolicy } = usePasswordPolicy();
  const { data: shiftSettings, isLoading: _isLoadingShiftSettings } = useShiftSettings();

  // 2FA queries
  const { data: twoFactorStatus, isLoading: isLoading2FA } = use2FAStatus();

  // Backup queries
  const { data: backupStatus } = useBackupStatus();
  const { data: backupList, refetch: refetchBackups } = useBackupList();

  // Mutations
  const updatePasswordPolicyMutation = useUpdatePasswordPolicy();
  const updateShiftSettingsMutation = useUpdateShiftSettings();
  const generate2FASetupMutation = useGenerate2FASetup();
  const enable2FAMutation = useEnable2FA();
  const disable2FAMutation = useDisable2FA();
  const createBackupMutation = useCreateBackup();
  const deleteBackupMutation = useDeleteBackup();
  const downloadBackupMutation = useDownloadBackup();
  const restoreBackupMutation = useRestoreBackup();

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
      enforceShiftOnLogin: false,
      bypassShiftCheck: false,
      excludedRoles: '',
      require2FA: false,
    },
  });

  // Sync form values with fetched data
  useEffect(() => {
    if (passwordPolicy) {
      passwordForm.reset(passwordPolicy);
    }
  }, [passwordPolicy, passwordForm]);

  useEffect(() => {
    if (shiftSettings) {
      shiftForm.reset(shiftSettings);
    }
  }, [shiftSettings, shiftForm]);

  const handlePasswordPolicySave = async (data: PasswordPolicyForm) => {
    try {
      await updatePasswordPolicyMutation.mutateAsync(data);
      toast.success('Password policy updated successfully');
    } catch {
      toast.error('Failed to update password policy');
    }
  };

  const handleStart2FASetup = async () => {
    try {
      await generate2FASetupMutation.mutateAsync();
      setShow2FASetup(true);
    } catch {
      toast.error('Failed to generate 2FA setup');
    }
  };

  const handleEnable2FA = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      toast.error('Please enter a valid 6-digit verification code');
      return;
    }
    try {
      const result = await enable2FAMutation.mutateAsync({ verificationCode });
      if (result.success) {
        toast.success('2FA enabled successfully! Save your recovery codes.');
        setShow2FASetup(false);
        setVerificationCode('');
      } else {
        toast.error('Invalid verification code. Please try again.');
      }
    } catch {
      toast.error('Failed to enable 2FA');
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword) {
      toast.error('Please enter your password');
      return;
    }
    try {
      await disable2FAMutation.mutateAsync({ password: disablePassword });
      toast.success('2FA disabled successfully');
      setDisablePassword('');
    } catch {
      toast.error('Failed to disable 2FA. Check your password.');
    }
  };

  const handleTriggerBackup = async () => {
    try {
      const result = await createBackupMutation.mutateAsync({ backupType: 'Full' });
      if (result.success) {
        toast.success(`Backup created: ${result.fileName}`);
        refetchBackups();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error('Failed to create backup');
    }
  };

  const handleRestoreBackup = async () => {
    if (!backupFileName) {
      toast.error('Please select a backup to restore');
      return;
    }
    try {
      const result = await restoreBackupMutation.mutateAsync({ fileName: backupFileName });
      if (result.success) {
        toast.success('Database restored successfully');
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error('Failed to restore backup');
    }
  };

  const handleDeleteBackup = async (fileName: string) => {
    try {
      await deleteBackupMutation.mutateAsync(fileName);
      toast.success('Backup deleted');
      refetchBackups();
    } catch {
      toast.error('Failed to delete backup');
    }
  };

  const handleDownloadBackup = async (fileName: string) => {
    try {
      await downloadBackupMutation.mutateAsync(fileName);
      toast.success('Download started');
    } catch {
      toast.error('Failed to download backup');
    }
  };

  const handleShiftSettingsSave = async (data: ShiftSettingsForm) => {
    try {
      await updateShiftSettingsMutation.mutateAsync(data);
      toast.success('Shift settings updated successfully');
    } catch {
      toast.error('Failed to update shift settings');
    }
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
      <ProtectedRoute requiredPermissions={["system.security_policy"]}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Security & System Configuration</h2>
              <p className="text-sm text-gray-500">Configure password policies, 2FA, backups, and shift settings</p>
            </div>
            <Button variant="outline" size="icon" onClick={() => refetchAuditLogs()}>
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
                            name={field as keyof PasswordPolicyForm}
                            control={passwordForm.control}
                            render={({ field: { value, onChange } }) => (
                              <input
                                type="checkbox"
                                checked={Boolean(value)}
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
                  {isLoading2FA ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <>
                      <div className={`p-4 rounded-lg border ${twoFactorStatus?.isEnabled ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className={`font-semibold mb-1 ${twoFactorStatus?.isEnabled ? 'text-green-800' : 'text-amber-800'}`}>
                              {twoFactorStatus?.isEnabled ? '2FA is Active' : '2FA is Not Enabled'}
                            </h3>
                            <p className={`text-sm ${twoFactorStatus?.isEnabled ? 'text-green-700' : 'text-amber-700'}`}>
                              {twoFactorStatus?.isEnabled
                                ? `Your account is protected. ${twoFactorStatus.recoveryCodesRemaining} recovery codes remaining.`
                                : 'Enable two-factor authentication to enhance your account security.'}
                            </p>
                          </div>
                          {!twoFactorStatus?.isEnabled && !show2FASetup && (
                            <Button
                              onClick={handleStart2FASetup}
                              size="sm"
                              disabled={!canEdit || generate2FASetupMutation.isPending}
                            >
                              {generate2FASetupMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                              Enable 2FA
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* 2FA Setup Flow */}
                      {show2FASetup && generate2FASetupMutation.data && (
                        <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                          <h4 className="font-semibold">Set up your authenticator app</h4>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600 mb-2">Scan this QR code with your authenticator app:</p>
                              <img
                                src={generate2FASetupMutation.data.qrCodeDataUrl}
                                alt="QR Code"
                                className="w-48 h-48 border rounded"
                              />
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 mb-2">Or enter this key manually:</p>
                              <code className="block p-2 bg-white border rounded text-sm font-mono break-all">
                                {generate2FASetupMutation.data.sharedKey}
                              </code>
                              <div className="mt-4 space-y-2">
                                <Label htmlFor="verificationCode">Verification Code</Label>
                                <Input
                                  id="verificationCode"
                                  placeholder="Enter 6-digit code"
                                  value={verificationCode}
                                  onChange={(e) => setVerificationCode(e.target.value)}
                                  maxLength={7}
                                />
                                <div className="flex gap-2">
                                  <Button
                                    onClick={handleEnable2FA}
                                    disabled={enable2FAMutation.isPending}
                                  >
                                    {enable2FAMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Verify & Enable
                                  </Button>
                                  <Button variant="outline" onClick={() => setShow2FASetup(false)}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Disable 2FA */}
                      {twoFactorStatus?.isEnabled && (
                        <div className="space-y-4 p-4 border rounded-lg">
                          <h4 className="font-semibold text-red-600">Disable Two-Factor Authentication</h4>
                          <p className="text-sm text-gray-600">Enter your password to disable 2FA:</p>
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <Input
                                type="password"
                                placeholder="Your password"
                                value={disablePassword}
                                onChange={(e) => setDisablePassword(e.target.value)}
                              />
                            </div>
                            <Button
                              variant="destructive"
                              onClick={handleDisable2FA}
                              disabled={disable2FAMutation.isPending || !disablePassword}
                            >
                              {disable2FAMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                              Disable 2FA
                            </Button>
                          </div>
                        </div>
                      )}

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
                    </>
                  )}
                </div>
              </Card>
            </TabsContent>

            {/* Backup & Restore Tab */}
            <TabsContent value="backup" className="space-y-4">
              {/* Backup Status Cards */}
              {backupStatus && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-500">Total Backups</p>
                        <p className="text-xl font-semibold">{backupStatus.totalBackupsCount}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-500">Storage Used</p>
                        <p className="text-xl font-semibold">{formatFileSize(backupStatus.totalStorageUsedBytes)}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-amber-600" />
                      <div>
                        <p className="text-sm text-gray-500">Retention</p>
                        <p className="text-xl font-semibold">{backupStatus.retentionDays} days</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2">
                      {backupStatus.isEnabled ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <p className="text-sm text-gray-500">Auto Backup</p>
                        <p className="text-xl font-semibold">{backupStatus.isEnabled ? 'Enabled' : 'Disabled'}</p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Create Backup */}
                <Card className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Download className="h-5 w-5 text-emerald-600" />
                      <h3 className="text-lg font-semibold">Create Backup</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Create a full database backup including all weighing data, users, and configurations.
                    </p>
                    <Button
                      onClick={handleTriggerBackup}
                      disabled={!canEdit || createBackupMutation.isPending}
                      className="w-full"
                    >
                      {createBackupMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Database className="mr-2 h-4 w-4" />
                      )}
                      Create Backup
                    </Button>
                  </div>
                </Card>

                {/* Restore from Backup */}
                <Card className="p-6 lg:col-span-2">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Upload className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold">Restore from Backup</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Restore database from a previous backup. This will replace all current data.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="backupFileName">Select Backup</Label>
                      <Select value={backupFileName} onValueChange={setBackupFileName}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a backup file" />
                        </SelectTrigger>
                        <SelectContent>
                          {backupList?.backups.map((backup) => (
                            <SelectItem key={backup.fileName} value={backup.fileName}>
                              {backup.fileName} ({formatFileSize(backup.fileSizeBytes)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleRestoreBackup}
                      variant="destructive"
                      disabled={!canEdit || !backupFileName || restoreBackupMutation.isPending}
                      className="w-full"
                    >
                      {restoreBackupMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      Restore Backup
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Backup List */}
              <Card>
                <div className="p-6 border-b flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Available Backups</h3>
                    <p className="text-sm text-gray-500">Download or delete existing backup files</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetchBackups()}>
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backupList?.backups && backupList.backups.length > 0 ? (
                        backupList.backups.map((backup) => (
                          <TableRow key={backup.fileName}>
                            <TableCell className="font-mono text-sm">{backup.fileName}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{backup.backupType}</Badge>
                            </TableCell>
                            <TableCell>{formatFileSize(backup.fileSizeBytes)}</TableCell>
                            <TableCell>{formatTimestamp(backup.createdAt)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadBackup(backup.fileName)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteBackup(backup.fileName)}
                                  disabled={!canEdit}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            No backups available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            {/* Audit Logs Tab */}
            <TabsContent value="audit" className="space-y-4">
              {/* Summary Cards */}
              {auditSummary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-500">Total Entries</p>
                        <p className="text-xl font-semibold">{auditSummary.totalEntries.toLocaleString()}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-500">Successful</p>
                        <p className="text-xl font-semibold">{auditSummary.successfulEntries.toLocaleString()}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="text-sm text-gray-500">Failed</p>
                        <p className="text-xl font-semibold">{auditSummary.failedEntries.toLocaleString()}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                      <div>
                        <p className="text-sm text-gray-500">Success Rate</p>
                        <p className="text-xl font-semibold">{auditSummary.successRate.toFixed(1)}%</p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              <Card>
                <div className="p-6 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">System Audit Logs</h3>
                    <p className="text-sm text-gray-500">View recent system activities and user actions</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={auditFilter} onValueChange={setAuditFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Actions</SelectItem>
                        <SelectItem value="CREATE">Create</SelectItem>
                        <SelectItem value="READ">Read</SelectItem>
                        <SelectItem value="UPDATE">Update</SelectItem>
                        <SelectItem value="DELETE">Delete</SelectItem>
                        <SelectItem value="LOGIN">Login</SelectItem>
                        <SelectItem value="LOGOUT">Logout</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden lg:table-cell">IP Address</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingAuditLogs ? (
                        // Loading skeleton
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                            <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                          </TableRow>
                        ))
                      ) : auditLogs?.items && auditLogs.items.length > 0 ? (
                        auditLogs.items.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-sm whitespace-nowrap">
                              {formatTimestamp(log.createdAt)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {log.userFullName || log.userEmail || log.userName || 'System'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-xs">
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              <span className="font-medium">{log.resourceType}</span>
                              {log.resourceName && (
                                <span className="text-gray-500 ml-1">({log.resourceName})</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {log.success ? (
                                <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Success
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Failed
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm text-gray-500 font-mono">
                              {log.ipAddress || '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell className="text-sm text-gray-500 text-center py-8" colSpan={6}>
                            No audit logs found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {/* Pagination */}
                {auditLogs && auditLogs.totalPages > 1 && (
                  <div className="p-4 border-t flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      Page {auditLogs.pageNumber} of {auditLogs.totalPages} ({auditLogs.totalCount} total)
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                        disabled={auditPage <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAuditPage(p => Math.min(auditLogs.totalPages, p + 1))}
                        disabled={auditPage >= auditLogs.totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Shift Settings Tab */}
            <TabsContent value="shifts" className="space-y-4">
              <Card className="p-6">
                <form onSubmit={shiftForm.handleSubmit(handleShiftSettingsSave)} className="space-y-6">
                  {/* Duration & Grace */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Shift Defaults</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="defaultShiftDuration">Default Shift Duration (hours)</Label>
                        <Input
                          id="defaultShiftDuration"
                          type="number"
                          min={1}
                          max={24}
                          {...shiftForm.register('defaultShiftDuration', { valueAsNumber: true })}
                          disabled={!canEdit}
                        />
                        <p className="text-xs text-muted-foreground">Standard shift length for new shifts</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="graceMinutes">Grace Period (minutes)</Label>
                        <Input
                          id="graceMinutes"
                          type="number"
                          min={0}
                          max={120}
                          {...shiftForm.register('graceMinutes', { valueAsNumber: true })}
                          disabled={!canEdit}
                        />
                        <p className="text-xs text-muted-foreground">Allowed buffer before/after shift for login</p>
                      </div>
                    </div>
                  </div>

                  {/* Shift Enforcement */}
                  <div className="border-t pt-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-amber-600" />
                      Shift Enforcement
                    </h3>

                    <div className="space-y-5">
                      {/* Enforce Shift on Login */}
                      <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                        <div className="space-y-1">
                          <Label className="text-sm font-medium">Enforce Shift on Login</Label>
                          <p className="text-xs text-muted-foreground">
                            When enabled, users outside their scheduled shift hours will be denied login.
                            The grace period above still applies.
                          </p>
                        </div>
                        <Controller
                          name="enforceShiftOnLogin"
                          control={shiftForm.control}
                          render={({ field: { value, onChange } }) => (
                            <Switch
                              checked={value}
                              onCheckedChange={onChange}
                              disabled={!canEdit}
                            />
                          )}
                        />
                      </div>

                      {/* Global Bypass */}
                      <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                        <div className="space-y-1">
                          <Label className="text-sm font-medium flex items-center gap-2">
                            Global Shift Bypass
                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                              Temporary
                            </Badge>
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Temporarily bypass all shift enforcement checks. Useful during shift transitions
                            or system maintenance. All users can log in regardless of shift schedule.
                          </p>
                        </div>
                        <Controller
                          name="bypassShiftCheck"
                          control={shiftForm.control}
                          render={({ field: { value, onChange } }) => (
                            <Switch
                              checked={value}
                              onCheckedChange={onChange}
                              disabled={!canEdit}
                            />
                          )}
                        />
                      </div>

                      {shiftForm.watch('bypassShiftCheck') && (
                        <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
                          <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-amber-800">
                            <strong>Global bypass is active.</strong> All shift enforcement checks are currently disabled.
                            All users can log in at any time. Remember to turn this off after the transition period.
                          </p>
                        </div>
                      )}

                      {/* Excluded Roles */}
                      <div className="rounded-lg border p-4 space-y-3">
                        <div className="space-y-1">
                          <Label className="text-sm font-medium">Excluded Roles</Label>
                          <p className="text-xs text-muted-foreground">
                            Roles that bypass shift enforcement. Users with any of these roles can log in
                            at any time regardless of shift schedule.
                          </p>
                        </div>
                        <Controller
                          name="excludedRoles"
                          control={shiftForm.control}
                          render={({ field: { value, onChange } }) => {
                            const selectedRoles = value ? value.split(',').filter(Boolean) : [];
                            const toggleRole = (roleName: string) => {
                              const updated = selectedRoles.includes(roleName)
                                ? selectedRoles.filter((r) => r !== roleName)
                                : [...selectedRoles, roleName];
                              onChange(updated.join(','));
                            };
                            return (
                              <div className="flex flex-wrap gap-2">
                                {(allRoles ?? []).map((role: RoleDto) => {
                                  const isSelected = selectedRoles.includes(role.name);
                                  return (
                                    <button
                                      key={role.id}
                                      type="button"
                                      disabled={!canEdit}
                                      onClick={() => toggleRole(role.name)}
                                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                                        isSelected
                                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                      } ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                      {isSelected && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                      {role.name}
                                    </button>
                                  );
                                })}
                                {(!allRoles || allRoles.length === 0) && (
                                  <p className="text-xs text-muted-foreground">No roles available</p>
                                )}
                              </div>
                            );
                          }}
                        />
                        {shiftForm.watch('excludedRoles') && (
                          <p className="text-xs text-muted-foreground">
                            Selected: {shiftForm.watch('excludedRoles').split(',').filter(Boolean).length} role(s)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Security */}
                  <div className="border-t pt-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Security</h3>
                    <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Require 2FA for Shift Clock-in</Label>
                        <p className="text-xs text-muted-foreground">
                          Users must verify with two-factor authentication when clocking into a shift.
                        </p>
                      </div>
                      <Controller
                        name="require2FA"
                        control={shiftForm.control}
                        render={({ field: { value, onChange } }) => (
                          <Switch
                            checked={value}
                            onCheckedChange={onChange}
                            disabled={!canEdit}
                          />
                        )}
                      />
                    </div>
                  </div>

                  {/* Info Banner */}
                  <div className="flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-200 p-4">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Shift Settings Scope</p>
                      <p>
                        These settings apply globally. Individual shift configurations can override grace
                        periods and 2FA requirements in Shift Management. Excluded roles are checked
                        at login time against the user&apos;s assigned roles.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={!canEdit || updateShiftSettingsMutation.isPending}>
                      {updateShiftSettingsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
  );
}
