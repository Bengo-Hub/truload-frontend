'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
    useSettingsByCategory,
    useUpdateSettingsBatch,
} from '@/hooks/queries/useSettingsQueries';
import type { CourtDto } from '@/lib/api/courtHearing';
import { fetchCourts } from '@/lib/api/courtHearing';
import type { ApplicationSettingDto, UpdateSettingsBatchRequest } from '@/lib/api/settings';
import type { UserSummary } from '@/lib/api/setup';
import { fetchUsers } from '@/lib/api/setup';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import { Info, Loader2, Save } from 'lucide-react';

const KEY_DEFAULT_COURT = 'prosecution.default_court_id';
const KEY_DEFAULT_COMPLAINANT = 'prosecution.default_complainant_officer_id';
const KEY_DEFAULT_DISTRICT = 'prosecution.default_district';

export function ProsecutionSettingsTab() {
  const { data: settings, isLoading } = useSettingsByCategory('Prosecution');
  const updateBatch = useUpdateSettingsBatch();
  const [courts, setCourts] = useState<CourtDto[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [defaultCourtId, setDefaultCourtId] = useState<string>('');
  const [defaultComplainantId, setDefaultComplainantId] = useState<string>('');
  const [defaultDistrict, setDefaultDistrict] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [courtsRes, usersRes] = await Promise.all([
          fetchCourts(),
          fetchUsers({ pageNumber: 1, pageSize: 200 }),
        ]);
        setCourts(courtsRes ?? []);
        setUsers(usersRes?.items ?? []);
      } catch {
        toast.error('Failed to load courts or users');
      } finally {
        setLoadingLookups(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!settings?.length) return;
    const courtSetting = settings.find((s: ApplicationSettingDto) => s.settingKey === KEY_DEFAULT_COURT);
    const complainantSetting = settings.find((s: ApplicationSettingDto) => s.settingKey === KEY_DEFAULT_COMPLAINANT);
    const districtSetting = settings.find((s: ApplicationSettingDto) => s.settingKey === KEY_DEFAULT_DISTRICT);
    setDefaultCourtId(courtSetting?.settingValue ?? '');
    setDefaultComplainantId(complainantSetting?.settingValue ?? '');
    setDefaultDistrict(districtSetting?.settingValue ?? '');
  }, [settings]);

  const handleSave = useCallback(async () => {
    const updates: UpdateSettingsBatchRequest['settings'] = [
      { settingKey: KEY_DEFAULT_COURT, settingValue: defaultCourtId },
      { settingKey: KEY_DEFAULT_COMPLAINANT, settingValue: defaultComplainantId },
      { settingKey: KEY_DEFAULT_DISTRICT, settingValue: defaultDistrict },
    ];
    try {
      await updateBatch.mutateAsync({ settings: updates });
      toast.success('Prosecution settings saved');
      setHasChanges(false);
    } catch {
      toast.error('Failed to save settings');
    }
  }, [defaultCourtId, defaultComplainantId, defaultDistrict, updateBatch]);

  useEffect(() => {
    if (!settings?.length) return;
    const courtSetting = settings.find((s: ApplicationSettingDto) => s.settingKey === KEY_DEFAULT_COURT);
    const complainantSetting = settings.find((s: ApplicationSettingDto) => s.settingKey === KEY_DEFAULT_COMPLAINANT);
    const districtSetting = settings.find((s: ApplicationSettingDto) => s.settingKey === KEY_DEFAULT_DISTRICT);
    const changed =
      (courtSetting?.settingValue ?? '') !== defaultCourtId ||
      (complainantSetting?.settingValue ?? '') !== defaultComplainantId ||
      (districtSetting?.settingValue ?? '') !== defaultDistrict;
    setHasChanges(changed);
  }, [settings, defaultCourtId, defaultComplainantId, defaultDistrict]);

  if (isLoading || loadingLookups) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg bg-muted/50 border p-4">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Prosecution defaults</p>
          <p>
            Default court, complainant officer, and district are used when creating prosecution cases from the case register.
            Courts can be managed via the courts API; these settings only set which values are pre-selected.
          </p>
        </div>
      </div>

      <Card className="divide-y p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prosecution-default-court">Default court</Label>
          <Select value={defaultCourtId || 'none'} onValueChange={(v) => setDefaultCourtId(v === 'none' ? '' : v)}>
            <SelectTrigger id="prosecution-default-court">
              <SelectValue placeholder="Select default court" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {courts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.code ? ` (${c.code})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="prosecution-default-complainant">Default complainant officer</Label>
          <Select value={defaultComplainantId || 'none'} onValueChange={(v) => setDefaultComplainantId(v === 'none' ? '' : v)}>
            <SelectTrigger id="prosecution-default-complainant">
              <SelectValue placeholder="Select default complainant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.fullName || u.email || u.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="prosecution-default-district">Default district</Label>
          <Input
            id="prosecution-default-district"
            value={defaultDistrict}
            onChange={(e) => setDefaultDistrict(e.target.value)}
            placeholder="e.g. Nairobi, Mombasa"
          />
        </div>
        <div className="pt-2">
          <Button onClick={handleSave} disabled={!hasChanges || updateBatch.isPending}>
            {updateBatch.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save changes
          </Button>
        </div>
      </Card>
    </div>
  );
}
