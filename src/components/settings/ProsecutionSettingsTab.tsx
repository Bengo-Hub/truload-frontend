'use client';

import { useOrgSlug } from '@/hooks/useOrgSlug';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { COURT_HEARING_QUERY_KEYS, useCourts } from '@/hooks/queries/useCourtHearingQueries';
import { GEOGRAPHIC_QUERY_KEYS, useCounties, useSubcounties } from '@/hooks/queries/useGeographicQueries';
import {
  useSettingsByCategory,
  useUpdateSettingsBatch,
} from '@/hooks/queries/useSettingsQueries';
import {
  useRoadsByCounty,
  useRoadsByDistrict,
  useRoadsPaged,
} from '@/hooks/queries/useWeighingQueries';
import { fetchSubcounties, type CountyDto, type SubcountyDto } from '@/lib/api/geographic';
import type { ApplicationSettingDto, UpdateSettingsBatchRequest } from '@/lib/api/settings';
import { fetchUsers } from '@/lib/api/setup';
import type { Road } from '@/lib/api/weighing';
import { QUERY_KEYS, QUERY_OPTIONS } from '@/lib/query/config';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { AddCountyModal } from '@/components/settings/prosecution/AddCountyModal';
import { AddCourtModal } from '@/components/settings/prosecution/AddCourtModal';
import { AddRoadModal } from '@/components/settings/prosecution/AddRoadModal';
import { AddSubcountyModal } from '@/components/settings/prosecution/AddSubcountyModal';
import { Info, Loader2, MapPin, Save, Settings2 } from 'lucide-react';

const KEY_DEFAULT_COURT = 'prosecution.default_court_id';
const KEY_DEFAULT_COMPLAINANT = 'prosecution.default_complainant_officer_id';
const KEY_DEFAULT_COUNTY = 'prosecution.default_county_id';
const KEY_DEFAULT_SUBCOUNTY = 'prosecution.default_subcounty_id';
const KEY_DEFAULT_ROAD = 'prosecution.default_road_id';

/** Role names that are considered case/prosecution related for complainant filter */
const PROSECUTION_ROLE_KEYWORDS = ['prosecution', 'case', 'court', 'officer', 'inspector'];

function isProsecutionRelatedRole(roleName: string): boolean {
  const lower = roleName.toLowerCase();
  return PROSECUTION_ROLE_KEYWORDS.some((k) => lower.includes(k));
}

export function ProsecutionSettingsTab() {
  const orgSlug = useOrgSlug();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useSettingsByCategory('Prosecution');
  const updateBatch = useUpdateSettingsBatch();
  const [defaultCourtId, setDefaultCourtId] = useState<string>('');
  const [defaultComplainantId, setDefaultComplainantId] = useState<string>('');
  const [defaultCountyId, setDefaultCountyId] = useState<string>('');
  const [defaultSubcountyId, setDefaultSubcountyId] = useState<string>('');
  const [defaultRoadId, setDefaultRoadId] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);

  const { data: counties = [], isLoading: countiesLoading } = useCounties();
  const { data: subcounties = [], isLoading: subcountiesLoading } = useSubcounties(defaultCountyId || undefined);
  const { data: courts = [], isLoading: courtsLoading } = useCourts();
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: [...QUERY_KEYS.USERS, 'list', 500],
    queryFn: () => fetchUsers({ pageNumber: 1, pageSize: 500 }),
    ...QUERY_OPTIONS.semiStatic,
  });
  const users = usersData?.items ?? [];

  const roadsByDistrict = useRoadsByDistrict(defaultSubcountyId || undefined);
  const roadsByCounty = useRoadsByCounty(defaultCountyId && !defaultSubcountyId ? defaultCountyId : undefined);
  const roadsPaged = useRoadsPaged({ pageNumber: 1, pageSize: 500 });

  const roads: Road[] = useMemo(() => {
    if (defaultSubcountyId && roadsByDistrict.data) return roadsByDistrict.data;
    if (defaultCountyId && !defaultSubcountyId && roadsByCounty.data) return roadsByCounty.data;
    return roadsPaged.data?.items ?? [];
  }, [defaultSubcountyId, defaultCountyId, roadsByDistrict.data, roadsByCounty.data, roadsPaged.data?.items]);

  const roadsLoading = defaultSubcountyId
    ? roadsByDistrict.isLoading
    : defaultCountyId
      ? roadsByCounty.isLoading
      : roadsPaged.isLoading;

  const loadingLookups = countiesLoading || courtsLoading || usersLoading || subcountiesLoading || roadsLoading;

  useEffect(() => {
    if (!settings?.length) return;
    const get = (key: string) => settings.find((s: ApplicationSettingDto) => s.settingKey === key)?.settingValue ?? '';
    setDefaultCourtId(get(KEY_DEFAULT_COURT));
    setDefaultComplainantId(get(KEY_DEFAULT_COMPLAINANT));
    setDefaultCountyId(get(KEY_DEFAULT_COUNTY));
    setDefaultSubcountyId(get(KEY_DEFAULT_SUBCOUNTY));
    setDefaultRoadId(get(KEY_DEFAULT_ROAD));
  }, [settings]);

  const handleSave = useCallback(async () => {
    const updates: UpdateSettingsBatchRequest['settings'] = [
      { settingKey: KEY_DEFAULT_COURT, settingValue: defaultCourtId },
      { settingKey: KEY_DEFAULT_COMPLAINANT, settingValue: defaultComplainantId },
      { settingKey: KEY_DEFAULT_COUNTY, settingValue: defaultCountyId },
      { settingKey: KEY_DEFAULT_SUBCOUNTY, settingValue: defaultSubcountyId },
      { settingKey: KEY_DEFAULT_ROAD, settingValue: defaultRoadId },
    ];
    try {
      await updateBatch.mutateAsync({ settings: updates });
      toast.success('Prosecution defaults saved');
      setHasChanges(false);
    } catch {
      toast.error('Failed to save settings');
    }
  }, [
    defaultCourtId,
    defaultComplainantId,
    defaultCountyId,
    defaultSubcountyId,
    defaultRoadId,
    updateBatch,
  ]);

  useEffect(() => {
    if (!settings?.length) return;
    const get = (key: string) => settings.find((s: ApplicationSettingDto) => s.settingKey === key)?.settingValue ?? '';
    const changed =
      (get(KEY_DEFAULT_COURT) ?? '') !== defaultCourtId ||
      (get(KEY_DEFAULT_COMPLAINANT) ?? '') !== defaultComplainantId ||
      (get(KEY_DEFAULT_COUNTY) ?? '') !== defaultCountyId ||
      (get(KEY_DEFAULT_SUBCOUNTY) ?? '') !== defaultSubcountyId ||
      (get(KEY_DEFAULT_ROAD) ?? '') !== defaultRoadId;
    setHasChanges(changed);
  }, [settings, defaultCourtId, defaultComplainantId, defaultCountyId, defaultSubcountyId, defaultRoadId]);

  const complainantUsers = users.filter((u) =>
    (u.roles ?? []).some((r) => isProsecutionRelatedRole(r))
  );

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
      <Tabs defaultValue="defaults" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="defaults" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Prosecution defaults
          </TabsTrigger>
          <TabsTrigger value="location-hierarchy" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Location hierarchy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="defaults" className="mt-4 space-y-4">
          <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-4">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Prosecution defaults</p>
              <p>
                Default court, complainant officer, county, subcounty, road, and district are used when creating prosecution cases from the case register. Set the values you want pre-selected.
              </p>
            </div>
          </div>

          <Card className="divide-y p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prosecution-default-county">Default county</Label>
              <div className="flex gap-2">
                <Select value={defaultCountyId || 'none'} onValueChange={(v) => setDefaultCountyId(v === 'none' ? '' : v)}>
                  <SelectTrigger id="prosecution-default-county" className="flex-1">
                    <SelectValue placeholder="Select default county" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {counties.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.code ? ` (${c.code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <AddCountyModal
                  onCreated={(c) => {
                    queryClient.invalidateQueries({ queryKey: GEOGRAPHIC_QUERY_KEYS.counties });
                    setDefaultCountyId(c.id);
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prosecution-default-subcounty">Default subcounty</Label>
              <div className="flex gap-2">
                <Select
                  value={defaultSubcountyId || 'none'}
                  onValueChange={(v) => setDefaultSubcountyId(v === 'none' ? '' : v)}
                >
                  <SelectTrigger id="prosecution-default-subcounty" className="flex-1">
                    <SelectValue placeholder="Select default subcounty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {subcounties.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                        {s.code ? ` (${s.code})` : ''}
                      </SelectItem>
                    ))}
                    {defaultCountyId && subcounties.length === 0 && (
                      <SelectItem value="_empty" disabled>
                        No subcounties for this county
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <AddSubcountyModal
                  counties={counties}
                  onCreated={(s) => {
                    queryClient.invalidateQueries({ queryKey: GEOGRAPHIC_QUERY_KEYS.subcounties(defaultCountyId) });
                    if (s.countyId === defaultCountyId) setDefaultSubcountyId(s.id);
                  }}
                />
              </div>
              {defaultCountyId && (
                <p className="text-xs text-muted-foreground">Filtered by selected county. Subcounty and district mean the same.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="prosecution-default-road">Default road</Label>
              <div className="flex gap-2">
                <Select value={defaultRoadId || 'none'} onValueChange={(v) => setDefaultRoadId(v === 'none' ? '' : v)}>
                  <SelectTrigger id="prosecution-default-road" className="flex-1">
                    <SelectValue placeholder="Select default road" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {roads.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.code} {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <AddRoadModal
                  onCreated={(r) => {
                    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ROADS });
                    setDefaultRoadId(r.id);
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">Roads filtered by selected county/subcounty when set.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prosecution-default-court">Default court</Label>
              <div className="flex gap-2">
                <Select value={defaultCourtId || 'none'} onValueChange={(v) => setDefaultCourtId(v === 'none' ? '' : v)}>
                  <SelectTrigger id="prosecution-default-court" className="flex-1">
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
                <AddCourtModal
                  counties={counties}
                  subcounties={subcounties}
                  onCreated={(c) => {
                    queryClient.invalidateQueries({ queryKey: COURT_HEARING_QUERY_KEYS.courts });
                    setDefaultCourtId(c.id);
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prosecution-default-complainant">Default complainant officer</Label>
              <Select value={defaultComplainantId || 'none'} onValueChange={(v) => setDefaultComplainantId(v === 'none' ? '' : v)}>
                <SelectTrigger id="prosecution-default-complainant">
                  <SelectValue placeholder="Select default complainant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {complainantUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName || u.email || u.id}
                      {(u.roles?.length ?? 0) > 0 && (
                        <span className="text-muted-foreground ml-1">({u.roles?.join(', ')})</span>
                      )}
                    </SelectItem>
                  ))}
                  {complainantUsers.length === 0 && (
                    <SelectItem value="_empty" disabled>
                      No users with case/prosecution roles
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Filtered to users with case or prosecution related roles.</p>
            </div>

            <div className="pt-2">
              <Button onClick={handleSave} disabled={!hasChanges || updateBatch.isPending}>
                {updateBatch.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save changes
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="location-hierarchy" className="mt-4 space-y-4">
          <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-4">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Location hierarchy</p>
              <p>
                County → Subcounty (district). Subcounty and district mean the same; the system uses Subcounty in the API. Use Prosecution defaults to set default county and subcounty for new cases.
              </p>
            </div>
          </div>

          <Card className="p-4">
            <div className="space-y-4">
              {counties.length === 0 ? (
                <p className="text-sm text-muted-foreground">No counties seeded. Run backend seeding for geographic data.</p>
              ) : (
                <ul className="space-y-3">
                  {counties.map((county) => (
                    <LocationHierarchyItem
                      key={county.id}
                      county={county}
                      subcounties={subcounties.filter((s) => s.countyId === county.id)}
                      loadSubcounties={fetchSubcounties}
                    />
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LocationHierarchyItem({
  county,
  subcounties: initialSubcounties,
  loadSubcounties,
}: {
  county: CountyDto;
  subcounties: SubcountyDto[];
  loadSubcounties: (countyId?: string) => Promise<SubcountyDto[]>;
}) {
  const [subcounties, setSubcounties] = useState<SubcountyDto[]>(initialSubcounties);
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(initialSubcounties.length > 0);

  useEffect(() => {
    if (expanded && !loaded) {
      loadSubcounties(county.id).then((list) => {
        setSubcounties(list);
        setLoaded(true);
      });
    }
  }, [county.id, expanded, loaded, loadSubcounties]);

  const displaySubcounties = expanded ? subcounties : initialSubcounties;
  const hasChildren = displaySubcounties.length > 0 || expanded;

  return (
    <li className="rounded-md border p-3">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left font-medium"
        onClick={() => setExpanded(!expanded)}
      >
        <span>
          {county.name}
          {county.code && <span className="text-muted-foreground ml-1">({county.code})</span>}
        </span>
        {hasChildren && (
          <span className="text-muted-foreground text-sm">
            {expanded ? '▼' : '▶'} {displaySubcounties.length} subcounty(ies)
          </span>
        )}
      </button>
      {expanded && (
        <ul className="mt-2 ml-4 space-y-1 border-l pl-3">
          {displaySubcounties.length === 0 && loaded && <li className="text-sm text-muted-foreground">No subcounties</li>}
          {displaySubcounties.map((s) => (
            <li key={s.id} className="text-sm">
              {s.name}
              {s.code && <span className="text-muted-foreground ml-1">({s.code})</span>}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
