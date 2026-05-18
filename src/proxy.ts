/**
 * Next.js 16 proxy for authentication, route protection, and hostname-based slug injection.
 * Handles tenant-branded domains (e.g. kuraweigh.kura.go.ke) by rewriting paths to include
 * the correct org slug so the app sees /kura/... regardless of the incoming hostname.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/** Maps tenant-branded hostnames to their fixed org slugs. */
const HOSTNAME_SLUG_MAP: Record<string, string> = {
  'kuraweigh.kura.go.ke': 'kura',
};

const publicPathSuffixes = ['/auth/login', '/auth/forgot-password', '/auth/reset-password', '/auth/change-expired-password'];

const SKIP_PREFIXES = ['/_next/', '/api/', '/favicon', '/public/'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = (request.headers.get('host') ?? '').split(':')[0];

  // Allow /api/health without auth
  if (pathname.startsWith('/api/health')) {
    return NextResponse.next();
  }

  // Hostname-based slug injection for tenant-branded domains
  const tenantSlug = HOSTNAME_SLUG_MAP[host];
  if (tenantSlug) {
    // Skip Next.js internals and API routes
    if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) {
      return NextResponse.next();
    }

    // Already rooted at the correct slug — nothing to do
    if (pathname === `/${tenantSlug}` || pathname.startsWith(`/${tenantSlug}/`)) {
      return NextResponse.next();
    }

    // Root → dashboard redirect
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = `/${tenantSlug}/dashboard`;
      return NextResponse.redirect(url);
    }

    // Rewrite all other paths: /weighing/... → /kura/weighing/...
    const url = request.nextUrl.clone();
    url.pathname = `/${tenantSlug}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Domain-based default org slug redirect for bare root path (non-tenant domains)
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/truload-demo/auth/login', request.url));
  }

  // Allow public auth paths at root: /auth/login, /auth/forgot-password, etc.
  if (publicPathSuffixes.some((s) => pathname === s || pathname.startsWith(s + '/'))) {
    return NextResponse.next();
  }

  // Backend manages httpOnly cookies; proxy won't enforce auth here.
  // Client pages perform auth checks and rehydrate user state on load.
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
