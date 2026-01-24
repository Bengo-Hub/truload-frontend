"use client";

import { useState, useEffect, useMemo } from 'react';
import { useGeolocation, calculateDistance, GeolocationPosition } from './useGeolocation';

export interface LocationWithDistance {
  id: string;
  name: string;
  code?: string;
  latitude: number;
  longitude: number;
  region?: string;
  distance: number; // Distance in km from user's position
}

export interface UseNearbyLocationsOptions {
  /** Maximum radius in km to consider locations as "nearby" */
  maxRadius?: number;
  /** Maximum number of suggestions to return */
  maxSuggestions?: number;
  /** Enable automatic geolocation on mount */
  autoDetect?: boolean;
}

export interface UseNearbyLocationsReturn {
  /** Sorted list of nearby locations (closest first) */
  nearbyLocations: LocationWithDistance[];
  /** The closest location, if any within radius */
  suggestedLocation: LocationWithDistance | null;
  /** User's current position */
  userPosition: GeolocationPosition | null;
  /** Whether geolocation is loading */
  isLoading: boolean;
  /** Geolocation error, if any */
  error: { code: number; message: string } | null;
  /** Whether geolocation is supported */
  isSupported: boolean;
  /** Manually trigger geolocation refresh */
  refresh: () => void;
}

/**
 * useNearbyLocations - Hook for suggesting locations based on user's geolocation
 *
 * Provides:
 * - List of nearby locations sorted by distance
 * - Suggested closest location for auto-fill
 * - Distance calculations from user's position
 * - Integration with useGeolocation hook
 *
 * Used for:
 * - Auto-filling origin location in weighing workflow
 * - Suggesting nearby destinations
 * - Location-based filtering
 */
export function useNearbyLocations(
  locations: Array<{ id: string; name: string; code?: string; latitude?: number; longitude?: number; region?: string }>,
  options: UseNearbyLocationsOptions = {}
): UseNearbyLocationsReturn {
  const {
    maxRadius = 50, // 50km default radius
    maxSuggestions = 5,
    autoDetect = false,
  } = options;

  const {
    position: userPosition,
    error,
    isLoading,
    isSupported,
    refresh,
  } = useGeolocation({ watch: false });

  // Auto-detect on mount if enabled
  useEffect(() => {
    if (autoDetect && isSupported) {
      refresh();
    }
  }, [autoDetect, isSupported, refresh]);

  // Calculate distances and filter/sort locations
  const nearbyLocations = useMemo(() => {
    if (!userPosition) return [];

    const locationsWithDistance: LocationWithDistance[] = locations
      .filter((loc) => loc.latitude !== undefined && loc.longitude !== undefined)
      .map((loc) => ({
        id: loc.id,
        name: loc.name,
        code: loc.code,
        latitude: loc.latitude!,
        longitude: loc.longitude!,
        region: loc.region,
        distance: calculateDistance(
          userPosition.latitude,
          userPosition.longitude,
          loc.latitude!,
          loc.longitude!
        ),
      }))
      .filter((loc) => loc.distance <= maxRadius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxSuggestions);

    return locationsWithDistance;
  }, [userPosition, locations, maxRadius, maxSuggestions]);

  // Get the closest location as suggestion
  const suggestedLocation = nearbyLocations.length > 0 ? nearbyLocations[0] : null;

  return {
    nearbyLocations,
    suggestedLocation,
    userPosition,
    isLoading,
    error,
    isSupported,
    refresh,
  };
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)}km`;
  }
  return `${Math.round(distanceKm)}km`;
}

export default useNearbyLocations;
