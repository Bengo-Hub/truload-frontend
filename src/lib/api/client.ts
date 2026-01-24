import axios, { type AxiosError, type AxiosInstance } from 'axios';
import { getOrganizationId, getStationId } from '@/lib/auth/token';

// Prefer same-origin relative base to ensure httpOnly cookies are sent.
// Override via NEXT_PUBLIC_API_URL when calling a different origin deliberately.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';
const API_PREFIX = '/api/v1';
const ACCESS_TOKEN_KEY = 'truload_access_token';

// Multi-tenant header names (must match backend TenantContextMiddleware)
const ORG_ID_HEADER = 'X-Org-ID';
const STATION_ID_HEADER = 'X-Station-ID';

/**
 * Full API URL including version prefix
 * All API calls should use paths relative to this (e.g., '/Users', '/Stations')
 */
export const API_URL = `${API_BASE}${API_PREFIX}`;

let isRefreshing = false;

/**
 * Get access token from cookies or localStorage
 */
function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Try to get from localStorage first (stored by setTokens)
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    // Fallback to reading from cookie
    const name = `${ACCESS_TOKEN_KEY}=`;
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');
    for (let cookie of cookieArray) {
      cookie = cookie.trim();
      if (cookie.indexOf(name) === 0) {
        return cookie.substring(name.length);
      }
    }
  }
  
  return null;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL, // Includes /api/v1 prefix
  timeout: 30000,
  withCredentials: true, // Include httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach token and tenant headers
apiClient.interceptors.request.use(
  async (config) => {
    // Skip refresh for auth endpoints
    if (
      config.url?.includes('/auth/login') ||
      config.url?.includes('/auth/refresh') ||
      config.url?.includes('/auth/logout')
    ) {
      return config;
    }

    // Get access token from cookies or localStorage
    if (typeof window !== 'undefined') {
      const accessToken = getAccessToken();
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }

      // Add multi-tenant headers for organization and station filtering
      const orgId = getOrganizationId();
      const stationId = getStationId();

      if (orgId) {
        config.headers[ORG_ID_HEADER] = orgId;
      }
      if (stationId) {
        config.headers[STATION_ID_HEADER] = stationId;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Track pending requests waiting for token refresh
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeToRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

function onRefreshComplete(newToken: string) {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
}

// Response interceptor - handle authentication errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean;
    };

    // Handle 401 errors (unauthenticated)
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      // Skip retry for auth endpoints - just reject without redirect
      // Let the app handle navigation via middleware or page logic
      if (
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/refresh') ||
        originalRequest.url?.includes('/auth/profile')
      ) {
        return Promise.reject(error);
      }

      // If already refreshing, queue this request to retry after refresh completes
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeToRefresh((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      // Attempt token refresh
      isRefreshing = true;
      try {
        // Import dynamically to avoid circular dependency
        const { refreshToken } = await import('@/lib/auth/api');
        const refreshResult = await refreshToken();

        isRefreshing = false;

        // Notify all queued requests with new token
        if (refreshResult.accessToken) {
          onRefreshComplete(refreshResult.accessToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${refreshResult.accessToken}`;
          return apiClient(originalRequest);
        }

        return Promise.reject(error);
      } catch (refreshError) {
        isRefreshing = false;
        refreshSubscribers = [];
        // Refresh failed - reject and let app handle navigation
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

