import { NextResponse } from 'next/server';

interface OrgBranding {
  name?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}

async function fetchOrgBranding(orgSlug: string): Promise<OrgBranding | null> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '';
  try {
    const res = await fetch(
      `${apiBase}/api/v1/public/organizations/by-code/${encodeURIComponent(orgSlug)}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    return (await res.json()) as OrgBranding;
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const org = await fetchOrgBranding(orgSlug);

  const manifest = {
    name: org?.name ? `${org.name} — TruLoad` : 'TruLoad',
    short_name: org?.name ?? 'TruLoad',
    description: 'Cloud-hosted vehicle weighing and enforcement platform',
    start_url: `/${orgSlug}/`,
    scope: `/${orgSlug}/`,
    display: 'standalone',
    orientation: 'portrait-primary',
    theme_color: org?.primaryColor ?? '#5B1C4D',
    background_color: org?.secondaryColor ?? '#ffffff',
    categories: ['productivity', 'utilities'],
    icons: [
      {
        src: org?.logoUrl ?? '/icon-maskable.svg',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: org?.logoUrl ?? '/icon-maskable.svg',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
