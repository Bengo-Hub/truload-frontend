'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination, usePagination } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCanDelete } from '@/hooks/useCanDelete';
import { CargoTypeModal } from '@/components/weighing/modals/CargoTypeModal';
import { DriverModal } from '@/components/weighing/modals/DriverModal';
import { EntityModal, type ModalMode } from '@/components/weighing/modals/EntityModal';
import { OriginDestinationModal } from '@/components/weighing/modals/OriginDestinationModal';
import { TransporterModal } from '@/components/weighing/modals/TransporterModal';
import { VehicleMakeModal } from '@/components/weighing/modals/VehicleMakeModal';
import { VehicleModal } from '@/components/weighing/modals/VehicleModal';
import {
    useAxleConfigurations,
    useCargoTypes,
    useCreateCargoType,
    useCreateDriver,
    useCreateOriginDestination,
    useCreateRoad,
    useCreateTransporter,
    useCreateVehicle,
    useCreateVehicleMake,
    useDeleteCargoType,
    useDeleteDriver,
    useDeleteOriginDestination,
    useDeleteRoad,
    useDeleteTransporter,
    useDeleteVehicle,
    useDeleteVehicleMake,
    useDrivers,
    useOriginsDestinations,
    useRoadsPaged,
    useTransporters,
    useUpdateCargoType,
    useUpdateDriver,
    useUpdateOriginDestination,
    useUpdateRoad,
    useUpdateTransporter,
    useUpdateVehicle,
    useUpdateVehicleMake,
    useVehicleMakes,
} from '@/hooks/queries';
import type { Transporter as TransporterView } from '@/types/weighing';
import {
    Building2,
    Eye,
    MapPin,
    Package,
    Pencil,
    Plus,
    Route as RoadIcon,
    Search,
    Trash2,
    Truck,
    UserCircle,
    Wrench,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useModuleAccess } from '@/hooks/useModuleAccess';

const ALL_TABS = ['transporters', 'drivers', 'vehicles', 'cargo-types', 'origins', 'roads', 'makes'] as const;
// Roads are enforcement-specific (road acts, axle limits by road class); all other tabs apply to commercial too
const COMMERCIAL_TABS = ['transporters', 'drivers', 'vehicles', 'cargo-types', 'origins', 'makes'] as const;

export default function WeighingMetadataPage() {
  return (
      <ProtectedRoute requiredPermissions={['config.read']}>
        <WeighingMetadataContent />
      </ProtectedRoute>
  );
}

function WeighingMetadataContent() {
  const searchParams = useSearchParams();
  const { isCommercial } = useModuleAccess();
  const VALID_TABS = isCommercial ? COMMERCIAL_TABS : ALL_TABS;
  const tabFromUrl = searchParams?.get('tab');
  const initialTab = tabFromUrl && (VALID_TABS as readonly string[]).includes(tabFromUrl)
    ? tabFromUrl
    : 'transporters';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (tabFromUrl && (VALID_TABS as readonly string[]).includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl, VALID_TABS]);

  const tabCount = VALID_TABS.length;

  return (
    <div className="w-full max-w-7xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full grid-cols-3 lg:grid-cols-${tabCount}`}>
          <TabsTrigger value="transporters" className="text-xs sm:text-sm">
            <Building2 className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
            Transporters
          </TabsTrigger>
          <TabsTrigger value="drivers" className="text-xs sm:text-sm">
            <UserCircle className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
            Drivers
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="text-xs sm:text-sm">
            <Truck className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
            Vehicles
          </TabsTrigger>
          <TabsTrigger value="cargo-types" className="text-xs sm:text-sm">
            <Package className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
            Cargo Types
          </TabsTrigger>
          <TabsTrigger value="origins" className="text-xs sm:text-sm">
            <MapPin className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
            Origins/Dest.
          </TabsTrigger>
          {!isCommercial && (
            <TabsTrigger value="roads" className="text-xs sm:text-sm">
              <RoadIcon className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
              Roads
            </TabsTrigger>
          )}
          <TabsTrigger value="makes" className="text-xs sm:text-sm">
            <Wrench className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
            Makes
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="transporters"><TransportersTab /></TabsContent>
          <TabsContent value="drivers"><DriversTab /></TabsContent>
          <TabsContent value="vehicles"><VehiclesTab /></TabsContent>
          <TabsContent value="cargo-types"><CargoTypesTab /></TabsContent>
          <TabsContent value="origins"><OriginsDestinationsTab /></TabsContent>
          {!isCommercial && <TabsContent value="roads"><RoadsTab /></TabsContent>}
          <TabsContent value="makes"><VehicleMakesTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Transporters Tab
// ============================================================================

function TransportersTab() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [selected, setSelected] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { pageNumber, pageSize, setPage, setPageSize } = usePagination(25);

  const { data: transporters, isLoading } = useTransporters(search);
  const createMutation = useCreateTransporter();
  const updateMutation = useUpdateTransporter();
  const deleteMutation = useDeleteTransporter();

  const allItems = transporters ?? [];
  const paginatedItems = useMemo(() => {
    const start = (pageNumber - 1) * pageSize;
    return allItems.slice(start, start + pageSize);
  }, [allItems, pageNumber, pageSize]);

  // Reset page on search change
  useEffect(() => { setPage(1); }, [search, setPage]);

  const openModal = (mode: ModalMode, item?: any) => {
    setModalMode(mode);
    setSelected(item ?? null);
    setModalOpen(true);
  };

  const handleSave = async (data: any) => {
    try {
      if (modalMode === 'edit' && selected?.id) {
        await updateMutation.mutateAsync({ id: selected.id, payload: data });
        toast.success('Transporter updated');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Transporter created');
      }
      setModalOpen(false);
    } catch {
      toast.error('Failed to save transporter');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('Transporter deleted');
    } catch {
      toast.error('Failed to delete transporter');
    }
    setDeleteId(null);
  };

  return (
    <>
      <MetadataCard
        title="Transporters"
        description="Manage transport companies registered in the system"
        count={allItems.length}
        onAdd={() => openModal('create')}
        search={search}
        onSearchChange={setSearch}
        paginationProps={{ page: pageNumber, pageSize, totalItems: allItems.length, onPageChange: setPage, onPageSizeChange: setPageSize, isLoading }}
      >
        {isLoading ? <TableSkeleton cols={5} /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allItems.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No transporters found</TableCell></TableRow>
              )}
              {paginatedItems.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.code || '-'}</TableCell>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{t.phone || t.phoneNumber || '-'}</TableCell>
                  <TableCell className="hidden lg:table-cell">{t.email || '-'}</TableCell>
                  <TableCell className="text-right">
                    <ActionButtons
                      onView={() => openModal('view', t)}
                      onEdit={() => openModal('edit', t)}
                      onDelete={() => setDeleteId(t.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </MetadataCard>

      <TransporterModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        transporter={selected}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        entityName="transporter"
        isDeleting={deleteMutation.isPending}
      />
    </>
  );
}

// ============================================================================
// Drivers Tab
// ============================================================================

function DriversTab() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [selected, setSelected] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { pageNumber, pageSize, setPage, setPageSize } = usePagination(25);

  const { data: drivers, isLoading } = useDrivers(search);
  const createMutation = useCreateDriver();
  const updateMutation = useUpdateDriver();
  const deleteMutation = useDeleteDriver();

  const allItems = drivers ?? [];
  const paginatedItems = useMemo(() => {
    const start = (pageNumber - 1) * pageSize;
    return allItems.slice(start, start + pageSize);
  }, [allItems, pageNumber, pageSize]);

  useEffect(() => { setPage(1); }, [search, setPage]);

  const openModal = (mode: ModalMode, item?: any) => {
    setModalMode(mode);
    setSelected(item ?? null);
    setModalOpen(true);
  };

  const handleSave = async (data: any) => {
    try {
      if (modalMode === 'edit' && selected?.id) {
        await updateMutation.mutateAsync({ id: selected.id, payload: data });
        toast.success('Driver updated');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Driver created');
      }
      setModalOpen(false);
    } catch {
      toast.error('Failed to save driver');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('Driver deleted');
    } catch {
      toast.error('Failed to delete driver');
    }
    setDeleteId(null);
  };

  return (
    <>
      <MetadataCard
        title="Drivers"
        description="Manage registered drivers and their license information"
        count={allItems.length}
        onAdd={() => openModal('create')}
        search={search}
        onSearchChange={setSearch}
        paginationProps={{ page: pageNumber, pageSize, totalItems: allItems.length, onPageChange: setPage, onPageSizeChange: setPageSize, isLoading }}
      >
        {isLoading ? <TableSkeleton cols={5} /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">License No.</TableHead>
                <TableHead className="hidden md:table-cell">ID Number</TableHead>
                <TableHead className="hidden lg:table-cell">Phone</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {search ? 'No drivers match your search.' : 'No drivers yet. Click Add to register a driver.'}
                  </TableCell>
                </TableRow>
              )}
              {paginatedItems.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.fullNames} {d.surname}</TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-xs">{d.drivingLicenseNo || '-'}</TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-xs">{d.idNumber || '-'}</TableCell>
                  <TableCell className="hidden lg:table-cell">{d.phoneNumber || '-'}</TableCell>
                  <TableCell className="text-right">
                    <ActionButtons
                      onView={() => openModal('view', d)}
                      onEdit={() => openModal('edit', d)}
                      onDelete={() => setDeleteId(d.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </MetadataCard>

      <DriverModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        driver={selected}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        entityName="driver"
        isDeleting={deleteMutation.isPending}
      />
    </>
  );
}

// ============================================================================
// Vehicles Tab
// ============================================================================

function VehiclesTab() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [selected, setSelected] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { pageNumber, pageSize, setPage, setPageSize } = usePagination(25);

  const { data: vehicleResults, isLoading } = useVehicleSearch(search);
  const { data: transportersList } = useTransporters();
  const { data: axleConfigsList } = useAxleConfigurations();
  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();
  const deleteMutation = useDeleteVehicle();

  const allItems = vehicleResults ?? [];
  const paginatedItems = useMemo(() => {
    const start = (pageNumber - 1) * pageSize;
    return allItems.slice(start, start + pageSize);
  }, [allItems, pageNumber, pageSize]);

  useEffect(() => { setPage(1); }, [search, setPage]);

  const openModal = (mode: ModalMode, item?: any) => {
    setModalMode(mode);
    setSelected(item ?? null);
    setModalOpen(true);
  };

  const handleSave = async (data: any) => {
    try {
      if (modalMode === 'edit' && selected?.id) {
        await updateMutation.mutateAsync({ id: selected.id, payload: data });
        toast.success('Vehicle updated');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Vehicle created');
      }
      setModalOpen(false);
    } catch {
      toast.error('Failed to save vehicle');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('Vehicle deleted');
    } catch {
      toast.error('Failed to delete vehicle');
    }
    setDeleteId(null);
  };

  return (
    <>
      <MetadataCard
        title="Vehicles"
        description="Manage registered vehicles and their configurations"
        count={allItems.length}
        onAdd={() => openModal('create')}
        search={search}
        onSearchChange={setSearch}
        paginationProps={{ page: pageNumber, pageSize, totalItems: allItems.length, onPageChange: setPage, onPageSizeChange: setPageSize, isLoading }}
      >
        {isLoading ? <TableSkeleton cols={5} /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reg. No.</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden md:table-cell">Make/Model</TableHead>
                <TableHead className="hidden lg:table-cell">Tare (kg)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {search ? 'No vehicles match your search.' : 'No vehicles yet. Click Add to register a vehicle.'}
                  </TableCell>
                </TableRow>
              )}
              {paginatedItems.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono font-medium">{v.regNo}</TableCell>
                  <TableCell className="hidden md:table-cell">{v.vehicleType || '-'}</TableCell>
                  <TableCell className="hidden md:table-cell">{v.makeModel || '-'}</TableCell>
                  <TableCell className="hidden lg:table-cell">{v.tareWeight ? `${v.tareWeight.toLocaleString()} kg` : '-'}</TableCell>
                  <TableCell className="text-right">
                    <ActionButtons
                      onView={() => openModal('view', v)}
                      onEdit={() => openModal('edit', v)}
                      onDelete={() => setDeleteId(v.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </MetadataCard>

      <VehicleModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        vehicle={selected}
        transporters={(transportersList ?? []) as TransporterView[]}
        axleConfigurations={axleConfigsList ?? []}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        entityName="vehicle"
        isDeleting={deleteMutation.isPending}
      />
    </>
  );
}

// ============================================================================
// Cargo Types Tab
// ============================================================================

function CargoTypesTab() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [selected, setSelected] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { pageNumber, pageSize, setPage, setPageSize } = usePagination(25);

  const { data: cargoTypes, isLoading } = useCargoTypes();
  const createMutation = useCreateCargoType();
  const updateMutation = useUpdateCargoType();
  const deleteMutation = useDeleteCargoType();

  const filtered = useMemo(() => {
    if (!cargoTypes || !search) return cargoTypes ?? [];
    const q = search.toLowerCase();
    return cargoTypes.filter((c: any) =>
      c.name?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q)
    );
  }, [cargoTypes, search]);

  const paginatedItems = useMemo(() => {
    const start = (pageNumber - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageNumber, pageSize]);

  useEffect(() => { setPage(1); }, [search, setPage]);

  const openModal = (mode: ModalMode, item?: any) => {
    setModalMode(mode);
    setSelected(item ?? null);
    setModalOpen(true);
  };

  const handleSave = async (data: any) => {
    try {
      if (modalMode === 'edit' && selected?.id) {
        await updateMutation.mutateAsync({ id: selected.id, payload: data });
        toast.success('Cargo type updated');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Cargo type created');
      }
      setModalOpen(false);
    } catch {
      toast.error('Failed to save cargo type');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('Cargo type deleted');
    } catch {
      toast.error('Failed to delete cargo type');
    }
    setDeleteId(null);
  };

  return (
    <>
      <MetadataCard
        title="Cargo Types"
        description="Manage types of cargo/goods transported"
        count={filtered.length}
        onAdd={() => openModal('create')}
        search={search}
        onSearchChange={setSearch}
        paginationProps={{ page: pageNumber, pageSize, totalItems: filtered.length, onPageChange: setPage, onPageSizeChange: setPageSize, isLoading }}
      >
        {isLoading ? <TableSkeleton cols={4} /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No cargo types found</TableCell></TableRow>
              )}
              {paginatedItems.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.code || '-'}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{c.description || '-'}</TableCell>
                  <TableCell className="text-right">
                    <ActionButtons
                      onView={() => openModal('view', c)}
                      onEdit={() => openModal('edit', c)}
                      onDelete={() => setDeleteId(c.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </MetadataCard>

      <CargoTypeModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        cargoType={selected}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        entityName="cargo type"
        isDeleting={deleteMutation.isPending}
      />
    </>
  );
}

// ============================================================================
// Origins/Destinations Tab
// ============================================================================

function OriginsDestinationsTab() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [selected, setSelected] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { pageNumber, pageSize, setPage, setPageSize } = usePagination(25);

  const { data: origDests, isLoading } = useOriginsDestinations();
  const createMutation = useCreateOriginDestination();
  const updateMutation = useUpdateOriginDestination();
  const deleteMutation = useDeleteOriginDestination();

  const filtered = useMemo(() => {
    if (!origDests || !search) return origDests ?? [];
    const q = search.toLowerCase();
    return origDests.filter((o: any) =>
      o.name?.toLowerCase().includes(q) || o.code?.toLowerCase().includes(q) || o.country?.toLowerCase().includes(q)
    );
  }, [origDests, search]);

  const paginatedItems = useMemo(() => {
    const start = (pageNumber - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageNumber, pageSize]);

  useEffect(() => { setPage(1); }, [search, setPage]);

  const openModal = (mode: ModalMode, item?: any) => {
    setModalMode(mode);
    setSelected(item ?? null);
    setModalOpen(true);
  };

  const handleSave = async (data: any) => {
    try {
      if (modalMode === 'edit' && selected?.id) {
        await updateMutation.mutateAsync({ id: selected.id, payload: data });
        toast.success('Origin/destination updated');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Origin/destination created');
      }
      setModalOpen(false);
    } catch {
      toast.error('Failed to save origin/destination');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('Origin/destination deleted');
    } catch {
      toast.error('Failed to delete origin/destination');
    }
    setDeleteId(null);
  };

  return (
    <>
      <MetadataCard
        title="Origins & Destinations"
        description="Manage cargo origin and destination locations"
        count={filtered.length}
        onAdd={() => openModal('create')}
        search={search}
        onSearchChange={setSearch}
        paginationProps={{ page: pageNumber, pageSize, totalItems: filtered.length, onPageChange: setPage, onPageSizeChange: setPageSize, isLoading }}
      >
        {isLoading ? <TableSkeleton cols={4} /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Country</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No origins/destinations found</TableCell></TableRow>
              )}
              {paginatedItems.map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.code || '-'}</TableCell>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{o.country || '-'}</TableCell>
                  <TableCell className="text-right">
                    <ActionButtons
                      onView={() => openModal('view', o)}
                      onEdit={() => openModal('edit', o)}
                      onDelete={() => setDeleteId(o.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </MetadataCard>

      <OriginDestinationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        location={selected}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        entityName="origin/destination"
        isDeleting={deleteMutation.isPending}
      />
    </>
  );
}

// ============================================================================
// Roads Tab (server-side pagination, default page size 50)
// ============================================================================

function RoadsTab() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [selected, setSelected] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { pageNumber, pageSize, setPage, setPageSize } = usePagination(50);

  const { data: paged, isLoading } = useRoadsPaged({
    pageNumber,
    pageSize,
    search: search.trim() || undefined,
    includeInactive: false,
  });
  const createMutation = useCreateRoad();
  const updateMutation = useUpdateRoad();
  const deleteMutation = useDeleteRoad();

  const items = paged?.items ?? [];
  const totalCount = paged?.totalCount ?? 0;

  const openModal = (mode: ModalMode, item?: any) => {
    setModalMode(mode);
    setSelected(item ?? null);
    setModalOpen(true);
  };

  const handleSave = async (data: { code: string; name: string; roadClass: string }) => {
    try {
      if (modalMode === 'edit' && selected?.id) {
        await updateMutation.mutateAsync({ id: selected.id, data });
        toast.success('Road updated');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Road created');
      }
      setModalOpen(false);
    } catch {
      toast.error('Failed to save road');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('Road deleted');
    } catch {
      toast.error('Failed to delete road');
    }
    setDeleteId(null);
  };

  return (
    <>
      <MetadataCard
        title="Roads"
        description="Manage roads for weighing location (Traffic Act / EAC). Used on weight tickets."
        count={totalCount}
        onAdd={() => openModal('create')}
        search={search}
        onSearchChange={setSearch}
        paginationProps={{
          page: pageNumber,
          pageSize,
          totalItems: totalCount,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
          isLoading,
        }}
      >
        {isLoading ? (
          <TableSkeleton cols={4} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Class</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No roads found
                  </TableCell>
                </TableRow>
              )}
              {items.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.code ?? '-'}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{r.roadClass ?? '-'}</TableCell>
                  <TableCell className="text-right">
                    <ActionButtons
                      onView={() => openModal('view', r)}
                      onEdit={() => openModal('edit', r)}
                      onDelete={() => setDeleteId(r.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </MetadataCard>

      <RoadModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        road={selected}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        entityName="road"
        isDeleting={deleteMutation.isPending}
      />
    </>
  );
}

function RoadModal({
  open,
  onOpenChange,
  mode,
  road,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ModalMode;
  road: any;
  onSave: (data: { code: string; name: string; roadClass: string }) => Promise<void>;
  isSaving: boolean;
}) {
  const [code, setCode] = useState(road?.code ?? '');
  const [name, setName] = useState(road?.name ?? '');
  const [roadClass, setRoadClass] = useState(road?.roadClass ?? 'A');

  useEffect(() => {
    if (road && (mode === 'edit' || mode === 'view')) {
      setCode(road.code ?? '');
      setName(road.name ?? '');
      setRoadClass(road.roadClass ?? 'A');
    } else if (mode === 'create') {
      setCode('');
      setName('');
      setRoadClass('A');
    }
  }, [road, mode]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (mode === 'view') return;
    onSave({ code: code.trim(), name: name.trim(), roadClass });
  };

  const isViewMode = mode === 'view';

  return (
    <EntityModal
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      title="Road"
      description={mode === 'create' ? 'Add a new road (weighing location)' : undefined}
      onSave={handleSubmit}
      isSaving={isSaving}
      isValid={!!(code.trim() && name.trim())}
      maxWidth="md"
    >
      <form id="road-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Code <span className="text-red-500">*</span></Label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. A109" disabled={isViewMode} />
        </div>
        <div className="space-y-2">
          <Label>Name <span className="text-red-500">*</span></Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Langata Road" disabled={isViewMode} />
        </div>
        <div className="space-y-2">
          <Label>Road Class</Label>
          <Select value={roadClass} onValueChange={setRoadClass} disabled={isViewMode}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['A', 'B', 'C', 'D', 'E'].map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </form>
    </EntityModal>
  );
}

// ============================================================================
// Vehicle Makes Tab
// ============================================================================

function VehicleMakesTab() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [selected, setSelected] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { pageNumber, pageSize, setPage, setPageSize } = usePagination(25);

  const { data: makes, isLoading } = useVehicleMakes();
  const createMutation = useCreateVehicleMake();
  const updateMutation = useUpdateVehicleMake();
  const deleteMutation = useDeleteVehicleMake();

  const filtered = useMemo(() => {
    if (!makes || !search) return makes ?? [];
    const q = search.toLowerCase();
    return makes.filter((m: any) =>
      m.name?.toLowerCase().includes(q) || m.code?.toLowerCase().includes(q)
    );
  }, [makes, search]);

  const paginatedItems = useMemo(() => {
    const start = (pageNumber - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageNumber, pageSize]);

  useEffect(() => { setPage(1); }, [search, setPage]);

  const openModal = (mode: ModalMode, item?: any) => {
    setModalMode(mode);
    setSelected(item ?? null);
    setModalOpen(true);
  };

  const handleSave = async (data: any) => {
    try {
      if (modalMode === 'edit' && selected?.id) {
        await updateMutation.mutateAsync({ id: selected.id, payload: data });
        toast.success('Vehicle make updated');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Vehicle make created');
      }
      setModalOpen(false);
    } catch {
      toast.error('Failed to save vehicle make');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('Vehicle make deleted');
    } catch {
      toast.error('Failed to delete vehicle make');
    }
    setDeleteId(null);
  };

  return (
    <>
      <MetadataCard
        title="Vehicle Makes"
        description="Manage vehicle manufacturer brands"
        count={filtered.length}
        onAdd={() => openModal('create')}
        search={search}
        onSearchChange={setSearch}
        paginationProps={{ page: pageNumber, pageSize, totalItems: filtered.length, onPageChange: setPage, onPageSizeChange: setPageSize, isLoading }}
      >
        {isLoading ? <TableSkeleton cols={3} /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Country of Origin</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No vehicle makes found</TableCell></TableRow>
              )}
              {paginatedItems.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{m.country || '-'}</TableCell>
                  <TableCell className="text-right">
                    <ActionButtons
                      onView={() => openModal('view', m)}
                      onEdit={() => openModal('edit', m)}
                      onDelete={() => setDeleteId(m.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </MetadataCard>

      <VehicleMakeModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        make={selected}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        entityName="vehicle make"
        isDeleting={deleteMutation.isPending}
      />
    </>
  );
}

// ============================================================================
// Shared Components
// ============================================================================

function MetadataCard({
  title,
  description,
  count,
  onAdd,
  search,
  onSearchChange,
  children,
  paginationProps,
}: {
  title: string;
  description: string;
  count?: number;
  onAdd: () => void;
  search: string;
  onSearchChange: (v: string) => void;
  children: React.ReactNode;
  paginationProps?: {
    page: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    isLoading?: boolean;
  };
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {title}
              {count !== undefined && (
                <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {count}
                </span>
              )}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button size="sm" onClick={onAdd}>
              <Plus className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Add New</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {children}
        {paginationProps && paginationProps.totalItems > 0 && (
          <div className="border-t mt-4 pt-3">
            <Pagination
              page={paginationProps.page}
              pageSize={paginationProps.pageSize}
              totalItems={paginationProps.totalItems}
              onPageChange={paginationProps.onPageChange}
              onPageSizeChange={paginationProps.onPageSizeChange}
              pageSizeOptions={[10, 25, 50]}
              isLoading={paginationProps.isLoading}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActionButtons({
  onView,
  onEdit,
  onDelete,
}: {
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const canDelete = useCanDelete();
  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onView} title="View">
        <Eye className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} title="Edit">
        <Pencil className="h-4 w-4" />
      </Button>
      {canDelete && (
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete} title="Delete">
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  entityName,
  isDeleting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  entityName: string;
  isDeleting: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {entityName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete this {entityName} from the system.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Vehicle Search Hook (local, uses API directly)
// ============================================================================

import { searchVehicles } from '@/lib/api/weighing';
import { QUERY_OPTIONS } from '@/lib/query/config';
import { useQuery } from '@tanstack/react-query';

function useVehicleSearch(query: string) {
  return useQuery({
    queryKey: ['vehicles', 'search', query],
    queryFn: () => searchVehicles(query),
    ...QUERY_OPTIONS.dynamic,
    enabled: query.length >= 2,
  });
}
