'use client';

/**
 * Two-column login layout aligned to frontend-figma-design/Login.tsx.
 * Left: platform logo + form. Right: login background image by default, semi-transparent tenant logo overlay (bottom-right).
 */

import { useSystemVersion } from '@/hooks/queries/useTechnicalQueries';
import { getMediaUrl } from '@/lib/api/media';
import type { PublicOrganization } from '@/lib/api/public';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

/** TruLoad default platform logo fallback (left panel). */
const DEFAULT_PLATFORM_LOGO = '/truload-logo.svg';
/** TruLoad default org logo fallback (right panel overlay). */
const DEFAULT_ORG_LOGO = '/truload-logo.svg';
const FALLBACK_ORG_LOGO = '/truload-logo.svg';
/** Default right-panel background (Figma: backgroundImage). Add public/images/login-background-image.png */
const DEFAULT_LOGIN_BACKGROUND_IMAGE = '/images/background-images/login-background-image.png';

interface LoginPageLayoutProps {
  /** Org for branding; null = use defaults */
  org: PublicOrganization | null;
  /** Left panel: form content */
  children: ReactNode;
  /** Optional subtitle under the logo (e.g. "Sign in to KURA") */
  subtitle?: ReactNode;
  /** Primary colour for button/links (from org or default) */
  primaryColor?: string;
}

export function LoginPageLayout({ org, children, subtitle, primaryColor = '#5B1C4D' }: LoginPageLayoutProps) {
  const { data: systemVersion } = useSystemVersion();
  const platformLogo = org?.platformLogoUrl || DEFAULT_PLATFORM_LOGO;
  const orgLogo = org?.logoUrl || DEFAULT_ORG_LOGO;
  const platformLogoSrc = platformLogo.startsWith('/media') ? getMediaUrl(platformLogo) : platformLogo;
  const orgLogoSrc = orgLogo.startsWith('/media') ? getMediaUrl(orgLogo) : orgLogo;
  // Use tenant login background image if available, otherwise fall back to default
  const loginBgImage = org?.loginPageImageUrl
    ? (org.loginPageImageUrl.startsWith('/media') ? getMediaUrl(org.loginPageImageUrl) : org.loginPageImageUrl)
    : DEFAULT_LOGIN_BACKGROUND_IMAGE;
  const rightPanelStyle = {
    backgroundImage: `url(${loginBgImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundColor: primaryColor,
  };

  const tagline = 'Vehicle Weighing & Management System';

  return (
    <div className="flex min-h-screen w-full">
      {/* Left - Login form: platform logo (KURAWeigh) + tagline only, then form */}
      <div className="flex w-full flex-col items-center justify-center bg-white p-6 sm:p-8 lg:w-2/5">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-6 flex flex-col items-center justify-center">
            <Image
              src={platformLogoSrc}
              alt={org?.name ?? 'TruLoad'}
              width={280}
              height={80}
              className="h-16 w-full max-w-[280px] object-contain object-center"
              priority
              unoptimized={platformLogo.startsWith('http') || platformLogo.startsWith('/media')}
              onError={(e) => {
                (e.target as HTMLImageElement).src = DEFAULT_PLATFORM_LOGO;
              }}
            />
            <span className="mt-1 text-sm font-normal text-gray-600">{tagline}</span>
          </Link>
          {subtitle && <div className="mb-6 text-center text-sm font-medium text-gray-600">{subtitle}</div>}
          <div className="rounded-xl border-0 bg-white shadow-none">{children}</div>
          <div className="mt-8 flex flex-col items-center gap-1 text-[11px] text-gray-400">
            <p>© {new Date().getFullYear()} TruLoad. All rights reserved.</p>
            <span className="font-mono">{systemVersion || process.env.NEXT_PUBLIC_APP_VERSION || 'v1.0.0'}</span>
          </div>
        </div>
      </div>

      {/* Right - Login background image (from org or default) + transparent tenant logo overlay (bottom-right) */}
      <div className="relative hidden lg:block lg:w-3/5" style={rightPanelStyle}>
        {/* Optional subtle overlay so logo is readable */}
        <div className="absolute inset-0 bg-black/20" />
        {/* Transparent tenant logo overlay - bottom right (default kura-logo) */}
        <div className="absolute bottom-6 right-6 flex items-end justify-end">
          <div className="rounded-xl bg-white/20 p-4 backdrop-blur-[2px]">
            <Image
              src={orgLogoSrc}
              alt={org?.name ?? 'Organisation'}
              width={140}
              height={72}
              className="h-16 w-auto max-w-[180px] object-contain object-right opacity-95"
              unoptimized={orgLogo.startsWith('http') || orgLogo.startsWith('/media')}
              onError={(e) => {
                (e.target as HTMLImageElement).src = FALLBACK_ORG_LOGO;
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
