/**
 * Dashboard Filter Context
 * Manages filter state shared across dashboard components.
 * Default station: HQ users get "all"; non-HQ users get their assigned station (from token/auth).
 */

'use client';

import { getIsHqUser, getStationId } from '@/lib/auth/token';
import { createContext, useContext, useState, useCallback, ReactNode, useMemo, useEffect } from 'react';

export interface DashboardFilters {
  dateFrom: string;
  dateTo: string;
  stationId: string;
  weighingType: string;
  controlStatus: string;
}

interface DashboardFilterContextValue {
  filters: DashboardFilters;
  setFilter: <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => void;
  setFilters: (filters: Partial<DashboardFilters>) => void;
  resetFilters: () => void;
}

const getDefaultDateRange = () => {
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  return {
    dateFrom: thirtyDaysAgo.toISOString().split('T')[0],
    dateTo: today.toISOString().split('T')[0],
  };
};

/** Default stationId: HQ -> "all", non-HQ -> user's station or "all" if none. */
function getDefaultStationId(): string {
  if (typeof window === 'undefined') return 'all';
  return getIsHqUser() ? 'all' : (getStationId() || 'all');
}

const getDefaultFilters = (): DashboardFilters => ({
  ...getDefaultDateRange(),
  stationId: 'all',
  weighingType: 'all',
  controlStatus: 'all',
});

const DashboardFilterContext = createContext<DashboardFilterContextValue | null>(null);

export function DashboardFilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<DashboardFilters>(getDefaultFilters);

  // Sync stationId from token on mount: HQ -> "all", non-HQ -> user station
  useEffect(() => {
    const stationId = getDefaultStationId();
    setFiltersState((prev) => (prev.stationId === stationId ? prev : { ...prev, stationId }));
  }, []);

  const setFilter = useCallback(<K extends keyof DashboardFilters>(
    key: K,
    value: DashboardFilters[K]
  ) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setFilters = useCallback((newFilters: Partial<DashboardFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState({
      ...getDefaultDateRange(),
      stationId: getDefaultStationId(),
      weighingType: 'all',
      controlStatus: 'all',
    });
  }, []);

  const value = useMemo(
    () => ({ filters, setFilter, setFilters, resetFilters }),
    [filters, setFilter, setFilters, resetFilters]
  );

  return (
    <DashboardFilterContext.Provider value={value}>
      {children}
    </DashboardFilterContext.Provider>
  );
}

export function useDashboardFilters() {
  const context = useContext(DashboardFilterContext);
  if (!context) {
    throw new Error('useDashboardFilters must be used within a DashboardFilterProvider');
  }
  return context;
}
