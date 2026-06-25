/**
 * Bridges the offline-PIN crypto core (lib/offline/offlinePin) to the live auth layer
 * (token.ts + auth store): enrolling captures the current online session; unlocking rehydrates
 * tokens + tenant context + user so the app behaves as if signed in (for offline capture only —
 * the server still re-verifies on reconnect via the refresh flow).
 */
import {
  getAccessToken,
  getRefreshToken,
  getTokenExpiry,
  getOrganizationId,
  getStationId,
  getIsHqUser,
  setTokens,
  setTenantContext,
  setIsPlatformOwner,
  PLATFORM_OWNER_ORG_CODE,
} from '@/lib/auth/token';
import { useAuthStore } from '@/stores/auth.store';
import {
  enableOfflinePin,
  unlockWithPin,
  type CachedSession,
  type UnlockResult,
} from '@/lib/offline/offlinePin';
import type { User } from '@/types/auth/types';

export {
  isOfflinePinEnabled,
  disableOfflinePin,
  getOfflinePinUserLabel,
  OFFLINE_PIN_MAX_ATTEMPTS,
} from '@/lib/offline/offlinePin';
export type { UnlockResult } from '@/lib/offline/offlinePin';

/** Capture the current (online) session and encrypt it under `pin`. Must be signed in online. */
export async function enrollOfflinePin(pin: string): Promise<void> {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  const user = useAuthStore.getState().user;
  if (!accessToken || !refreshToken || !user) {
    throw new Error('Sign in online before setting an offline PIN.');
  }
  const session: CachedSession = {
    accessToken,
    refreshToken,
    tokenExpiry: getTokenExpiry(),
    user,
    organizationId: getOrganizationId(),
    stationId: getStationId(),
    isHqUser: getIsHqUser(),
  };
  await enableOfflinePin(pin, session, user.email ?? user.fullName ?? undefined);
}

/** Verify the PIN and, on success, rehydrate the session into the live auth layer. */
export async function unlockOfflineSession(pin: string): Promise<UnlockResult> {
  const res = await unlockWithPin(pin);
  if (res.ok) {
    const s = res.session;
    const nowSec = Math.floor(Date.now() / 1000);
    const expiresIn = s.tokenExpiry ? Math.max(0, Number(s.tokenExpiry) - nowSec) : 0;
    setTokens({ accessToken: s.accessToken, refreshToken: s.refreshToken, expiresIn });
    if (s.organizationId) {
      setTenantContext({
        organizationId: s.organizationId,
        stationId: s.stationId ?? undefined,
        isHqUser: !!s.isHqUser,
      });
    }
    const user = s.user as User;
    setIsPlatformOwner(user.organizationCode?.toUpperCase() === PLATFORM_OWNER_ORG_CODE);
    useAuthStore.getState().setUser(user);
  }
  return res;
}
