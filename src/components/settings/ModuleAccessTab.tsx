'use client';

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
import { fetchOrganizations, updateOrganizationModules } from '@/lib/api/setup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const TENANT_TYPES = [
  { value: 'AxleLoadEnforcement', label: 'Axle Load Enforcement (all modules)' },
  { value: 'CommercialWeighing', label: 'Commercial Weighing (limited modules)' },
] as const;

const ALL_MODULE_KEYS = [
  'dashboard', 'weighing', 'cases', 'case_management', 'special_releases', 'prosecution', 'reporting',
  'users', 'shifts', 'technical', 'financial_invoices', 'financial_receipts',
  'setup_security', 'setup_axle', 'setup_weighing_metadata', 'setup_acts', 'setup_settings', 'setup_system_config',
];

/** Commercial Weighing: no special release, yard, prosecution, case management, charges/fee/axle enforcement. */
const COMMERCIAL_WEIGHING_MODULES = [
  'dashboard', 'weighing', 'reporting', 'users', 'setup_weighing_metadata', 'setup_settings',
];

function isGovernmentOrAxleLoad(org: { orgType?: string; tenantType?: string }): boolean {
  const gov = org.orgType?.toLowerCase() === 'government';
  const axle = org.tenantType === 'AxleLoadEnforcement';
  return gov || axle;
}

export function ModuleAccessTab() {
  const queryClient = useQueryClient();
  const { data: orgs, isLoading } = useQuery({
    queryKey: ['organizations', true],
    queryFn: () => fetchOrganizations(true),
  });
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [tenantType, setTenantType] = useState<string>('');
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());

  const updateModules = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { tenantType?: string; enabledModules?: string[] } }) =>
      updateOrganizationModules(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Organization modules updated');
    },
    onError: () => toast.error('Failed to update modules'),
  });

  const selectedOrg = orgs?.find((o) => o.id === selectedOrgId);

  useEffect(() => {
    if (selectedOrg) {
      const hasExistingModules = selectedOrg.enabledModules && selectedOrg.enabledModules.length > 0;
      if (hasExistingModules) {
        setTenantType(selectedOrg.tenantType ?? 'AxleLoadEnforcement');
        setSelectedModules(new Set(selectedOrg.enabledModules!));
      } else {
        if (isGovernmentOrAxleLoad(selectedOrg)) {
          setTenantType('AxleLoadEnforcement');
          setSelectedModules(new Set(ALL_MODULE_KEYS));
        } else {
          setTenantType('CommercialWeighing');
          setSelectedModules(new Set(COMMERCIAL_WEIGHING_MODULES));
        }
      }
    } else {
      setTenantType('AxleLoadEnforcement');
      setSelectedModules(new Set(ALL_MODULE_KEYS));
    }
  }, [selectedOrg?.id, selectedOrg?.tenantType, selectedOrg?.enabledModules, selectedOrg?.orgType]);

  const handleToggleModule = (key: string) => {
    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedOrgId) {
      toast.error('Select an organization first');
      return;
    }
    await updateModules.mutateAsync({
      id: selectedOrgId,
      payload: {
        tenantType: tenantType || undefined,
        enabledModules: Array.from(selectedModules),
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Configure tenant type and enabled modules per organization. Commercial Weighing tenants see only selected modules in the sidebar.
      </div>

      <Card className="p-4 space-y-4">
        <div className="space-y-2">
          <Label>Organization</Label>
          <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
            <SelectTrigger>
              <SelectValue placeholder="Select organization" />
            </SelectTrigger>
            <SelectContent>
              {orgs?.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {org.name} ({org.code})
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedOrg && (
          <>
            <div className="space-y-2">
              <Label>Tenant type</Label>
              <Select
                value={tenantType}
                onValueChange={(value) => {
                  setTenantType(value);
                  if (value === 'AxleLoadEnforcement') setSelectedModules(new Set(ALL_MODULE_KEYS));
                  else setSelectedModules(new Set(COMMERCIAL_WEIGHING_MODULES));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TENANT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Enabled modules (sidebar visibility)</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto border rounded-md p-3">
                {ALL_MODULE_KEYS.map((key) => (
                  <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedModules.has(key)}
                      onChange={() => handleToggleModule(key)}
                      className="rounded border-gray-300"
                    />
                    <span className="font-mono text-xs">{key}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={updateModules.isPending}
            >
              {updateModules.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
