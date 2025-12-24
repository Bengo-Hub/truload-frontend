'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { useHasPermission } from '@/hooks/useAuth';
import {
  fetchApiSettings,
  fetchPasswordPolicy,
  restoreFromBackup,
  saveApiSettings,
  triggerBackup,
  updatePasswordPolicy,
  type KeyValueEntry,
  type PasswordPolicy,
} from '@/lib/api/setup';
import { useMutation, useQuery } from '@tanstack/react-query';
import { RefreshCcw, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const SERVICES = [
  { value: 'notifications', label: 'Notifications Service' },
  { value: 'ntsa', label: 'NTSA' },
  { value: 'ecitizen', label: 'eCitizen' },
  { value: 'kenha', label: 'KeNHA' },
];

export default function SystemSettingsPage() {
  const canEdit = useHasPermission(['system.view_config', 'configuration.integrations'], 'any');

  const [service, setService] = useState<string>(SERVICES[0].value);

  // Password Policy
  const { data: policy, refetch: refetchPolicy } = useQuery({
    queryKey: ['passwordPolicy'],
    queryFn: () => fetchPasswordPolicy(),
  });

  const policyForm = useForm<PasswordPolicy & { lockoutMinutesStr?: string }>({
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

  useEffect(() => {
    if (policy) {
      policyForm.reset({ ...policy });
    }
  }, [policy, policyForm]);

  const savePolicy = useMutation({
    mutationFn: (payload: PasswordPolicy) => updatePasswordPolicy(payload),
    onSuccess: () => {
      toast.success('Password policy saved');
      refetchPolicy();
    },
    onError: () => toast.error('Failed to save policy'),
  });

  // Backup & Restore
  const backup = useMutation({
    mutationFn: () => triggerBackup(),
    onSuccess: () => toast.success('Backup triggered'),
    onError: () => toast.error('Backup failed'),
  });

  const restore = useMutation({
    mutationFn: (backupId: string) => restoreFromBackup(backupId),
    onSuccess: () => toast.success('Restore triggered'),
    onError: () => toast.error('Restore failed'),
  });

  // API Settings (Key–Value)
  const { data: apiSettings, refetch: refetchApiSettings } = useQuery({
    queryKey: ['apiSettings', service],
    queryFn: () => fetchApiSettings(service),
  });

  const [entries, setEntries] = useState<KeyValueEntry[]>([]);

  useEffect(() => {
    if (apiSettings?.entries) {
      setEntries(apiSettings.entries);
    } else {
      setEntries([]);
    }
  }, [apiSettings]);

  const saveApi = useMutation({
    mutationFn: () => saveApiSettings(service, entries),
    onSuccess: () => {
      toast.success('API settings saved');
      refetchApiSettings();
    },
    onError: () => toast.error('Failed to save API settings'),
  });

  const addEntry = () => setEntries((prev) => [...prev, { key: '', value: '' }]);
  const removeEntry = (index: number) => setEntries((prev) => prev.filter((_, i) => i !== index));

  const kvDisabled = useMemo(() => !canEdit, [canEdit]);

  return (
    <AppShell title="System Settings" subtitle="Password policy, backups, API settings">
      <ProtectedRoute requiredPermissions={["system.view_config"]}>
        <div className="space-y-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">System Settings</h2>
          <p className="text-sm text-gray-500">Manage password policy, backups, and external API settings.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => { refetchPolicy(); refetchApiSettings(); }}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
          </header>

      <Tabs defaultValue="security">
        <TabsList>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
          <TabsTrigger value="apis">API Settings</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="shift">Shift Settings</TabsTrigger>
        </TabsList>

        {/* Security: Password Policy */}
        <TabsContent value="security">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <form
              onSubmit={policyForm.handleSubmit((values) => savePolicy.mutate(values))}
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              <div className="space-y-2">
                <Label htmlFor="minLength">Minimum length</Label>
                <Input id="minLength" type="number" min={6} {...policyForm.register('minLength', { valueAsNumber: true })} disabled={!canEdit} />
              </div>
              <div className="space-y-2">
                <Label>Uppercase</Label>
                <Controller
                  name="requireUppercase"
                  control={policyForm.control}
                  render={({ field }) => (
                    <Select value={field.value ? 'yes' : 'no'} onValueChange={(v) => field.onChange(v === 'yes')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Required</SelectItem>
                        <SelectItem value="no">Not required</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Lowercase</Label>
                <Controller
                  name="requireLowercase"
                  control={policyForm.control}
                  render={({ field }) => (
                    <Select value={field.value ? 'yes' : 'no'} onValueChange={(v) => field.onChange(v === 'yes')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Required</SelectItem>
                        <SelectItem value="no">Not required</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Digits</Label>
                <Controller
                  name="requireDigit"
                  control={policyForm.control}
                  render={({ field }) => (
                    <Select value={field.value ? 'yes' : 'no'} onValueChange={(v) => field.onChange(v === 'yes')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Required</SelectItem>
                        <SelectItem value="no">Not required</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Special characters</Label>
                <Controller
                  name="requireSpecial"
                  control={policyForm.control}
                  render={({ field }) => (
                    <Select value={field.value ? 'yes' : 'no'} onValueChange={(v) => field.onChange(v === 'yes')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Required</SelectItem>
                        <SelectItem value="no">Not required</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lockoutThreshold">Lockout threshold</Label>
                <Input id="lockoutThreshold" type="number" min={0} {...policyForm.register('lockoutThreshold', { valueAsNumber: true })} disabled={!canEdit} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lockoutMinutes">Lockout minutes</Label>
                <Input id="lockoutMinutes" type="number" min={0} {...policyForm.register('lockoutMinutes', { valueAsNumber: true })} disabled={!canEdit} />
              </div>

              <div className="md:col-span-2 flex justify-end gap-2">
                <Button type="submit" disabled={!canEdit}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Policy
                </Button>
              </div>
            </form>
          </div>
        </TabsContent>

        {/* Backup & Restore */}
        <TabsContent value="backup">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Button onClick={() => backup.mutate()} disabled={!canEdit}>Trigger Backup</Button>
              <Button variant="outline" onClick={() => {
                const id = window.prompt('Backup ID to restore:');
                if (id) restore.mutate(id);
              }} disabled={!canEdit}>Restore</Button>
            </div>
          </div>
        </TabsContent>

        {/* API Settings */}
        <TabsContent value="apis">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Service</Label>
                <Select value={service} onValueChange={(v) => setService(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-3">
                {entries.map((entry, idx) => (
                  <div key={idx} className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label>Key</Label>
                      <Input
                        value={entry.key}
                        onChange={(e) => setEntries((prev) => prev.map((p, i) => i === idx ? { ...p, key: e.target.value } : p))}
                        disabled={kvDisabled}
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label>Value</Label>
                      <Input
                        value={entry.value}
                        onChange={(e) => setEntries((prev) => prev.map((p, i) => i === idx ? { ...p, value: e.target.value } : p))}
                        disabled={kvDisabled}
                      />
                    </div>
                    <div className="md:col-span-3 flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => removeEntry(idx)}
                        disabled={kvDisabled}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between">
              <Button type="button" variant="outline" onClick={addEntry} disabled={kvDisabled}>Add Pair</Button>
              <Button type="button" onClick={() => saveApi.mutate()} disabled={kvDisabled}>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Audit Logs */}
        <TabsContent value="audit">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-3">View recent system audit logs (actions across modules).</p>
            {/* Placeholder: wire to backend audit logs endpoint when available */}
            <div className="text-sm text-gray-500">Audit log viewer coming soon.</div>
          </div>
        </TabsContent>

        {/* Shift Settings */}
        <TabsContent value="shift">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-3">Configure shift rules and defaults. See ERP references for detailed approach.</p>
            {/* Placeholder: shift settings editor to be implemented, leveraging WorkShifts APIs */}
            <div className="text-sm text-gray-500">Shift settings editor coming soon.</div>
          </div>
        </TabsContent>
        </Tabs>
        </div>
      </ProtectedRoute>
    </AppShell>
  );
}
