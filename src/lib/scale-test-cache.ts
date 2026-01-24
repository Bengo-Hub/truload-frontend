/**
 * Scale Test Cache Utility
 *
 * Caches scale test status in localStorage with 24-hour expiration.
 * This prevents unnecessary API calls and ensures the scale test requirement
 * persists across page refreshes within the same day.
 */

import { ScaleTest, ScaleTestStatus } from '@/lib/api/weighing';

interface CachedScaleTestData {
  status: ScaleTestStatus;
  cachedAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp
  stationId: string;
  bound?: string;
}

const CACHE_KEY_PREFIX = 'truload_scale_test_';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a unique cache key for a station/bound combination
 */
function getCacheKey(stationId: string, bound?: string): string {
  return `${CACHE_KEY_PREFIX}${stationId}${bound ? `_${bound}` : ''}`;
}

/**
 * Check if the cached data is still valid
 * - Must not be expired (within 24 hours)
 * - Must be from the same calendar day (scale test is required daily)
 */
function isCacheValid(cached: CachedScaleTestData): boolean {
  const now = Date.now();

  // Check if expired
  if (now > cached.expiresAt) {
    return false;
  }

  // Check if from the same calendar day (UTC)
  const cachedDate = new Date(cached.cachedAt).toISOString().split('T')[0];
  const todayDate = new Date().toISOString().split('T')[0];

  if (cachedDate !== todayDate) {
    return false;
  }

  // Check if the scale test itself is still valid (carriedAt is today)
  if (cached.status.latestTest) {
    const testDate = new Date(cached.status.latestTest.carriedAt).toISOString().split('T')[0];
    if (testDate !== todayDate) {
      return false;
    }
  }

  return true;
}

/**
 * Get cached scale test status if available and valid
 */
export function getCachedScaleTestStatus(stationId: string, bound?: string): ScaleTestStatus | null {
  if (typeof window === 'undefined') {
    return null; // SSR - no localStorage
  }

  const cacheKey = getCacheKey(stationId, bound);

  try {
    const cachedJson = localStorage.getItem(cacheKey);
    if (!cachedJson) {
      return null;
    }

    const cached: CachedScaleTestData = JSON.parse(cachedJson);

    // Validate cache structure
    if (!cached.status || !cached.cachedAt || !cached.expiresAt || cached.stationId !== stationId) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    // Check if bound matches (if provided)
    if (bound && cached.bound !== bound) {
      return null;
    }

    // Check if cache is still valid
    if (!isCacheValid(cached)) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return cached.status;
  } catch (error) {
    console.warn('Failed to read scale test cache:', error);
    localStorage.removeItem(cacheKey);
    return null;
  }
}

/**
 * Cache scale test status for a station/bound
 */
export function cacheScaleTestStatus(
  stationId: string,
  status: ScaleTestStatus,
  bound?: string
): void {
  if (typeof window === 'undefined') {
    return; // SSR - no localStorage
  }

  const cacheKey = getCacheKey(stationId, bound);
  const now = Date.now();

  const cacheData: CachedScaleTestData = {
    status,
    cachedAt: now,
    expiresAt: now + CACHE_DURATION_MS,
    stationId,
    bound,
  };

  try {
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Failed to cache scale test status:', error);
  }
}

/**
 * Clear cached scale test status for a station/bound
 * Call this when a new scale test is performed to ensure fresh data
 */
export function clearScaleTestCache(stationId: string, bound?: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const cacheKey = getCacheKey(stationId, bound);
  localStorage.removeItem(cacheKey);
}

/**
 * Clear all scale test caches (useful for logout)
 */
export function clearAllScaleTestCaches(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CACHE_KEY_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

/**
 * Update cached scale test after a new test is performed
 * This is called after createScaleTest succeeds
 */
export function updateCacheWithNewTest(
  stationId: string,
  test: ScaleTest,
  bound?: string
): void {
  const newStatus: ScaleTestStatus = {
    hasValidTest: test.result === 'pass',
    latestTest: test,
    weighingAllowed: test.result === 'pass',
    message: test.result === 'pass'
      ? 'Scale test completed successfully'
      : 'Scale test failed - weighing not allowed',
    stationId,
    bound,
  };

  cacheScaleTestStatus(stationId, newStatus, bound);
}

/**
 * Hook helper: Get scale test status with caching
 * Returns cached data immediately if available, otherwise fetches from API
 */
export async function getScaleTestStatusWithCache(
  stationId: string,
  bound: string | undefined,
  fetchFromApi: () => Promise<ScaleTestStatus>
): Promise<ScaleTestStatus> {
  // Try to get from cache first
  const cached = getCachedScaleTestStatus(stationId, bound);
  if (cached) {
    console.log('[ScaleTestCache] Using cached scale test status');
    return cached;
  }

  // Fetch from API
  console.log('[ScaleTestCache] Fetching scale test status from API');
  const status = await fetchFromApi();

  // Cache the result
  cacheScaleTestStatus(stationId, status, bound);

  return status;
}
