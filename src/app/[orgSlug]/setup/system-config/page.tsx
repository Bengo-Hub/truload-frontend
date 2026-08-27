'use client';

import { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * System Config has been merged into the unified Settings page.
 * This route now redirects (preserving any ?tab= deep link) so existing
 * bookmarks and links keep working.
 */
export default function SystemConfigRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const orgSlug = params?.orgSlug as string | undefined;

  useEffect(() => {
    if (!orgSlug) return;
    // Default to the Weighing tab (not Settings' own default of Branding) since that's where
    // System Config's settings (scale test, reweigh cycles, pending-weighing threshold, etc.) live.
    const tab = searchParams?.get('tab') || 'weighing';
    router.replace(`/${orgSlug}/setup/settings?tab=${encodeURIComponent(tab)}`);
  }, [orgSlug, searchParams, router]);

  return (
    <div className="flex items-center justify-center py-24 text-muted-foreground">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      Redirecting to Settings…
    </div>
  );
}
