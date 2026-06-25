/**
 * useOfflineMutation — queues mutations to Dexie when offline,
 * executes them directly when online.
 *
 * Usage:
 *   const { mutate, isPending } = useOfflineMutation({
 *     endpoint: `/invoices/${invoiceId}/pesaflow`,
 *     method: 'POST',
 *     type: 'CREATE_INVOICE',
 *     onOnlineSuccess: (data) => { ... },
 *     onQueued: () => { ... },
 *   });
 */

'use client';

import { useCallback, useState } from 'react';
import { offlineDb, type QueuedMutation } from '@/lib/offline/db';
import { apiClient } from '@/lib/api/client';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface UseOfflineMutationOptions<TPayload, TResponse> {
  endpoint: string;
  method: QueuedMutation['method'];
  type: QueuedMutation['type'];
  onOnlineSuccess?: (data: TResponse) => void;
  onQueued?: () => void;
  onError?: (err: unknown) => void;
  transformPayload?: (payload: TPayload) => unknown;
}

export function useOfflineMutation<TPayload = unknown, TResponse = unknown>(
  options: UseOfflineMutationOptions<TPayload, TResponse>
) {
  const isOnline = useOnlineStatus();
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    async (payload: TPayload) => {
      setIsPending(true);

      const body = options.transformPayload
        ? options.transformPayload(payload)
        : payload;

      // Stable idempotency key per logical mutation — sent as a header both online and on
      // replay, so a duplicate submission returns the existing server record (Phase 1 backend).
      const idempotencyKey = crypto.randomUUID();
      const cfg = { headers: { 'Idempotency-Key': idempotencyKey } };

      try {
        if (isOnline) {
          // Execute directly
          let response: { data: TResponse };
          switch (options.method) {
            case 'POST':
              response = await apiClient.post<TResponse>(options.endpoint, body, cfg);
              break;
            case 'PUT':
              response = await apiClient.put<TResponse>(options.endpoint, body, cfg);
              break;
            case 'PATCH':
              response = await apiClient.patch<TResponse>(options.endpoint, body, cfg);
              break;
          }
          options.onOnlineSuccess?.(response!.data);
        } else {
          // Queue for later
          await offlineDb.mutationQueue.add({
            type: options.type,
            endpoint: options.endpoint,
            method: options.method,
            payload: JSON.stringify(body),
            idempotencyKey,
            createdAt: new Date().toISOString(),
            synced: false,
            attempts: 0,
          });
          options.onQueued?.();
        }
      } catch (err) {
        options.onError?.(err);
      } finally {
        setIsPending(false);
      }
    },
    [isOnline, options]
  );

  return { mutate, isPending, isOnline };
}
