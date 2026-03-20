'use client';

import { pushNotificationService } from '@/lib/pushNotification';
import { useEffect } from 'react';
import { PWAInstallPrompt } from './PWAInstallPrompt';

// Guard for debug logging - only emit console.log in development builds
const isDev = process.env.NODE_ENV === 'development';

export function PWARegister() {
  useEffect(() => {
    // Check if the app is running as a PWA
    const isRunningAsPWA = () => {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        ((window.navigator as { standalone?: boolean }).standalone === true) ||
        document.referrer.includes('android-app://')
      );
    };

    // Register service worker only in production (dev has stale cache issues)
    const isProduction = process.env.NODE_ENV === 'production';
    if ('serviceWorker' in navigator && isProduction && !isRunningAsPWA()) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          if (isDev) console.log('PWA Service Worker registered successfully:', registration);

          // Initialize push notification subscription
          pushNotificationService.subscribe().catch((err) => {
            if (isDev) console.warn('Automatic push subscription failed:', err);
          });

          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60000); // Check every minute
        })
        .catch((error) => {
          console.warn('PWA Service Worker registration failed:', error);
        });
    }

    // In development, unregister any stale service workers to avoid cache issues
    if (!isProduction && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => reg.unregister());
      });
    }

    // Handle app installed event
    const appInstalledHandler = () => {
      if (isDev) console.log('TruLoad PWA has been installed');
    };

    window.addEventListener('appinstalled', appInstalledHandler);

    return () => {
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);

  return <PWAInstallPrompt />;
}
