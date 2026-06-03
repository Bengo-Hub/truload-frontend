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
    const tab = searchParams?.get('tab');
    const query = tab ? `?tab=${encodeURIComponent(tab)}` : '';
    router.replace(`/${orgSlug}/setup/settings${query}`);
  }, [orgSlug, searchParams, router]);

  return (
    <div className="flex items-center justify-center py-24 text-muted-foreground">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      Redirecting to Settings…
    </div>
  );
}
