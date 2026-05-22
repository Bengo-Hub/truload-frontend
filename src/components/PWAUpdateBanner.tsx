'use client';

import { usePWAUpdate } from '@/hooks/use-pwa-update';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';
import { useState } from 'react';

export function PWAUpdateBanner() {
  const { updateAvailable, applyUpdate } = usePWAUpdate();
  const [dismissed, setDismissed] = useState(false);

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[100] bg-[#5B1C4D] text-white px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg animate-in slide-in-from-top duration-500">
      <div className="flex items-center gap-2 text-sm font-medium">
        <RefreshCw className="h-4 w-4 shrink-0" />
        <span>A new version of TruLoad is available</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          onClick={applyUpdate}
          className="bg-white text-[#5B1C4D] hover:bg-white/90 h-7 px-3 text-xs font-semibold"
        >
          Update Now
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-full p-0.5 hover:bg-white/20 transition-colors"
          aria-label="Dismiss update notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
