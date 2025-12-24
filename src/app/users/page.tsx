"use client";

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AccountsTab from './modules/accounts/AccountsTab';
import DepartmentsTab from './modules/departments/DepartmentsTab';
import OrganizationsTab from './modules/organizations/OrganizationsTab';
import PermissionsTab from './modules/permissions/PermissionsTab';
import RolesTab from './modules/roles/RolesTab';
import StationsTab from './modules/stations/StationsTab';

export default function UsersPage() {
  return (
    <AppShell title="Users & Roles" subtitle="Manage accounts, roles and permissions">
      <ProtectedRoute>
        <div className="space-y-6">
          <Tabs defaultValue="accounts">
            <TabsList>
              <TabsTrigger value="accounts">Accounts</TabsTrigger>
              <TabsTrigger value="roles">Roles</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
              <TabsTrigger value="organizations">Organizations</TabsTrigger>
              <TabsTrigger value="stations">Stations</TabsTrigger>
              <TabsTrigger value="departments">Departments</TabsTrigger>
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
