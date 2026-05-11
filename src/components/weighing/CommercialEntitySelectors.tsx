"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Truck, User, Package, MapPin } from 'lucide-react';

interface SelectOption {
  id: string;
  label: string;
}

interface CommercialEntitySelectorsProps {
  // Driver
  drivers: SelectOption[];
  selectedDriverId: string | undefined;
  onDriverIdChange: (id: string | undefined) => void;
  onAddDriver: () => void;

  // Transporter
  transporters: SelectOption[];
  selectedTransporterId: string | undefined;
  onTransporterIdChange: (id: string | undefined) => void;
  onAddTransporter: () => void;

  // Cargo Type
  cargoTypes: SelectOption[];
  selectedCargoId: string | undefined;
  onCargoIdChange: (id: string | undefined) => void;
  onAddCargoType: () => void;

  // Locations
  locations: SelectOption[];
  selectedOriginId: string | undefined;
  onOriginIdChange: (id: string | undefined) => void;
  selectedDestinationId: string | undefined;
  onDestinationIdChange: (id: string | undefined) => void;
  onAddOrigin: () => void;
  onAddDestination: () => void;
}

export function CommercialEntitySelectors({
  drivers,
  selectedDriverId,
  onDriverIdChange,
  onAddDriver,
  transporters,
  selectedTransporterId,
  onTransporterIdChange,
  onAddTransporter,
  cargoTypes,
  selectedCargoId,
  onCargoIdChange,
  onAddCargoType,
  locations,
  selectedOriginId,
  onOriginIdChange,
  selectedDestinationId,
  onDestinationIdChange,
  onAddOrigin,
  onAddDestination,
}: CommercialEntitySelectorsProps) {
  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Package className="h-4 w-4 text-emerald-600" />
          Vehicle & Cargo Details
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {/* Row 1: Driver + Transporter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-600 flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> Driver
            </Label>
            <div className="flex gap-1.5">
              <Select
                value={selectedDriverId ?? ''}
                onValueChange={(v) => onDriverIdChange(v || undefined)}
              >
                <SelectTrigger className="flex-1 text-sm">
                  <SelectValue placeholder="Select driver..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 h-9 w-9"
                onClick={onAddDriver}
                title="Add new driver"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-600 flex items-center gap-1">
              <Truck className="h-3.5 w-3.5" /> Transporter
            </Label>
            <div className="flex gap-1.5">
              <Select
                value={selectedTransporterId ?? ''}
                onValueChange={(v) => onTransporterIdChange(v || undefined)}
              >
                <SelectTrigger className="flex-1 text-sm">
                  <SelectValue placeholder="Select transporter..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  {transporters.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 h-9 w-9"
                onClick={onAddTransporter}
                title="Add new transporter"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Row 2: Cargo Type */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-600 flex items-center gap-1">
            <Package className="h-3.5 w-3.5" /> Cargo Type
          </Label>
          <div className="flex gap-1.5">
            <Select
              value={selectedCargoId ?? ''}
              onValueChange={(v) => onCargoIdChange(v || undefined)}
            >
              <SelectTrigger className="flex-1 text-sm">
                <SelectValue placeholder="Select cargo type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— None —</SelectItem>
                {cargoTypes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0 h-9 w-9"
              onClick={onAddCargoType}
              title="Add new cargo type"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Row 3: Origin + Destination */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-600 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> Origin
            </Label>
            <div className="flex gap-1.5">
              <Select
                value={selectedOriginId ?? ''}
                onValueChange={(v) => onOriginIdChange(v || undefined)}
              >
                <SelectTrigger className="flex-1 text-sm">
                  <SelectValue placeholder="Select origin..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 h-9 w-9"
                onClick={onAddOrigin}
                title="Add new location"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-600 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-red-500" /> Destination
            </Label>
            <div className="flex gap-1.5">
              <Select
                value={selectedDestinationId ?? ''}
                onValueChange={(v) => onDestinationIdChange(v || undefined)}
              >
                <SelectTrigger className="flex-1 text-sm">
                  <SelectValue placeholder="Select destination..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 h-9 w-9"
                onClick={onAddDestination}
                title="Add new location"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
