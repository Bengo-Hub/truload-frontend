"use client";

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth, useHasPermission } from '@/hooks/useAuth';
import {
  Building2,
  Key,
  MapPin,
  Shield,
  Users,
} from 'lucide-react';
import AccountsTab from './modules/accounts/AccountsTab';
import DepartmentsTab from './modules/departments/DepartmentsTab';
import RolesTab from './modules/roles/RolesTab';
import StationsTab from './modules/stations/StationsTab';

export default function UsersPage() {
  return (
    <AppShell title="Users & Roles" subtitle="Manage accounts, roles, and organizational structure">
      <ProtectedRoute requiredPermissions={['user.read']}>
        <UsersPageContent />
      </ProtectedRoute>
    </AppShell>
  );
}

function UsersPageContent() {
  const { user } = useAuth();
  const isPlatformOwner = user?.isSuperUser === true;
  const canManageDepartments = useHasPermission('system.manage_departments');

  // Tenant users see: Accounts, Roles, Stations
  // Users with system.manage_departments also see: Departments
  // Platform owners also see: Permissions
  const tabCount = isPlatformOwner ? 5 : canManageDepartments ? 4 : 3;

  return (
    <div className="space-y-6 min-w-0">
      <Tabs defaultValue="accounts" className="w-full min-w-0">
        <TabsList className={`grid w-full grid-cols-3 ${isPlatformOwner ? 'sm:grid-cols-5' : canManageDepartments ? 'sm:grid-cols-4' : ''} gap-1 overflow-x-auto`}>
          <TabsTrigger value="accounts" className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Accounts</span>
            <span className="sm:hidden text-xs">Users</span>
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-1.5">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Roles</span>
            <span className="sm:hidden text-xs">Roles</span>
          </TabsTrigger>
          <TabsTrigger value="stations" className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Stations</span>
            <span className="sm:hidden text-xs">Stations</span>
          </TabsTrigger>
          {canManageDepartments && (
            <TabsTrigger value="departments" className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Departments</span>
              <span className="sm:hidden text-xs">Depts</span>
            </TabsTrigger>
          )}
          {isPlatformOwner && (
            <TabsTrigger value="permissions" className="flex items-center gap-1.5">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">Permissions</span>
              <span className="sm:hidden text-xs">Perms</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="accounts"><AccountsTab /></TabsContent>
        <TabsContent value="roles"><RolesTab /></TabsContent>
        <TabsContent value="stations"><StationsTab /></TabsContent>
        {canManageDepartments && <TabsContent value="departments"><DepartmentsTab /></TabsContent>}
        {isPlatformOwner && <TabsContent value="permissions"><RolesTab /></TabsContent>}
      </Tabs>
    </div>
  );
}
