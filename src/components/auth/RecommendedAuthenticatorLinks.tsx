'use client';

/**
 * Recommended authenticator app (Google Authenticator) with download links for Play Store and App Store.
 * Use on 2FA setup flows (e.g. profile enable 2FA).
 */

const GOOGLE_AUTH_PLAY =
  'https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2';
const GOOGLE_AUTH_APPLE = 'https://apps.apple.com/app/google-authenticator/id388497605';

export function RecommendedAuthenticatorLinks() {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
      <p className="text-sm font-medium text-emerald-800">
        Recommended: Google Authenticator
      </p>
      <p className="text-xs text-emerald-700">
        Install the app, then scan the QR code below with it.
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href={GOOGLE_AUTH_PLAY}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-900 underline"
        >
          Get on Google Play
        </a>
        <span className="text-emerald-400">|</span>
        <a
          href={GOOGLE_AUTH_APPLE}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-900 underline"
        >
          Get on App Store
        </a>
      </div>
    </div>
  );
}
