'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SetupIndexPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = (params?.orgSlug as string) ?? 'kura';
  useEffect(() => {
    router.replace(`/${orgSlug}/setup/security`);
  }, [orgSlug, router]);
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
    </div>
  );
}
