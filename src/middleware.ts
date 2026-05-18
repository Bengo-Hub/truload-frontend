import { NextRequest, NextResponse } from 'next/server';

/**
 * Maps tenant-specific hostnames to their fixed org slugs.
 * When a request arrives on a mapped hostname, the middleware rewrites
 * the URL to include the correct slug prefix (e.g., /kura/dashboard).
 * This allows https://kuraweigh.kura.go.ke/ to behave identically to
 * https://truload.codevertexitsolutions.com/kura/ without exposing the
 * slug in the browser address bar for tenant-branded domains.
 */
const HOSTNAME_SLUG_MAP: Record<string, string> = {
  'kuraweigh.kura.go.ke': 'kura',
};

const SKIP_PREFIXES = ['/_next/', '/api/', '/favicon', '/public/'];

export function middleware(request: NextRequest) {
  const hostname = (request.headers.get('host') ?? '').split(':')[0];
  const slug = HOSTNAME_SLUG_MAP[hostname];

  if (!slug) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // Skip Next.js internals and API routes
  if (SKIP_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Already rooted at the correct slug — nothing to do
  if (pathname === `/${slug}` || pathname.startsWith(`/${slug}/`)) {
    return NextResponse.next();
  }

  // Root redirect: / → /kura/dashboard
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = `/${slug}/dashboard`;
    return NextResponse.redirect(url);
  }

  // Rewrite all other paths: /weighing/... → /kura/weighing/...
  const url = request.nextUrl.clone();
  url.pathname = `/${slug}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
