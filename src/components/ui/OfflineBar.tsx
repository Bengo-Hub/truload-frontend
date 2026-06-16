'use client';

/**
 * TruLoad offline/sync ribbon — thin adapter over the shared OfflineBar, wired to TruLoad's
 * Dexie offline queue (getPendingMutationCount / drainMutationQueue). The banner UI + logic live
 * in @bengo-hub/shared-ui-lib/offline so every Codevertex frontend shows the same ribbon.
 * SW registration is handled by <PWARegister> (next-pwa register:true), so registerSW is off here.
 */

import { OfflineBar as SharedOfflineBar } from '@bengo-hub/shared-ui-lib/offline';
import { getPendingMutationCount, drainMutationQueue } from '@/lib/offline/sync';

export function OfflineBar() {
  return (
    <SharedOfflineBar
      registerSW={false}
      getPendingCount={getPendingMutationCount}
      onSyncNow={() => { void drainMutationQueue(); }}
      availableOffline={['Weighing capture', 'Case recording', 'Cached records']}
      disabledOffline={['Invoice printing', 'Live reports', 'Payments']}
    />
  );
}
