'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PlatformRootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/platform/dashboard');
  }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
    </div>
  );
}
