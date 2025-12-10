import { clearToken, shouldRefreshToken } from '@/lib/auth/token';
import axios, { type AxiosError, type AxiosInstance } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });

  failedQueue = [];
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  withCredentials: true, // Include httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - check token expiry and refresh if needed
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

    // Check if token needs refresh
    if (shouldRefreshToken() && !isRefreshing) {
      isRefreshing = true;
      
      try {
        await apiClient.post('/api/v1/auth/refresh', {}, { withCredentials: true });
        processQueue();
      } catch (error) {
        processQueue(error as Error);
        clearToken();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      } finally {
        isRefreshing = false;
      }
    }

    // If refresh is in progress, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => config)
        .catch((err) => Promise.reject(err));
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

    // Handle 401 errors (token expired or invalid)
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      // Skip retry for auth endpoints
      if (
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/refresh')
      ) {
        clearToken();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      // Try to refresh token
      if (!isRefreshing) {
        isRefreshing = true;

        try {
          await apiClient.post('/api/v1/auth/refresh', {}, { withCredentials: true });
          processQueue();
          return apiClient(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError as Error);
          clearToken();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // Queue request if refresh is in progress
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: () => resolve(apiClient(originalRequest)),
          reject: (err) => reject(err),
        });
      });
    }

    return Promise.reject(error);
  }
);

