"use client";

import { fetchStations } from '@/lib/api/setup';
import type { StationDto } from '@/types/setup';
import { useQuery } from '@tanstack/react-query';

export default function StationsTab() {
  const { data: stations = [], isLoading } = useQuery<StationDto[]>({ queryKey: ['stations'], queryFn: () => fetchStations() });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Stations</h3>
      {isLoading ? (
        <div className="text-sm text-gray-500">Loading stations...</div>
      ) : stations.length === 0 ? (
        <div className="text-sm text-gray-500">No stations found.</div>
      ) : (
        <ul className="space-y-1">
          {stations.map((station) => (
            <li key={station.id} className="flex items-center justify-between">
              <span className="text-sm text-gray-800">{station.name}</span>
              {station.location && <span className="text-xs text-gray-500">{station.location}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
