"use client";

import { useState, useEffect, useCallback } from 'react';

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

export interface UseGeolocationReturn {
  position: GeolocationPosition | null;
  error: GeolocationError | null;
  isLoading: boolean;
  isSupported: boolean;
  refresh: () => void;
}

/**
 * useGeolocation - Hook for accessing device geolocation
 *
 * Provides:
 * - Current position (latitude, longitude, accuracy)
 * - Error handling for permission denied, unavailable, timeout
 * - Loading state
 * - Support detection
 * - Manual refresh capability
 * - Optional watch mode for continuous updates
 *
 * Used by useNearbyLocations for location-based suggestions
 */
export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    watch = false,
  } = options;

  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  const handleSuccess = useCallback((pos: globalThis.GeolocationPosition) => {
    setPosition({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      timestamp: pos.timestamp,
    });
    setError(null);
    setIsLoading(false);
  }, []);

  const handleError = useCallback((err: globalThis.GeolocationPositionError) => {
    setError({
      code: err.code,
      message: err.message,
    });
    setIsLoading(false);
  }, []);

  const refresh = useCallback(() => {
    if (!isSupported) {
      setError({ code: 0, message: 'Geolocation is not supported by this browser' });
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy,
      timeout,
      maximumAge,
    });
  }, [isSupported, enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);

  useEffect(() => {
    if (!isSupported) return;

    if (watch) {
      setIsLoading(true);
      const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
        enableHighAccuracy,
        timeout,
        maximumAge,
      });

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [isSupported, watch, enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);

  return {
    position,
    error,
    isLoading,
    isSupported,
    refresh,
  };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lat: number, lon: number, precision: number = 4): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(precision)}°${latDir}, ${Math.abs(lon).toFixed(precision)}°${lonDir}`;
}

export default useGeolocation;
