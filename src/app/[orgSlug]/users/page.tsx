"use client";

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2,
  Key,
  Landmark,
  MapPin,
  Shield,
  Users,
} from 'lucide-react';
import AccountsTab from './modules/accounts/AccountsTab';
import DepartmentsTab from './modules/departments/DepartmentsTab';
import OrganizationsTab from './modules/organizations/OrganizationsTab';
import PermissionsTab from './modules/permissions/PermissionsTab';
import RolesTab from './modules/roles/RolesTab';
import StationsTab from './modules/stations/StationsTab';

export default function UsersPage() {
  return (
    <AppShell title="Users & Roles" subtitle="Manage accounts, roles, permissions, and organizational structure">
      <ProtectedRoute requiredPermissions={['user.read']}>
        <div className="space-y-6 min-w-0">
          <Tabs defaultValue="accounts" className="w-full min-w-0">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-1 overflow-x-auto">
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
              <TabsTrigger value="permissions" className="flex items-center gap-1.5">
                <Key className="h-4 w-4" />
                <span className="hidden sm:inline">Permissions</span>
                <span className="sm:hidden text-xs">Perms</span>
              </TabsTrigger>
              <TabsTrigger value="organizations" className="flex items-center gap-1.5">
                <Landmark className="h-4 w-4" />
                <span className="hidden sm:inline">Organizations</span>
                <span className="sm:hidden text-xs">Orgs</span>
              </TabsTrigger>
              <TabsTrigger value="stations" className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Stations</span>
                <span className="sm:hidden text-xs">Stations</span>
              </TabsTrigger>
              <TabsTrigger value="departments" className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Departments</span>
                <span className="sm:hidden text-xs">Depts</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="accounts"><AccountsTab /></TabsContent>
            <TabsContent value="roles"><RolesTab /></TabsContent>
            <TabsContent value="permissions"><PermissionsTab /></TabsContent>
            <TabsContent value="organizations"><OrganizationsTab /></TabsContent>
            <TabsContent value="stations"><StationsTab /></TabsContent>
            <TabsContent value="departments"><DepartmentsTab /></TabsContent>
          </Tabs>
        </div>
      </ProtectedRoute>
    </AppShell>
  );
}
