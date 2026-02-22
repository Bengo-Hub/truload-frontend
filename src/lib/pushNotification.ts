/**
 * Utility for managing PWA Push Notifications.
 * Handles service worker registration and push subscription.
 */

import { apiClient as api } from './api/client';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

export const pushNotificationService = {
    /**
     * Checks if push notifications are supported and if permission is granted.
     */
    isSupported: () => {
        return 'serviceWorker' in navigator && 'PushManager' in window;
    },

    /**
     * Gets the current push subscription if it exists.
     */
    getSubscription: async () => {
        const registration = await navigator.serviceWorker.ready;
        return await registration.pushManager.getSubscription();
    },

    /**
     * Subscribes the user to push notifications.
     */
    subscribe: async () => {
        try {
            if (!pushNotificationService.isSupported()) {
                throw new Error('Push notifications are not supported in this browser.');
            }

            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                throw new Error('Push notification permission denied.');
            }

            const registration = await navigator.serviceWorker.ready;

            // Get or create subscription
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: pushNotificationService.urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
                });
            }

            // Sync with backend
            await pushNotificationService.syncSubscription(subscription);

            return subscription;
        } catch (error) {
            console.error('Failed to subscribe to push notifications:', error);
            throw error;
        }
    },

    /**
     * Unsubscribes the user from push notifications.
     */
    unsubscribe: async () => {
        try {
            const subscription = await pushNotificationService.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
                // Optionally notify backend here
            }
        } catch (error) {
            console.error('Failed to unsubscribe from push notifications:', error);
        }
    },

    /**
     * Sends the push subscription to the backend.
     */
    syncSubscription: async (subscription: PushSubscription) => {
        try {
            const subJSON = subscription.toJSON();
            const deviceName = navigator.userAgent; // Simple device identifier

            await api.post('/shared/notifications/push-subscription', {
                endpoint: subJSON.endpoint,
                keys: {
                    p256dh: subJSON.keys?.p256dh,
                    auth: subJSON.keys?.auth,
                },
                deviceName,
            });

            console.log('Push subscription synced with backend successfully.');
        } catch (error) {
            console.error('Failed to sync push subscription with backend:', error);
        }
    },

    /**
     * Helper to convert VAPID key.
     */
    urlBase64ToUint8Array: (base64String: string) => {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    },
};
