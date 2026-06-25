/// <reference lib="webworker" />

// @ts-ignore -- no type declarations for next-pwa worker module
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

// ── Background sync (resume the offline queue without the user reopening the app) ──
// On a 'sync'/'periodicsync' wake-up: if an app window is open, hand off to it (the page drains
// with the well-tested axios engine); if NOT (app fully closed → truly headless), drain in the
// SW with the fetch-based poster, reading auth/tenant from cookies.
const SYNC_TAG = "truload-sync";

async function runBackgroundSync(): Promise<void> {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (clients.length > 0) {
        clients.forEach((c) => c.postMessage({ type: SYNC_TAG }));
        return;
    }
    try {
        const [{ drainMutationQueue }, { fetchPoster }] = await Promise.all([
            import("./lib/offline/sync"),
            import("./lib/offline/fetchPoster"),
        ]);
        await drainMutationQueue(fetchPoster);
    } catch {
        // Let the browser retry the sync later (it re-fires on the next connectivity window).
    }
}

self.addEventListener("sync", (event: any) => {
    if (event.tag === SYNC_TAG) event.waitUntil(runBackgroundSync());
});

self.addEventListener("periodicsync", (event: any) => {
    if (event.tag === SYNC_TAG) event.waitUntil(runBackgroundSync());
});

self.addEventListener("notificationclick", (event: any) => {
    event.notification.close();

    // Custom click logic (e.g., navigate to a specific URL)
    const urlToOpen = event.notification.data?.url || "/";

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
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
