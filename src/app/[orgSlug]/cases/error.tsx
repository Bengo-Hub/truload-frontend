'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';

export default function CasesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Cases error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8">
      <AlertTriangle className="h-12 w-12 text-amber-500" />
      <h2 className="text-xl font-semibold">Failed to load cases</h2>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        {error.message || 'An error occurred while loading case data.'}
      </p>
      <Button onClick={reset} className="bg-emerald-600 hover:bg-emerald-700">
        Retry
      </Button>
    </div>
  );
}
