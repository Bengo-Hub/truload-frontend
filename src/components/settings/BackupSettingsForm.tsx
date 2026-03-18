'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useBackupStatus, useUpdateBackupSettings } from '@/hooks/queries/useBackupQueries';
import { UpdateBackupSettingsRequest } from '@/lib/api/backup';
import { toast } from 'sonner';

type Frequency = 'daily' | 'weekly';

export function BackupSettingsForm({ canEdit }: { canEdit: boolean }) {
  const { data: status, isLoading } = useBackupStatus();
  const updateSettingsMutation = useUpdateBackupSettings();

  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [hour, setHour] = useState('2');
  const [dayOfWeek, setDayOfWeek] = useState('0'); // Sunday

  const form = useForm<UpdateBackupSettingsRequest>({
    defaultValues: {
      isEnabled: true,
      scheduleCron: '0 2 * * *',
      storagePath: './backups',
      backupPgDumpPath: '',
      retentionDays: 30,
    },
  });

  // Parse cron to UI state
  useEffect(() => {
    if (status) {
      form.reset({
        isEnabled: status.isEnabled,
        scheduleCron: status.scheduleCron,
        storagePath: status.storagePath,
        backupPgDumpPath: status.backupPgDumpPath,
        retentionDays: status.retentionDays,
      });

      // Simple cron parser: "0 H * * D" or "0 H * * *"
      const parts = status.scheduleCron.split(' ');
      if (parts.length >= 5) {
        setHour(parts[1]);
        if (parts[4] === '*') {
          setFrequency('daily');
        } else {
          setFrequency('weekly');
          setDayOfWeek(parts[4]);
        }
      }
    }
  }, [status, form]);

  const onSave = async (data: UpdateBackupSettingsRequest) => {
    // Construct cron from UI state
    const cron = `0 ${hour} * * ${frequency === 'daily' ? '*' : dayOfWeek}`;
    try {
      await updateSettingsMutation.mutateAsync({
        ...data,
        scheduleCron: cron,
      });
      toast.success('Backup settings updated successfully');
    } catch {
      toast.error('Failed to update backup settings');
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="h-4 w-1/4 bg-gray-200 animate-pulse rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-10 w-full bg-gray-100 animate-pulse rounded" />
            <div className="h-10 w-full bg-gray-100 animate-pulse rounded" />
          </div>
        </div>
      </Card>
    );
  }

  const hours = Array.from({ length: 24 }, (_, i) => {
    let label = '';
    if (i === 0) label = '12 AM';
    else if (i < 12) label = `${i} AM`;
    else if (i === 12) label = '12 PM';
    else label = `${i - 12} PM`;
    
    return { value: i.toString(), label };
  });

  const days = [
    { value: '0', label: 'Sunday' },
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday' },
  ];

  const selectedDayLabel = days.find(d => d.value === dayOfWeek)?.label;
  const selectedHourLabel = hours.find(h => h.value === hour)?.label;

  return (
    <Card className="p-6">
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
        <div className="flex items-center justify-between gap-4 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-600" />
            <div>
              <h3 className="text-lg font-semibold">Backup Scheduling & Path</h3>
              <p className="text-sm text-gray-500">Configure automated backups and PostgreSQL tool paths</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="isEnabled" className="text-sm font-medium">Auto-backup</Label>
            <Controller
              name="isEnabled"
              control={form.control}
              render={({ field: { value, onChange } }) => (
                <Switch
                  id="isEnabled"
                  checked={value}
                  onCheckedChange={onChange}
                  disabled={!canEdit}
                />
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4 border rounded-lg p-4 bg-gray-50/50">
            <Label className="text-base font-semibold">Backup Schedule</Label>
            
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v: Frequency) => setFrequency(v)} disabled={!canEdit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Every Day</SelectItem>
                  <SelectItem value="weekly">Every Week</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Time</Label>
                <Select value={hour} onValueChange={setHour} disabled={!canEdit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hours.map(h => (
                      <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {frequency === 'weekly' && (
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select value={dayOfWeek} onValueChange={setDayOfWeek} disabled={!canEdit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {days.map(d => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <p className="text-xs text-blue-600 font-medium">
              Next scheduled: {frequency === 'daily' ? 'Daily' : `Weekly on ${selectedDayLabel}`} at {selectedHourLabel}
            </p>
          </div>

          <div className="space-y-4 border rounded-lg p-4 bg-gray-50/50">
            <Label className="text-base font-semibold">Retention Policy</Label>
            <div className="space-y-2">
              <Label htmlFor="retentionDays">Keep Backups For (Days)</Label>
              <Input
                id="retentionDays"
                type="number"
                min={1}
                max={365}
                {...form.register('retentionDays', { valueAsNumber: true, required: true })}
                disabled={!canEdit}
              />
              <p className="text-xs text-muted-foreground">Older backups will be automatically purged.</p>
            </div>
          </div>

          <div className="space-y-2 md:col-span-2 mt-2">
            <Label htmlFor="storagePath">Storage Path</Label>
            <Input
              id="storagePath"
              {...form.register('storagePath', { required: true })}
              disabled={!canEdit}
              placeholder="e.g. ./backups or C:\backups"
            />
            <p className="text-xs text-muted-foreground">Where backup files are saved on the server.</p>
          </div>

          <div className="space-y-2 md:col-span-2 mt-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="backupPgDumpPath">pg_dump Path (Optional)</Label>
            </div>
            <Input
              id="backupPgDumpPath"
              {...form.register('backupPgDumpPath')}
              disabled={!canEdit}
              placeholder="e.g. C:\Program Files\PostgreSQL\17\bin\pg_dump.exe"
            />
            <p className="text-xs text-muted-foreground">Full path to the pg_dump executable. Use this if the tool is not in the system path.</p>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button type="submit" disabled={!canEdit || updateSettingsMutation.isPending}>
            {updateSettingsMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Configuration
          </Button>
        </div>
      </form>
    </Card>
  );
}
