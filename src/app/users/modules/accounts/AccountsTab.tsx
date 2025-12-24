"use client";

import { useHasPermission } from '@/hooks/useAuth';
import { assignRoles, deleteUser, fetchDepartments, fetchOrganizations, fetchRoles, fetchStations, fetchUsers, updateUser } from '@/lib/api/setup';
import type { DepartmentDto, OrganizationDto, RoleDto, StationDto, UpdateUserRequest, UserSummary } from '@/types/setup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Edit2, RefreshCcw, ShieldCheck, Trash, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AccountsTab() {
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const canEdit = useHasPermission('user.update');
  const canDelete = useHasPermission('user.delete');
  const canAssignRoles = useHasPermission('system.manage_roles');
  const queryClient = useQueryClient();

  const { data: usersResult, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: () => fetchUsers({ search, take: 100 }),
  });

  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: () => fetchRoles() });
  const { data: orgs = [] } = useQuery({ queryKey: ['orgs'], queryFn: () => fetchOrganizations() });
  const { data: stations = [] } = useQuery({ queryKey: ['stations'], queryFn: () => fetchStations() });
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: () => fetchDepartments() });

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; payload: UpdateUserRequest }) => updateUser(input.id, input.payload),
    onSuccess: () => {
      toast.success('User updated');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDialogOpen(false);
    },
    onError: () => toast.error('Failed to update user'),
  });

  const assignRolesMutation = useMutation({
    mutationFn: (input: { id: string; roleNames: string[] }) => assignRoles(input.id, { roleNames: input.roleNames }),
    onSuccess: () => {
      toast.success('Roles updated');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => toast.error('Failed to assign roles'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      toast.success('User deleted');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => toast.error('Failed to delete user'),
  });

  const users = usersResult?.data ?? [];

  const handleEdit = (user: UserSummary) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleDelete = (user: UserSummary) => {
    if (!canDelete) return;
    const confirmed = window.confirm(`Delete ${user.email}?`);
    if (!confirmed) return;
    deleteMutation.mutate(user.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Input placeholder="Search by name, email, phone" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
          <Button variant="outline" size="icon" onClick={() => queryClient.invalidateQueries({ queryKey: ['users'] })}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 text-sm font-medium text-gray-700">
          <Users className="h-4 w-4" />
          {usersResult ? `${usersResult.total} users` : 'Users'}
        </div>
        <ScrollArea className="max-h-[70vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Station</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-gray-500">Loading users...</TableCell>
                </TableRow>
              )}
              {!isLoading && users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-gray-500">No users found.</TableCell>
                </TableRow>
              )}
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.fullName ?? '—'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles?.map((role) => (
                        <span key={role} className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">{role}</span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{user.organizationName ?? '—'}</TableCell>
                  <TableCell>{user.stationName ?? '—'}</TableCell>
                  <TableCell>{user.lastLoginAt ? format(new Date(user.lastLoginAt), 'dd MMM yyyy HH:mm') : '—'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {canEdit && (
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(user)}>
                        <Edit2 className="mr-1 h-4 w-4" />Edit
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(user)}>
                        <Trash className="mr-1 h-4 w-4" />Delete
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      <EditUserDialog
        user={selectedUser}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        roles={roles}
        orgs={orgs}
        stations={stations}
        departments={departments}
        canEdit={canEdit}
        canAssignRoles={canAssignRoles}
        onSave={async (payload) => { if (!selectedUser) return; await updateMutation.mutateAsync({ id: selectedUser.id, payload }); }}
        onAssignRoles={async (roleNames) => { if (!selectedUser) return; await assignRolesMutation.mutateAsync({ id: selectedUser.id, roleNames }); }}
      />
    </div>
  );
}

interface EditDialogProps {
  user: UserSummary | null;
  roles: RoleDto[];
  orgs: OrganizationDto[];
  stations: StationDto[];
  departments: DepartmentDto[];
  open: boolean;
  onClose: () => void;
  onSave: (payload: UpdateUserRequest) => Promise<void>;
  onAssignRoles: (roleNames: string[]) => Promise<void>;
  canEdit: boolean;
  canAssignRoles: boolean;
}

function EditUserDialog({ user, roles, orgs, stations, departments, open, onClose, onSave, onAssignRoles, canEdit, canAssignRoles }: EditDialogProps) {
  const { register, handleSubmit, control, reset, formState: { isSubmitting } } = useForm<UpdateUserRequest>({
    defaultValues: {
      fullName: user?.fullName ?? '',
      phoneNumber: user?.phoneNumber ?? '',
      organizationId: user?.organizationId,
      stationId: user?.stationId,
      departmentId: user?.departmentId,
    },
  });

  const [selectedRoles, setSelectedRoles] = useState<string[]>(user?.roles ?? []);

  useEffect(() => {
    if (user) {
      reset({ fullName: user.fullName ?? '', phoneNumber: user.phoneNumber ?? '', organizationId: user.organizationId, stationId: user.stationId, departmentId: user.departmentId });
      setSelectedRoles(user.roles ?? []);
    }
  }, [reset, user]);

  const onSubmit = async (payload: UpdateUserRequest) => { if (!user) return; await onSave(payload); };
  const handleAssignRoles = async () => { if (!user) return; await onAssignRoles(selectedRoles); };

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>Update profile and role assignments.</DialogDescription>
        </DialogHeader>

        {user ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" placeholder="Jane Doe" {...register('fullName')} disabled={!canEdit} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input id="phone" placeholder="07xx xxx xxx" {...register('phoneNumber')} disabled={!canEdit} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organization">Organization</Label>
                <Controller name="organizationId" control={control} render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange} disabled={!canEdit}>
                    <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                    <SelectContent>{orgs.map((org) => (<SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>))}</SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="station">Station</Label>
                <Controller name="stationId" control={control} render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange} disabled={!canEdit}>
                    <SelectTrigger><SelectValue placeholder="Select station" /></SelectTrigger>
                    <SelectContent>{stations.map((station) => (<SelectItem key={station.id} value={station.id}>{station.name}</SelectItem>))}</SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="department">Department</Label>
                <Controller name="departmentId" control={control} render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange} disabled={!canEdit}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>{departments.map((dept) => (<SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>))}</SelectContent>
                  </Select>
                )} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => {
                  const selected = selectedRoles.includes(role.name);
                  return (
                    <button type="button" key={role.id} onClick={() => setSelectedRoles((prev) => prev.includes(role.name) ? prev.filter((r) => r !== role.name) : [...prev, role.name])} disabled={!canAssignRoles} className={`${selected ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-700 hover:border-gray-300'} rounded-full border px-3 py-1 text-sm transition`}>
                      {role.name}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500">Click to toggle roles. Permissions are derived from roles; JWT already contains permission claims.</p>
            </div>

            <DialogFooter className="justify-between">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <div className="flex gap-2">
                {canAssignRoles && (
                  <Button type="button" variant="outline" onClick={handleAssignRoles} disabled={assignRolesDisabled(user, selectedRoles)}>
                    <ShieldCheck className="mr-1 h-4 w-4" />Save Roles
                  </Button>
                )}
                {canEdit && (<Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>)}
              </div>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function assignRolesDisabled(user: UserSummary | null, selectedRoles: string[]) {
  if (!user) return true;
  const current = user.roles ?? [];
  if (current.length !== selectedRoles.length) return false;
  return current.every((r) => selectedRoles.includes(r));
}
