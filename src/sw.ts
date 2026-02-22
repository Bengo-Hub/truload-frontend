/// <reference lib="webworker" />

import { defaultCache } from "@ducanh2912/next-pwa/worker";

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

// Default caching from next-pwa
// @ts-ignore
const _cache = defaultCache;

self.addEventListener("push", (event: any) => {
    const data = event.data?.json();
    if (!data) return;

    const title = data.title || "TruLoad Notification";
    const options = {
        body: data.body || "You have a new update from TruLoad.",
        icon: "/icon-192x192.png",
        badge: "/icon-192x192.png",
        data: data.data || {},
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: any) => {
    event.notification.close();

    // Custom click logic (e.g., navigate to a specific URL)
    const urlToOpen = event.notification.data?.url || "/";

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList: any[]) => {
            for (const client of clientList) {
                if (client.url === urlToOpen && "focus" in client) {
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        }),
    );
});
