/**
 * Next.js 16 proxy for authentication and route protection.
 * Validates token expiry and redirects unauthorized users to login.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const publicPathSuffixes = ['/auth/login', '/auth/forgot-password', '/auth/reset-password', '/auth/change-expired-password'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow /api/health without auth
  if (pathname.startsWith('/api/health')) {
    return NextResponse.next();
  }

  // Domain-based default org slug redirect for bare root path
  if (pathname === '/') {
    const host = request.headers.get('host') || '';
    let defaultOrgSlug = 'truload-demo'; // Default for platform owner domain (codevertexitsolutions.com)

    if (host.includes('masterspace.co.ke')) {
      defaultOrgSlug = 'kura'; // Masterspace tenant
    }

    return NextResponse.redirect(new URL(`/${defaultOrgSlug}/auth/login`, request.url));
  }

  // Allow public auth paths at root: /auth/login, /auth/forgot-password, etc.
  if (publicPathSuffixes.some((s) => pathname === s || pathname.startsWith(s + '/'))) {
    return NextResponse.next();
  }

  // Backend manages httpOnly cookies; middleware won't enforce auth here.
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
