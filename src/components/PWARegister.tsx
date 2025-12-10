'use client';

import { useEffect } from 'react';

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

    // Register service worker only if not already running as PWA
    if ('serviceWorker' in navigator && !isRunningAsPWA()) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('PWA Service Worker registered successfully:', registration);

          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60000); // Check every minute
        })
        .catch((error) => {
          console.warn('PWA Service Worker registration failed:', error);
        });
    }

    // Handle app installed event
    const appInstalledHandler = () => {
      console.log('TruLoad PWA has been installed');
    };

    window.addEventListener('appinstalled', appInstalledHandler);

    return () => {
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);

  // No UI needed - PWA registration is automatic
  return null;
}
