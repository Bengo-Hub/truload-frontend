import axios, { type AxiosError, type AxiosInstance } from 'axios';

// Prefer same-origin relative base to ensure httpOnly cookies are sent.
// Override via NEXT_PUBLIC_API_URL when calling a different origin deliberately.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const ACCESS_TOKEN_KEY = 'truload_access_token';

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
  baseURL: API_URL,
  timeout: 30000,
  withCredentials: true, // Include httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach token from storage
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
    }

    return config;
  },
  (error) => Promise.reject(error)
);

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
        originalRequest.url?.includes('/auth/refresh')
      ) {
        return Promise.reject(error);
      }

      // Attempt a simple cookie-based refresh
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          await apiClient.post('/api/v1/auth/refresh', {});
          isRefreshing = false;
          // Retry original request with new token
          return apiClient(originalRequest);
        } catch (refreshError) {
          isRefreshing = false;
          // Refresh failed - reject and let app handle navigation
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

