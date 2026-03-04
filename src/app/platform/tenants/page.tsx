'use client';

import OrganizationsTab from '@/app/[orgSlug]/users/modules/organizations/OrganizationsTab';
import { PlatformShell } from '@/components/layout/PlatformShell';

export default function PlatformTenantsPage() {
  return (
    <PlatformShell
      title="Tenants"
      subtitle="Register and manage organisations. Only visible to superusers."
    >
      <OrganizationsTab />
    </PlatformShell>
  );
}
