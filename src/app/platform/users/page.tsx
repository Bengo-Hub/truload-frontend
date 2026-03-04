'use client';

import AccountsTab from '@/app/[orgSlug]/users/modules/accounts/AccountsTab';
import { PlatformShell } from '@/components/layout/PlatformShell';

export default function PlatformUsersPage() {
  return (
    <PlatformShell
      title="Platform users"
      subtitle="Manage user accounts including system roles. Only visible to superusers."
    >
      <AccountsTab />
    </PlatformShell>
  );
}
