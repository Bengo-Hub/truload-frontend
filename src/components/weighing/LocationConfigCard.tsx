"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCounties, useRoadsByCounty, useRoadsBySubcounty, useSubcounties } from '@/hooks/queries';
import { QUERY_KEYS } from '@/lib/query/config';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AddRoadModal } from '../settings/prosecution/AddRoadModal';

import { StationDto } from '@/types/setup';

interface LocationConfigCardProps {
  stationId?: string;
  currentStation?: StationDto | null;
  selectedCountyId: string;
  setSelectedCountyId: (id: string) => void;
  selectedSubcountyId: string;
  setSelectedSubcountyId: (id: string) => void;
  selectedRoadId: string;
  setSelectedRoadId: (id: string) => void;
}

export function LocationConfigCard({
  stationId,
  currentStation,
  selectedCountyId,
  setSelectedCountyId,
  selectedSubcountyId,
  setSelectedSubcountyId,
  selectedRoadId,
  setSelectedRoadId,
}: LocationConfigCardProps) {
  const queryClient = useQueryClient();
  const { data: counties = [] } = useCounties();
  const { data: subcounties = [] } = useSubcounties(selectedCountyId);
  const { data: roadsByCounty = [] } = useRoadsByCounty(selectedCountyId);
  const { data: roadsBySubcounty = [] } = useRoadsBySubcounty(selectedSubcountyId);
  const roads = selectedSubcountyId ? roadsBySubcounty : roadsByCounty;

  // Preselect location settings (Station defaults > LocalStorage > Nairobi)
  useEffect(() => {
    if (!stationId) return;

    // 1. Check Station defaults first
    if (currentStation) {
      if (currentStation.countyId && !selectedCountyId) setSelectedCountyId(currentStation.countyId);
      if (currentStation.subcountyId && !selectedSubcountyId) setSelectedSubcountyId(currentStation.subcountyId);
      if (currentStation.roadId && !selectedRoadId) setSelectedRoadId(currentStation.roadId);
      
      // If we found station defaults, we can skip localStorage for these specific fields if they were set
      if (currentStation.countyId) return;
    }

    // 2. Fallback to LocalStorage
    const storageKey = `truload_settings_${stationId}`;
    const savedSettings = localStorage.getItem(storageKey);

    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.countyId && !selectedCountyId) setSelectedCountyId(parsed.countyId);
        if (parsed.subcountyId && !selectedSubcountyId) setSelectedSubcountyId(parsed.subcountyId);
        if (parsed.roadId && !selectedRoadId) setSelectedRoadId(parsed.roadId);
      } catch (e) {
        console.error('Failed to parse saved settings', e);
      }
    } else if (counties.length > 0 && !selectedCountyId) {
      // 3. Last fallback to Nairobi City
      const nairobi = counties.find(c => c.name.includes('Nairobi'));
      if (nairobi) {
        setSelectedCountyId(nairobi.id);
      }
    }
  }, [stationId, currentStation, counties, selectedCountyId, setSelectedCountyId, setSelectedSubcountyId, setSelectedRoadId, selectedRoadId]);

  // Save settings when they change
  useEffect(() => {
    if (!stationId) return;
    const storageKey = `truload_settings_${stationId}`;
    const settings = {
      countyId: selectedCountyId,
      subcountyId: selectedSubcountyId,
      roadId: selectedRoadId,
    };
    localStorage.setItem(storageKey, JSON.stringify(settings));
  }, [stationId, selectedCountyId, selectedSubcountyId, selectedRoadId]);

  return (
    <Card className="border-gray-200 bg-gray-50/50">
      <CardContent className="p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label className="text-[10px] text-gray-500 uppercase font-bold">County</Label>
            <Select value={selectedCountyId} onValueChange={setSelectedCountyId}>
              <SelectTrigger className="h-9 bg-white">
                <SelectValue placeholder="Select County" />
              </SelectTrigger>
              <SelectContent>
                {counties.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-gray-500 uppercase font-bold">Sub County</Label>
            <Select value={selectedSubcountyId} onValueChange={setSelectedSubcountyId} disabled={!selectedCountyId}>
              <SelectTrigger className="h-9 bg-white">
                <SelectValue placeholder="Select Sub County" />
              </SelectTrigger>
              <SelectContent>
                {subcounties.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-gray-500 uppercase font-bold">Location (Road)</Label>
            <div className="flex gap-2">
              <Select value={selectedRoadId} onValueChange={setSelectedRoadId} disabled={!selectedCountyId}>
                <SelectTrigger className="h-9 bg-white flex-1">
                  <SelectValue placeholder="Select Road" />
                </SelectTrigger>
                <SelectContent>
                  {roads.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <AddRoadModal
                defaultCountyId={selectedCountyId}
                defaultSubcountyId={selectedSubcountyId}
                onCreated={(road) => {
                  queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.ROADS, 'county', selectedCountyId] });
                  queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.ROADS, 'subcounty', selectedSubcountyId] });
                  setSelectedRoadId(road.id);
                }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
