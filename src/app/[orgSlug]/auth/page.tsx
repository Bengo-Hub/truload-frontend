'use client';

/**
 * Pre-login station selection for tenant users.
 * User selects the station they want to log in to, then is taken to the login form.
 * Last selected org+station is cached and preselected on next visit.
 * Org logo and brand colors from API with fallback.
 */

import { getMediaUrl } from '@/lib/api/media';
import type { PublicOrganization, PublicStation } from '@/lib/api/public';
import { fetchPublicOrganizations, fetchPublicStationsByOrg } from '@/lib/api/public';
import { getLastLoginStation, setLastLoginStation } from '@/lib/auth/lastLoginStation';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

const FALLBACK_LOGO = '/images/logos/kuraweigh-logo.png';
const FALLBACK_PRIMARY = '#0a9f3d';

export default function TenantAuthStationSelectPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = typeof params?.orgSlug === 'string' ? params.orgSlug : '';
  const [organizations, setOrganizations] = useState<PublicOrganization[]>([]);
  const [stations, setStations] = useState<PublicStation[]>([]);
  const [org, setOrg] = useState<PublicOrganization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const lastUsed = useMemo(() => getLastLoginStation(), []);
  const preselectedStationCode =
    lastUsed?.orgSlug?.toLowerCase() === orgSlug?.toLowerCase() && lastUsed?.stationCode
      ? lastUsed.stationCode
      : null;

  const loadOrgAndStations = useCallback(async () => {
    if (!orgSlug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const orgs = await fetchPublicOrganizations();
      setOrganizations(orgs);
      const match = orgs.find((o) => o.code.toLowerCase() === orgSlug.toLowerCase());
      if (!match) {
        setError('Organisation not found.');
        setOrg(null);
        setStations([]);
        setLoading(false);
        return;
      }
      setOrg(match);
      const sts = await fetchPublicStationsByOrg(match.id);
      setStations(sts ?? []);
    } catch {
      setError('Failed to load stations.');
      setStations([]);
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    loadOrgAndStations();
  }, [loadOrgAndStations]);

  const goToLogin = (stationCode: string) => {
    setLastLoginStation(orgSlug, stationCode);
    router.push(`/${orgSlug}/auth/login?station=${encodeURIComponent(stationCode)}`);
  };

  const orderedStations = useMemo(() => {
    if (!preselectedStationCode || stations.length <= 1) return stations;
    const idx = stations.findIndex((s) => s.code === preselectedStationCode);
    if (idx <= 0) return stations;
    const copy = [...stations];
    const [preselected] = copy.splice(idx, 1);
    return [preselected, ...copy];
  }, [stations, preselectedStationCode]);

  if (!orgSlug) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-emerald-50/30">
        <p className="text-gray-600">Missing organisation. Go to <Link href="/auth/login" className="text-[#0a9f3d] underline">Sign in</Link>.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-emerald-50/30 px-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0a9f3d] border-t-transparent" />
        <p className="mt-4 text-sm text-gray-600">Loading stations...</p>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-emerald-50/30 px-4">
        <p className="text-gray-600">{error ?? 'Organisation not found.'}</p>
        <Link href="/auth/login" className="mt-4 text-sm font-medium text-[#0a9f3d] hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  const primaryColor = org.primaryColor || FALLBACK_PRIMARY;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-50 to-emerald-50/30">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center text-center">
            <Link href="/" className="mb-4">
              <Image
                src={org.platformLogoUrl ? getMediaUrl(org.platformLogoUrl) : (org.logoUrl ? getMediaUrl(org.logoUrl) : FALLBACK_LOGO)}
                alt={org.name}
                width={180}
                height={48}
                className="h-12 w-auto object-contain"
                priority
                unoptimized={!!(org.platformLogoUrl || org.logoUrl)}
              />
            </Link>
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Select your station</h1>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to {org.name}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200/80 bg-white/95 p-6 shadow-sm backdrop-blur-sm">
            {stations.length === 0 ? (
              <p className="text-center text-sm text-gray-500">No stations available. Contact your administrator.</p>
            ) : stations.length === 1 ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Station: <span className="font-medium">{stations[0].name}</span>
                  {stations[0].isHq && <span className="ml-2 text-xs text-gray-500">(HQ)</span>}
                </p>
                <button
                  type="button"
                  onClick={() => goToLogin(stations[0].code)}
                  className="h-11 w-full rounded-md font-medium text-white transition-colors hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  Continue to sign in
                </button>
              </div>
            ) : (
              <ul className="space-y-2">
                {orderedStations.map((station) => {
                  const isLastUsed = station.code === preselectedStationCode;
                  return (
                    <li key={station.id}>
                      <button
                        type="button"
                        onClick={() => goToLogin(station.code)}
                        className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-gray-50 ${
                          isLastUsed
                            ? 'border-2 text-gray-900'
                            : 'border-gray-200 bg-gray-50/80 text-gray-900'
                        }`}
                        style={isLastUsed ? { borderColor: primaryColor, backgroundColor: `${primaryColor}15` } : undefined}
                      >
                        <span>{station.name}</span>
                        <span className="flex items-center gap-2">
                          {isLastUsed && (
                            <span className="rounded px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: `${primaryColor}30`, color: primaryColor }}>
                              Last used
                            </span>
                          )}
                          {station.isHq && (
                            <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-700">HQ</span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
