/**
 * Next.js middleware for authentication and route protection.
 * Validates token expiry and redirects unauthorized users to login.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const publicPaths = ['/login', '/api/health'];
const authPaths = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public paths without authentication
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check for token expiry in localStorage (token is in httpOnly cookie)
  // Note: We can't access httpOnly cookies in middleware, so we check localStorage timestamp
  const tokenExpiry = request.cookies.get('truload_token_expiry');
  
  if (!tokenExpiry) {
    // No token expiry means not authenticated
    if (authPaths.includes(pathname)) {
      return NextResponse.next();
    }
    
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const expiryTime = parseInt(tokenExpiry.value, 10);
  const now = Math.floor(Date.now() / 1000);

  // Check if token is expired
  if (expiryTime <= now) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('truload_token_expiry');
    return response;
  }

  // If authenticated and trying to access login, redirect to dashboard
  if (authPaths.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

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
