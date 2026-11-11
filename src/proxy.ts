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
  'kuraweightest.masterspace.co.ke': 'kura',
};

const publicPathSuffixes = ['/auth/login', '/auth/forgot-password', '/auth/reset-password', '/auth/change-expired-password'];

const SKIP_PREFIXES = ['/_next/', '/api/', '/favicon', '/public/'];

/**
 * A path whose last segment has a file extension (/truload-logo.svg, /sw.js, /images/x.png) is a
 * file from public/, never a page, so it must not be rewritten under the tenant slug.
 */
export function isStaticFilePath(pathname: string): boolean {
  const last = pathname.split('/').pop() ?? '';
  return /\.[a-z0-9]{1,8}$/i.test(last);
}

const AUTH_API_URL = (process.env.NEXT_PUBLIC_AUTH_API_URL ?? 'https://sso.codevertexafrica.com').replace(/\/+$/, '');
const RESOLVE_TTL_MS = 60_000;
const resolved = new Map<string, { slug: string | undefined; at: number }>();

/** The app's own hosts and local development never resolve as a tenant domain. */
function isPlatformHost(host: string): boolean {
  return !host || host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local') || host.endsWith('codevertexafrica.com');
}

/**
 * The org slug for a domain a tenant connected from the SSO Domains screen (service "truload"),
 * via auth-api's public resolve endpoint. Cached for a minute per host, misses included, so an
 * unknown host costs at most one lookup a minute; auth-api being down serves the host as is.
 */
async function resolveTenantHost(host: string): Promise<string | undefined> {
  if (isPlatformHost(host)) return undefined;
  const hit = resolved.get(host);
  if (hit && Date.now() - hit.at < RESOLVE_TTL_MS) return hit.slug;
  let slug: string | undefined;
  try {
    const res = await fetch(`${AUTH_API_URL}/api/v1/domains/resolve?host=${encodeURIComponent(host)}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const body = (await res.json()) as { tenant_slug?: string; service?: string };
      if (body.service === 'truload' && body.tenant_slug && /^[a-z0-9-]+$/i.test(body.tenant_slug)) slug = body.tenant_slug;
    }
  } catch {
    slug = undefined;
  }
  resolved.set(host, { slug, at: Date.now() });
  return slug;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '').split(':')[0]!.toLowerCase();

  // Allow /api/health without auth
  if (pathname.startsWith('/api/health')) {
    return NextResponse.next();
  }

  // Hostname-based slug injection for tenant-branded domains: the fixed map first, then any
  // domain connected from the SSO Domains screen.
  const tenantSlug = HOSTNAME_SLUG_MAP[host] ?? (await resolveTenantHost(host));
  if (tenantSlug) {
    // Skip Next.js internals and API routes
    if (SKIP_PREFIXES.some((p) => pathname.startsWith(p)) || isStaticFilePath(pathname)) {
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
