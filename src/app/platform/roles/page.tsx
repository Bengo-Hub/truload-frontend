'use client';

import PermissionsTab from '@/app/[orgSlug]/users/modules/permissions/PermissionsTab';
import RolesTab from '@/app/[orgSlug]/users/modules/roles/RolesTab';
import { PlatformShell } from '@/components/layout/PlatformShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Key, Shield } from 'lucide-react';

export default function PlatformRolesPage() {
  return (
    <PlatformShell
      title="Platform roles & permissions"
      subtitle="Manage roles and system-sensitive permissions. Only visible to superusers."
    >
      <Tabs defaultValue="roles" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <Key className="h-4 w-4" />
            Permissions
          </TabsTrigger>
        </TabsList>
        <TabsContent value="roles" className="mt-6">
          <RolesTab />
        </TabsContent>
        <TabsContent value="permissions" className="mt-6">
          <PermissionsTab />
        </TabsContent>
      </Tabs>
    </PlatformShell>
  );
}
