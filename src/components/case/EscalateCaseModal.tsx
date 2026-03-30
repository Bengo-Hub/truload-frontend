'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { DriverFormFields, type DriverFormValues } from '@/components/weighing/modals/DriverFormFields';
import { TransporterFormFields, type TransporterFormValues } from '@/components/weighing/modals/TransporterFormFields';
import { useEscalateCase, useUpdateCase } from '@/hooks/queries/useCaseRegisterQueries';
import type { CaseRegisterDto } from '@/lib/api/caseRegister';
import { fetchStations } from '@/lib/api/setup';
import { getDriverById, getTransporterById, getVehicleById } from '@/lib/api/weighing';
import { useQuery } from '@tanstack/react-query';
import { FileText, Loader2, Shield, TrendingUp, Truck, User } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

const emptyDriverFormValues: DriverFormValues = {
  fullNames: '',
  surname: '',
  idNumber: '',
  drivingLicenseNo: '',
  phoneNumber: '',
  ntsaId: '',
  gender: '',
  nationality: 'Kenyan',
  dateOfBirth: '',
  address: '',
  email: '',
  licenseClass: '',
  licenseIssueDate: '',
  licenseExpiryDate: '',
  isProfessionalDriver: false,
};

const emptyTransporterFormValues: TransporterFormValues = {
  code: '',
  name: '',
  registrationNo: '',
  phone: '',
  email: '',
  address: '',
};

export interface EscalateCaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  caseData: CaseRegisterDto | undefined;
  users: Array<{ id: string; fullName?: string; email?: string }>;
  onSuccess?: () => void;
}

export function EscalateCaseModal({
  open,
  onOpenChange,
  caseId,
  caseData,
  users,
  onSuccess,
}: EscalateCaseModalProps) {
  const updateCaseMutation = useUpdateCase();
  const escalateCaseMutation = useEscalateCase();

  // Reused driver/transporter form state (same shape as DriverModal / TransporterModal)
  const [driverFormValues, setDriverFormValues] = useState<DriverFormValues>(emptyDriverFormValues);
  const [transporterFormValues, setTransporterFormValues] = useState<TransporterFormValues>(emptyTransporterFormValues);
  // Case-specific fields
  const [driverNtacNo, setDriverNtacNo] = useState('');
  const [transporterNtacNo, setTransporterNtacNo] = useState('');
  const [obNo, setObNo] = useState('');
  const [investigatingOfficerId, setInvestigatingOfficerId] = useState('');
  const [caseManagerId, setCaseManagerId] = useState('');
  const [notes, setNotes] = useState('');
  const [caseManagerSearch, setCaseManagerSearch] = useState('');
  const [ioSearch, setIoSearch] = useState('');
  const [complainantOfficerId, setComplainantOfficerId] = useState('');
  const [detentionStationId, setDetentionStationId] = useState('');
  const [complainantSearch, setComplainantSearch] = useState('');

  // Load driver when case has driverId
  const { data: driver } = useQuery({
    queryKey: ['driver', caseData?.driverId],
    queryFn: () => getDriverById(caseData!.driverId!),
    enabled: open && !!caseData?.driverId,
  });

  // Load vehicle to get transporterId
  const { data: vehicle } = useQuery({
    queryKey: ['vehicle', caseData?.vehicleId],
    queryFn: () => getVehicleById(caseData!.vehicleId),
    enabled: open && !!caseData?.vehicleId,
  });

  // Load transporter when vehicle has transporterId
  const { data: transporter } = useQuery({
    queryKey: ['transporter', vehicle?.transporterId],
    queryFn: () => getTransporterById(vehicle!.transporterId!),
    enabled: open && !!vehicle?.transporterId,
  });

  // Stations (for detention station dropdown)
  const { data: stations = [] } = useQuery({
    queryKey: ['stations', open],
    queryFn: () => fetchStations(true),
    enabled: open,
  });

  // Prefill form when modal opens and data is available
  useEffect(() => {
    if (!open || !caseData) return;

    const driverNameParts = caseData.driverName?.split(' ') ?? [];
    const driverFirst = driverNameParts.slice(0, -1).join(' ');
    const driverLast = driverNameParts.slice(-1)[0] ?? '';

    setDriverFormValues({
      ...emptyDriverFormValues,
      fullNames: driver?.fullNames ?? driverFirst ?? '',
      surname: driver?.surname ?? driverLast ?? '',
      idNumber: driver?.idNumber ?? '',
      drivingLicenseNo: driver?.drivingLicenseNo ?? caseData.driverLicenseNo ?? '',
      phoneNumber: driver?.phoneNumber ?? '',
      ntsaId: driver?.ntsaId ?? '',
      gender: driver?.gender ?? '',
      nationality: driver?.nationality ?? 'Kenyan',
      dateOfBirth: driver?.dateOfBirth ? new Date(driver.dateOfBirth).toISOString().slice(0, 10) : '',
      address: driver?.address ?? '',
      email: driver?.email ?? '',
      licenseClass: driver?.licenseClass ?? '',
      licenseIssueDate: driver?.licenseIssueDate ? new Date(driver.licenseIssueDate).toISOString().slice(0, 10) : '',
      licenseExpiryDate: driver?.licenseExpiryDate ? new Date(driver.licenseExpiryDate).toISOString().slice(0, 10) : '',
      isProfessionalDriver: driver?.isProfessionalDriver ?? false,
    });
    const t = transporter as { registrationNo?: string; phone?: string; phoneNumber?: string } | undefined;
    setTransporterFormValues({
      ...emptyTransporterFormValues,
      code: transporter?.code ?? '',
      name: transporter?.name ?? caseData.transporterName ?? '',
      registrationNo: t?.registrationNo ?? '',
      phone: t?.phone ?? transporter?.phoneNumber ?? '',
      email: transporter?.email ?? '',
      address: transporter?.address ?? '',
    });
    setDriverNtacNo(caseData.driverNtacNo ?? '');
    setTransporterNtacNo(caseData.transporterNtacNo ?? '');
    setObNo(caseData.obNo ?? '');
    setInvestigatingOfficerId(caseData.investigatingOfficerId ?? '');
    setDetentionStationId(caseData.detentionStationId ?? '');
    setNotes('');

    // Preselect default case manager and complainant if not already set on the case
    // Look for seeded accounts by email pattern: "casemanager@*.truload.local" and "complainant@*.truload.local"
    const defaultCaseManager = caseData.caseManagerId
      ? caseData.caseManagerId
      : users.find(u => u.email?.includes('casemanager@') && u.email?.endsWith('.truload.local'))?.id ?? '';
    setCaseManagerId(defaultCaseManager);

    const defaultComplainant = caseData.complainantOfficerId
      ? caseData.complainantOfficerId
      : users.find(u => u.email?.includes('complainant@') && u.email?.endsWith('.truload.local'))?.id ?? '';
    setComplainantOfficerId(defaultComplainant);
  }, [
    open,
    caseData,
    driver,
    transporter,
    users,
  ]);

  const isSubmitting = updateCaseMutation.isPending || escalateCaseMutation.isPending;

  const requiredErrors = useCallback(() => {
    const errs: string[] = [];
    if (!caseManagerId.trim()) errs.push('Case Manager');
    if (!investigatingOfficerId.trim()) errs.push('Investigating Officer');
    if (!driverFormValues.fullNames?.trim()) errs.push('Driver full names');
    if (!driverFormValues.surname?.trim()) errs.push('Driver surname');
    if (!transporterFormValues.name?.trim()) errs.push('Transporter name');
    return errs;
  }, [caseManagerId, investigatingOfficerId, driverFormValues.fullNames, driverFormValues.surname, transporterFormValues.name]);

  const handleSubmit = useCallback(async () => {
    const missing = requiredErrors();
    if (missing.length > 0) {
      toast.error(`Please complete required fields: ${missing.join(', ')}`);
      return;
    }

    try {
      await updateCaseMutation.mutateAsync({
        id: caseId,
        request: {
          driverNtacNo: driverNtacNo.trim() || undefined,
          transporterNtacNo: transporterNtacNo.trim() || undefined,
          investigatingOfficerId: investigatingOfficerId.trim() || undefined,
          complainantOfficerId: complainantOfficerId.trim() || undefined,
          detentionStationId: detentionStationId.trim() || undefined,
          obNo: obNo.trim() || undefined,
        },
      });
      await escalateCaseMutation.mutateAsync({
        id: caseId,
        caseManagerId: caseManagerId.trim(),
      });
      toast.success('Case escalated successfully');
      onOpenChange(false);
      onSuccess?.();
    } catch (_e) {
      toast.error('Failed to escalate case');
    }
  }, [
    caseId,
    caseManagerId,
    investigatingOfficerId,
    driverNtacNo,
    transporterNtacNo,
    obNo,
    complainantOfficerId,
    detentionStationId,
    requiredErrors,
    updateCaseMutation,
    escalateCaseMutation,
    onOpenChange,
    onSuccess,
  ]);

  const filteredUsersForManager = users.filter(
    (u) =>
      !caseManagerSearch ||
      (u.fullName ?? '').toLowerCase().includes(caseManagerSearch.toLowerCase()) ||
      (u.email ?? '').toLowerCase().includes(caseManagerSearch.toLowerCase())
  );
  const filteredUsersForIo = users.filter(
    (u) =>
      !ioSearch ||
      (u.fullName ?? '').toLowerCase().includes(ioSearch.toLowerCase()) ||
      (u.email ?? '').toLowerCase().includes(ioSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Escalate to Case Manager</DialogTitle>
          <DialogDescription>
            Complete driver, transporter, and officer details. Fields marked with * are required. Driver and owner NTAC numbers are case-specific and mandatory only when escalating to case manager; prosecution cases do not require NTACs.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="driver" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="driver" className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              Driver
            </TabsTrigger>
            <TabsTrigger value="transporter" className="flex items-center gap-1.5">
              <Truck className="h-4 w-4" />
              Transporter
            </TabsTrigger>
            <TabsTrigger value="io" className="flex items-center gap-1.5">
              <Shield className="h-4 w-4" />
              IO & Detention
            </TabsTrigger>
            <TabsTrigger value="manager" className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              Case Manager
            </TabsTrigger>
          </TabsList>

          <TabsContent value="driver" className="space-y-4 pt-4">
            <DriverFormFields
              idPrefix="escalate-driver"
              values={driverFormValues}
              onChange={(field, value) =>
                setDriverFormValues((prev) => ({ ...prev, [field]: value }))
              }
              disabled={false}
              requiredFields={['fullNames', 'surname']}
            />
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="escalate-driver-ntac">Driver NTAC / NTSA notice no. (optional for prosecution)</Label>
              <Input
                id="escalate-driver-ntac"
                value={driverNtacNo}
                onChange={(e) => setDriverNtacNo(e.target.value)}
                placeholder="Required when escalating to case manager; optional for court/prosecution"
              />
            </div>
          </TabsContent>

          <TabsContent value="transporter" className="space-y-4 pt-4">
            <TransporterFormFields
              idPrefix="escalate-transporter"
              values={transporterFormValues}
              onChange={(field, value) =>
                setTransporterFormValues((prev) => ({ ...prev, [field]: value }))
              }
              disabled={false}
              requiredFields={['name']}
            />
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="escalate-transporter-ntac">Transporter/owner NTAC no. (optional for prosecution)</Label>
              <Input
                id="escalate-transporter-ntac"
                value={transporterNtacNo}
                onChange={(e) => setTransporterNtacNo(e.target.value)}
                placeholder="Required when escalating to case manager; optional for court/prosecution"
              />
            </div>
          </TabsContent>

          <TabsContent value="io" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Investigating Officer <span className="text-red-500">*</span></Label>
              <Select value={investigatingOfficerId} onValueChange={setInvestigatingOfficerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select investigating officer..." />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input
                      placeholder="Search users..."
                      value={ioSearch}
                      onChange={(e) => setIoSearch(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  {filteredUsersForIo.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Complainant (for court/prosecution cases)</Label>
              <Select value={complainantOfficerId} onValueChange={setComplainantOfficerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select complainant officer..." />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input
                      placeholder="Search users..."
                      value={complainantSearch}
                      onChange={(e) => setComplainantSearch(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  {users
                    .filter(
                      (u) =>
                        !complainantSearch ||
                        (u.fullName ?? '').toLowerCase().includes(complainantSearch.toLowerCase()) ||
                        (u.email ?? '').toLowerCase().includes(complainantSearch.toLowerCase())
                    )
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.fullName || u.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Station where vehicle is detained</Label>
              <Select value={detentionStationId} onValueChange={setDetentionStationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select detention station..." />
                </SelectTrigger>
                <SelectContent>
                  {stations.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.code ? `(${s.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>OB No. (Occurrence Book)</Label>
              <Input
                value={obNo}
                onChange={(e) => setObNo(e.target.value)}
                placeholder="OB number"
              />
            </div>
          </TabsContent>

          <TabsContent value="manager" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Assign Case Manager <span className="text-red-500">*</span></Label>
              <Select value={caseManagerId} onValueChange={setCaseManagerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a case manager..." />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input
                      placeholder="Search users..."
                      value={caseManagerSearch}
                      onChange={(e) => setCaseManagerSearch(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  {filteredUsersForManager.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes for the case manager..."
                rows={4}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !caseManagerId ||
              !investigatingOfficerId ||
              !driverFormValues.fullNames?.trim() ||
              !driverFormValues.surname?.trim() ||
              !transporterFormValues.name?.trim()
            }
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <TrendingUp className="h-4 w-4 mr-2" />
            )}
            Escalate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
