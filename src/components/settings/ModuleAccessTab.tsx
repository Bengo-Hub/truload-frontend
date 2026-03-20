'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { fetchOrganizations, updateOrganizationModules } from '@/lib/api/setup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Edit2, Loader2, Save } from 'lucide-react';
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
  'financial_invoices', 'financial_receipts',
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

      {/* Organization overview table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Organisations & Tenant Types</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead>Organisation</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Tenant Use Case</TableHead>
                  <TableHead className="text-center">Modules</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs?.map((org) => {
                  const tt = org.tenantType || (org.orgType?.toLowerCase() === 'government' ? 'AxleLoadEnforcement' : 'AxleLoadEnforcement');
                  const moduleCount = org.enabledModules?.length || ALL_MODULE_KEYS.length;
                  return (
                    <TableRow key={org.id} className={selectedOrgId === org.id ? 'bg-primary/5' : ''}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell className="font-mono text-xs text-gray-500">{org.code}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={org.orgType === 'Government' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}>
                          {org.orgType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          tt === 'CommercialWeighing'
                            ? 'bg-violet-100 text-violet-700 hover:bg-violet-100'
                            : 'bg-sky-100 text-sky-700 hover:bg-sky-100'
                        }>
                          {tt === 'CommercialWeighing' ? 'Commercial Weighing' : 'Axle Load Enforcement'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{moduleCount}</span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedOrgId(org.id)}
                          className="h-8 w-8 p-0"
                          title="Edit modules"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit form for selected org */}
      {selectedOrg && (
        <Card className="p-4 space-y-4 border-primary/30">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Building2 className="h-4 w-4" />
            Editing: <span className="font-semibold">{selectedOrg.name} ({selectedOrg.code})</span>
          </div>

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

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={updateModules.isPending}>
              {updateModules.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
            <Button variant="outline" onClick={() => setSelectedOrgId('')}>
              Cancel
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
