'use client';

import OrganizationsTab from '@/app/[orgSlug]/users/modules/organizations/OrganizationsTab';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ModuleAccessTab } from '@/components/settings/ModuleAccessTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { Lock } from 'lucide-react';

export default function TenantsPage() {
  return (
      <ProtectedRoute requiredPermissions={['config.read']}>
        <TenantsContent />
      </ProtectedRoute>
  );
}

function TenantsContent() {
  const { user } = useAuth();
  const isPlatformOwner = user?.isSuperUser === true;

  if (!isPlatformOwner) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <Lock className="h-4 w-4 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800">Tenant management is restricted to platform administrators.</p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="organizations" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="organizations">Organizations</TabsTrigger>
        <TabsTrigger value="module-access">Module Access</TabsTrigger>
      </TabsList>
      <TabsContent value="organizations">
        <OrganizationsTab />
      </TabsContent>
      <TabsContent value="module-access">
        <ModuleAccessTab />
      </TabsContent>
    </Tabs>
  );
}
