'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X, Smartphone, Share } from 'lucide-react';

// localStorage keys
const DISMISS_KEY = 'truload-pwa-dismiss-time';
const INSTALLED_KEY = 'truload-pwa-installed';

// 24 hours in milliseconds
const DISMISS_COOLDOWN = 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/**
 * Detects whether the current browser is Safari on iOS/iPadOS.
 * iOS Safari does not fire the `beforeinstallprompt` event so we need
 * to show manual instructions instead.
 */
function getIsIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return (
    (/iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream) ||
    // iPadOS 13+ reports itself as macOS in the UA string
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Returns true when the app is already running in standalone / PWA mode.
 */
function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Returns true when the user is on a mobile device (used to decide
 * between the compact desktop banner and the full-width mobile banner).
 */
function getIsMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // ---------------------------------------------------------------
  // Determine whether the banner should be visible at all
  // ---------------------------------------------------------------
  const shouldShowBanner = useCallback((): boolean => {
    // Already installed — never bother the user
    if (localStorage.getItem(INSTALLED_KEY) === 'true') return false;

    // Already running as a PWA
    if (isRunningStandalone()) return false;

    // Dismissed recently — respect the 24-hour cooldown
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - Number(dismissedAt);
      if (elapsed < DISMISS_COOLDOWN) return false;
    }

    return true;
  }, []);

  // ---------------------------------------------------------------
  // Bootstrap: register event listeners, detect platform
  // ---------------------------------------------------------------
  useEffect(() => {
    setIsIOS(getIsIOS());
    setIsMobile(getIsMobile());

    // Re-evaluate mobile flag on resize
    const handleResize = () => setIsMobile(getIsMobile());
    window.addEventListener('resize', handleResize);

    // Capture the beforeinstallprompt event (Chrome / Edge / Samsung / etc.)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (shouldShowBanner()) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Mark as installed when the browser confirms installation
    const handleAppInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, 'true');
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // For iOS there is no beforeinstallprompt, so show the banner
    // immediately if conditions are met
    if (getIsIOS() && shouldShowBanner()) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [shouldShowBanner]);

  // ---------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      localStorage.setItem(INSTALLED_KEY, 'true');
      setShowBanner(false);
    }

    // The prompt can only be used once
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShowBanner(false);
    setShowIOSInstructions(false);
  };

  // ---------------------------------------------------------------
  // Nothing to render
  // ---------------------------------------------------------------
  if (!showBanner) return null;

  // ---------------------------------------------------------------
  // iOS-specific instructions (Safari share -> Add to Home Screen)
  // ---------------------------------------------------------------
  if (isIOS) {
    return (
      <div className="fixed bottom-0 inset-x-0 z-[90] p-3 sm:p-4 animate-in slide-in-from-bottom duration-500">
        <Card className="mx-auto max-w-lg border-0 shadow-2xl bg-[#0a9f3d] text-white">
          <CardContent className="p-4">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm leading-tight">
                    Install TruLoad App
                  </p>
                  <p className="text-xs text-white/80 mt-0.5">
                    Get the full app experience on your device
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="shrink-0 rounded-full p-1 hover:bg-white/20 transition-colors"
                aria-label="Dismiss install prompt"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Instructions toggle */}
            {!showIOSInstructions ? (
              <Button
                onClick={() => setShowIOSInstructions(true)}
                className="mt-3 w-full bg-white text-[#0a9f3d] hover:bg-white/90 font-semibold"
                size="sm"
              >
                <Download className="h-4 w-4 mr-1" />
                Show Me How
              </Button>
            ) : (
              <div className="mt-3 space-y-2.5 rounded-lg bg-white/15 p-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/25 text-xs font-bold">
                    1
                  </span>
                  <p className="leading-snug">
                    Tap the <Share className="inline h-4 w-4 -mt-0.5 mx-0.5" />{' '}
                    <strong>Share</strong> button in Safari&apos;s toolbar
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/25 text-xs font-bold">
                    2
                  </span>
                  <p className="leading-snug">
                    Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/25 text-xs font-bold">
                    3
                  </span>
                  <p className="leading-snug">
                    Tap <strong>&ldquo;Add&rdquo;</strong> to install TruLoad
                  </p>
                </div>
                <Button
                  onClick={handleDismiss}
                  variant="ghost"
                  size="sm"
                  className="mt-1 w-full text-white/80 hover:text-white hover:bg-white/10"
                >
                  Got it, thanks!
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------
  // Mobile banner (full-width, more prominent)
  // ---------------------------------------------------------------
  if (isMobile) {
    return (
      <div className="fixed bottom-0 inset-x-0 z-[90] animate-in slide-in-from-bottom duration-500">
        <div className="bg-[#0a9f3d] text-white px-4 py-4 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
                <Smartphone className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-base leading-tight">
                  Install TruLoad
                </p>
                <p className="text-xs text-white/80 mt-0.5 truncate">
                  Faster access &middot; Works offline &middot; Home screen icon
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="shrink-0 rounded-full p-1.5 hover:bg-white/20 transition-colors"
              aria-label="Dismiss install prompt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              onClick={handleInstallClick}
              className="flex-1 bg-white text-[#0a9f3d] hover:bg-white/90 font-semibold"
              size="default"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Install Now
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="default"
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              Not Now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------
  // Desktop banner (compact card at bottom-right)
  // ---------------------------------------------------------------
  return (
    <div className="fixed bottom-4 right-4 z-[90] animate-in slide-in-from-bottom-4 duration-500">
      <Card className="w-80 border-0 shadow-2xl bg-[#0a9f3d] text-white">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm leading-tight">
                  Install TruLoad
                </p>
                <p className="text-xs text-white/80 mt-0.5">
                  Quick access from your desktop
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="shrink-0 rounded-full p-1 hover:bg-white/20 transition-colors"
              aria-label="Dismiss install prompt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              onClick={handleInstallClick}
              className="flex-1 bg-white text-[#0a9f3d] hover:bg-white/90 font-semibold"
              size="sm"
            >
              <Download className="h-4 w-4 mr-1" />
              Install
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
