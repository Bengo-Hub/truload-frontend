"use client";

import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building2,
  Loader2,
  MapPin,
  Navigation,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

import { useHasPermission } from "@/hooks/useAuth";
import {
  createStation,
  deleteStation,
  fetchOrganizations,
  fetchStations,
  updateStation,
} from "@/lib/api/setup";
import type {
  CreateStationRequest,
  OrganizationDto,
  StationDto,
  UpdateStationRequest,
} from "@/types/setup";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATION_TYPES = [
  { value: "weigh_bridge", label: "Weigh Bridge" },
  { value: "inspection", label: "Inspection" },
  { value: "checkpoint", label: "Checkpoint" },
] as const;

const TYPE_BADGE_COLORS: Record<string, string> = {
  weigh_bridge: "bg-blue-100 text-blue-700",
  inspection: "bg-amber-100 text-amber-700",
  checkpoint: "bg-purple-100 text-purple-700",
};

function getTypeBadgeColor(stationType?: string) {
  if (!stationType) return "bg-gray-100 text-gray-600";
  return TYPE_BADGE_COLORS[stationType.toLowerCase()] ?? "bg-gray-100 text-gray-600";
}

function formatStationTypeLabel(stationType?: string) {
  if (!stationType) return "Unknown";
  const match = STATION_TYPES.find(
    (t) => t.value.toLowerCase() === stationType.toLowerCase(),
  );
  return match ? match.label : stationType;
}

// ---------------------------------------------------------------------------
// Sub-components: Create Station Dialog
// ---------------------------------------------------------------------------

interface CreateStationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateStationDialog({ open, onOpenChange }: CreateStationDialogProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateStationRequest>({
    defaultValues: {
      code: "",
      name: "",
      organizationId: "",
      stationType: undefined,
      location: "",
      latitude: undefined,
      longitude: undefined,
      supportsBidirectional: false,
      boundACode: "",
      boundBCode: "",
    },
  });

  const supportsBidirectional = watch("supportsBidirectional");

  const { data: organizations = [], isLoading: loadingOrgs } = useQuery<OrganizationDto[]>({
    queryKey: ["organizations"],
    queryFn: () => fetchOrganizations(),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (data: CreateStationRequest) => createStation(data),
    onSuccess: () => {
      toast.success("Station created successfully");
      queryClient.invalidateQueries({ queryKey: ["stations"] });
      reset();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error("Failed to create station", { description: err.message });
    },
  });

  const onSubmit = (data: CreateStationRequest) => {
    const payload: CreateStationRequest = {
      code: data.code.trim(),
      name: data.name.trim(),
      organizationId: data.organizationId,
      stationType: data.stationType || undefined,
      location: data.location?.trim() || undefined,
      latitude: data.latitude != null && data.latitude !== (0 as number) ? Number(data.latitude) : undefined,
      longitude: data.longitude != null && data.longitude !== (0 as number) ? Number(data.longitude) : undefined,
      supportsBidirectional: data.supportsBidirectional ?? false,
      boundACode: data.boundACode?.trim() || undefined,
      boundBCode: data.boundBCode?.trim() || undefined,
    };
    mutation.mutate(payload);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Station</DialogTitle>
          <DialogDescription>
            Add a new station to the system. Fill in the required fields and any
            optional details.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0 pr-3">
          <form
            id="create-station-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 pb-1"
          >
            {/* Code */}
            <div className="space-y-2">
              <Label htmlFor="create-station-code">
                Station Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-station-code"
                placeholder="e.g. STN-001"
                {...register("code", {
                  required: "Station code is required",
                  minLength: { value: 2, message: "Code must be at least 2 characters" },
                  maxLength: { value: 50, message: "Code must not exceed 50 characters" },
                })}
              />
              {errors.code && (
                <p className="text-xs text-destructive">{errors.code.message}</p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="create-station-name">
                Station Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-station-name"
                placeholder="e.g. Mariakani Weigh Bridge"
                {...register("name", {
                  required: "Station name is required",
                  minLength: { value: 2, message: "Name must be at least 2 characters" },
                  maxLength: { value: 150, message: "Name must not exceed 150 characters" },
                })}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Organization */}
            <div className="space-y-2">
              <Label>
                Organization <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="organizationId"
                control={control}
                rules={{ required: "Organization is required" }}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={loadingOrgs}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={loadingOrgs ? "Loading organizations..." : "Select organization"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations
                        .filter((o) => o.isActive)
                        .map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.organizationId && (
                <p className="text-xs text-destructive">{errors.organizationId.message}</p>
              )}
            </div>

            {/* Station Type */}
            <div className="space-y-2">
              <Label>Station Type</Label>
              <Controller
                name="stationType"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select station type" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="create-station-location">Location</Label>
              <Input
                id="create-station-location"
                placeholder="e.g. Mombasa Highway, KM 32"
                {...register("location", {
                  maxLength: { value: 250, message: "Location must not exceed 250 characters" },
                })}
              />
              {errors.location && (
                <p className="text-xs text-destructive">{errors.location.message}</p>
              )}
            </div>

            {/* Latitude / Longitude */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="create-station-lat">Latitude</Label>
                <Input
                  id="create-station-lat"
                  type="number"
                  step="any"
                  placeholder="e.g. -3.9461"
                  {...register("latitude", {
                    valueAsNumber: true,
                    validate: (v) =>
                      v == null ||
                      isNaN(v as number) ||
                      (v >= -90 && v <= 90) ||
                      "Latitude must be between -90 and 90",
                  })}
                />
                {errors.latitude && (
                  <p className="text-xs text-destructive">{errors.latitude.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-station-lng">Longitude</Label>
                <Input
                  id="create-station-lng"
                  type="number"
                  step="any"
                  placeholder="e.g. 39.7307"
                  {...register("longitude", {
                    valueAsNumber: true,
                    validate: (v) =>
                      v == null ||
                      isNaN(v as number) ||
                      (v >= -180 && v <= 180) ||
                      "Longitude must be between -180 and 180",
                  })}
                />
                {errors.longitude && (
                  <p className="text-xs text-destructive">{errors.longitude.message}</p>
                )}
              </div>
            </div>

            {/* Supports Bidirectional */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="create-station-bidirectional" className="text-sm font-medium">
                  Bidirectional
                </Label>
                <p className="text-xs text-muted-foreground">
                  Station supports traffic in both directions
                </p>
              </div>
              <Switch
                id="create-station-bidirectional"
                checked={supportsBidirectional ?? false}
                onCheckedChange={(checked) => setValue("supportsBidirectional", checked)}
              />
            </div>

            {/* Bound Codes (shown when bidirectional) */}
            {supportsBidirectional && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="create-station-boundA">Bound A Code</Label>
                  <Input
                    id="create-station-boundA"
                    placeholder="e.g. NORTH"
                    {...register("boundACode", {
                      maxLength: { value: 50, message: "Must not exceed 50 characters" },
                    })}
                  />
                  {errors.boundACode && (
                    <p className="text-xs text-destructive">{errors.boundACode.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-station-boundB">Bound B Code</Label>
                  <Input
                    id="create-station-boundB"
                    placeholder="e.g. SOUTH"
                    {...register("boundBCode", {
                      maxLength: { value: 50, message: "Must not exceed 50 characters" },
                    })}
                  />
                  {errors.boundBCode && (
                    <p className="text-xs text-destructive">{errors.boundBCode.message}</p>
                  )}
                </div>
              </div>
            )}
          </form>
        </ScrollArea>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button type="submit" form="create-station-form" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Station
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Sub-components: Edit Station Dialog
// ---------------------------------------------------------------------------

interface EditStationDialogProps {
  station: StationDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function EditStationDialog({ station, open, onOpenChange }: EditStationDialogProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UpdateStationRequest>({
    values: station
      ? {
          code: station.code,
          name: station.name,
          stationType: station.stationType ?? undefined,
          location: station.location ?? "",
          latitude: station.latitude ?? undefined,
          longitude: station.longitude ?? undefined,
          supportsBidirectional: station.supportsBidirectional,
          boundACode: station.boundACode ?? "",
          boundBCode: station.boundBCode ?? "",
          isActive: station.isActive,
        }
      : {},
  });

  const supportsBidirectional = watch("supportsBidirectional");
  const isActive = watch("isActive");

  const { data: organizations = [], isLoading: loadingOrgs } = useQuery<OrganizationDto[]>({
    queryKey: ["organizations"],
    queryFn: () => fetchOrganizations(),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (data: UpdateStationRequest) => updateStation(station!.id, data),
    onSuccess: () => {
      toast.success("Station updated successfully");
      queryClient.invalidateQueries({ queryKey: ["stations"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error("Failed to update station", { description: err.message });
    },
  });

  const onSubmit = (data: UpdateStationRequest) => {
    const payload: UpdateStationRequest = {
      code: data.code?.trim() || undefined,
      name: data.name?.trim() || undefined,
      stationType: data.stationType || undefined,
      location: data.location?.trim() || undefined,
      latitude: data.latitude != null && !isNaN(data.latitude as number) ? Number(data.latitude) : undefined,
      longitude: data.longitude != null && !isNaN(data.longitude as number) ? Number(data.longitude) : undefined,
      supportsBidirectional: data.supportsBidirectional,
      boundACode: data.boundACode?.trim() || undefined,
      boundBCode: data.boundBCode?.trim() || undefined,
      isActive: data.isActive,
    };
    mutation.mutate(payload);
  };

  if (!station) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Station</DialogTitle>
          <DialogDescription>
            Update the details for <span className="font-medium">{station.name}</span>.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0 pr-3">
          <form
            id="edit-station-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 pb-1"
          >
            {/* Code */}
            <div className="space-y-2">
              <Label htmlFor="edit-station-code">
                Station Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-station-code"
                {...register("code", {
                  required: "Station code is required",
                  minLength: { value: 2, message: "Code must be at least 2 characters" },
                  maxLength: { value: 50, message: "Code must not exceed 50 characters" },
                })}
              />
              {errors.code && (
                <p className="text-xs text-destructive">{errors.code.message}</p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-station-name">
                Station Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-station-name"
                {...register("name", {
                  required: "Station name is required",
                  minLength: { value: 2, message: "Name must be at least 2 characters" },
                  maxLength: { value: 150, message: "Name must not exceed 150 characters" },
                })}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Organization (read-only display since update doesn't allow changing org) */}
            {station.organizationName && (
              <div className="space-y-2">
                <Label>Organization</Label>
                <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm bg-muted/50">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{station.organizationName}</span>
                </div>
              </div>
            )}

            {/* Station Type */}
            <div className="space-y-2">
              <Label>Station Type</Label>
              <Controller
                name="stationType"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select station type" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="edit-station-location">Location</Label>
              <Input
                id="edit-station-location"
                {...register("location", {
                  maxLength: { value: 250, message: "Location must not exceed 250 characters" },
                })}
              />
              {errors.location && (
                <p className="text-xs text-destructive">{errors.location.message}</p>
              )}
            </div>

            {/* Latitude / Longitude */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-station-lat">Latitude</Label>
                <Input
                  id="edit-station-lat"
                  type="number"
                  step="any"
                  {...register("latitude", {
                    valueAsNumber: true,
                    validate: (v) =>
                      v == null ||
                      isNaN(v as number) ||
                      (v >= -90 && v <= 90) ||
                      "Latitude must be between -90 and 90",
                  })}
                />
                {errors.latitude && (
                  <p className="text-xs text-destructive">{errors.latitude.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-station-lng">Longitude</Label>
                <Input
                  id="edit-station-lng"
                  type="number"
                  step="any"
                  {...register("longitude", {
                    valueAsNumber: true,
                    validate: (v) =>
                      v == null ||
                      isNaN(v as number) ||
                      (v >= -180 && v <= 180) ||
                      "Longitude must be between -180 and 180",
                  })}
                />
                {errors.longitude && (
                  <p className="text-xs text-destructive">{errors.longitude.message}</p>
                )}
              </div>
            </div>

            {/* Supports Bidirectional */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="edit-station-bidirectional" className="text-sm font-medium">
                  Bidirectional
                </Label>
                <p className="text-xs text-muted-foreground">
                  Station supports traffic in both directions
                </p>
              </div>
              <Switch
                id="edit-station-bidirectional"
                checked={supportsBidirectional ?? false}
                onCheckedChange={(checked) => setValue("supportsBidirectional", checked)}
              />
            </div>

            {/* Bound Codes */}
            {supportsBidirectional && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-station-boundA">Bound A Code</Label>
                  <Input
                    id="edit-station-boundA"
                    {...register("boundACode", {
                      maxLength: { value: 50, message: "Must not exceed 50 characters" },
                    })}
                  />
                  {errors.boundACode && (
                    <p className="text-xs text-destructive">{errors.boundACode.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-station-boundB">Bound B Code</Label>
                  <Input
                    id="edit-station-boundB"
                    {...register("boundBCode", {
                      maxLength: { value: 50, message: "Must not exceed 50 characters" },
                    })}
                  />
                  {errors.boundBCode && (
                    <p className="text-xs text-destructive">{errors.boundBCode.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* Active Status */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="edit-station-active" className="text-sm font-medium">
                  Active Status
                </Label>
                <p className="text-xs text-muted-foreground">
                  Inactive stations are hidden from operational views
                </p>
              </div>
              <Switch
                id="edit-station-active"
                checked={isActive ?? true}
                onCheckedChange={(checked) => setValue("isActive", checked)}
              />
            </div>
          </form>
        </ScrollArea>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button type="submit" form="edit-station-form" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Sub-components: Delete Station Dialog
// ---------------------------------------------------------------------------

interface DeleteStationDialogProps {
  station: StationDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DeleteStationDialog({ station, open, onOpenChange }: DeleteStationDialogProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deleteStation(station!.id),
    onSuccess: () => {
      toast.success("Station deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["stations"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error("Failed to delete station", { description: err.message });
    },
  });

  if (!station) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Station
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the station
            and all associated data.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-foreground">
            You are about to delete:
          </p>
          <div className="mt-2 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-destructive" />
            <span className="text-sm font-semibold">{station.name}</span>
            <Badge variant="outline" className="font-mono text-xs">
              {station.code}
            </Badge>
          </div>
          {station.location && (
            <p className="mt-1.5 text-xs text-muted-foreground ml-6">
              {station.location}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Station
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Sub-components: Station Card
// ---------------------------------------------------------------------------

interface StationCardProps {
  station: StationDto;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (station: StationDto) => void;
  onDelete: (station: StationDto) => void;
}

function StationCard({ station, canEdit, canDelete, onEdit, onDelete }: StationCardProps) {
  return (
    <Card className="overflow-hidden group hover:shadow-md transition-shadow duration-200">
      <div className="h-1.5 bg-gradient-to-r from-teal-500 to-teal-400" />
      <div className="p-4 space-y-3">
        {/* Top: Name, Code, Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-foreground truncate">
              {station.name}
            </h4>
            <Badge variant="outline" className="text-[10px] mt-1 font-mono">
              {station.code}
            </Badge>
          </div>
          <Badge
            className={`text-[10px] shrink-0 ${
              station.isActive
                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                : "bg-gray-100 text-gray-600 hover:bg-gray-100"
            }`}
          >
            {station.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>

        {/* Organization + Station Type */}
        <div className="flex flex-wrap items-center gap-1.5">
          {station.organizationName && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3 flex-shrink-0" />
              <span className="truncate max-w-[140px]">{station.organizationName}</span>
            </div>
          )}
          {station.stationType && (
            <Badge
              variant="outline"
              className={`text-[10px] border-0 flex-shrink-0 ${getTypeBadgeColor(station.stationType)}`}
            >
              {formatStationTypeLabel(station.stationType)}
            </Badge>
          )}
        </div>

        {/* Location */}
        {station.location ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0 text-teal-500" />
            <span className="truncate">{station.location}</span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/60 italic">No location specified</p>
        )}

        {/* Coordinates + Bidirectional info */}
        <div className="flex flex-wrap items-center gap-2">
          {station.latitude != null && station.longitude != null && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
              <Navigation className="h-3 w-3 flex-shrink-0" />
              <span>
                {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}
              </span>
            </div>
          )}
          {station.supportsBidirectional && (
            <Badge variant="secondary" className="text-[10px]">
              Bidirectional
            </Badge>
          )}
        </div>

        {/* Footer: Actions */}
        {(canEdit || canDelete) && (
          <div className="flex items-center justify-end gap-0.5 pt-1 border-t">
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary"
                onClick={() => onEdit(station)}
                title="Edit station"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(station)}
                title="Delete station"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function StationsTab() {
  const canCreate = useHasPermission("station.create");
  const canEdit = useHasPermission("station.update");
  const canDelete = useHasPermission("station.delete");

  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StationDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StationDto | null>(null);

  const {
    data: stations = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<StationDto[]>({
    queryKey: ["stations"],
    queryFn: () => fetchStations(),
  });

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return stations;
    const q = searchQuery.toLowerCase();
    return stations.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.location ?? "").toLowerCase().includes(q) ||
        (s.organizationName ?? "").toLowerCase().includes(q) ||
        (s.stationType ?? "").toLowerCase().includes(q),
    );
  }, [stations, searchQuery]);

  const activeCount = useMemo(
    () => stations.filter((s) => s.isActive).length,
    [stations],
  );

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Card className="flex items-center gap-3 px-4 py-3">
          <div className="rounded-lg bg-teal-100 p-2">
            <MapPin className="h-4 w-4 text-teal-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Stations</p>
            <p className="text-lg font-semibold">
              {isLoading ? "\u2013" : stations.length}
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 px-4 py-3">
          <div className="rounded-lg bg-emerald-100 p-2">
            <MapPin className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-lg font-semibold">
              {isLoading ? "\u2013" : activeCount}
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 px-4 py-3 col-span-2 lg:col-span-1">
          <div className="rounded-lg bg-blue-100 p-2">
            <Search className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Showing</p>
            <p className="text-lg font-semibold">
              {isLoading ? "\u2013" : filtered.length}
            </p>
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search stations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          {canCreate && (
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Station</span>
              <span className="sm:hidden">New</span>
            </Button>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4 space-y-3">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-full" />
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <MapPin className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {searchQuery ? "No matching stations" : "No stations found"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {searchQuery
              ? "Try adjusting your search query."
              : "No stations are configured in the system yet."}
          </p>
          {!searchQuery && canCreate && (
            <Button
              size="sm"
              className="mt-4 gap-1.5"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create Station
            </Button>
          )}
        </div>
      )}

      {/* Cards */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((station) => (
            <StationCard
              key={station.id}
              station={station}
              canEdit={canEdit}
              canDelete={canDelete}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <CreateStationDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditStationDialog
        station={editTarget}
        open={!!editTarget}
        onOpenChange={(v) => {
          if (!v) setEditTarget(null);
        }}
      />
      <DeleteStationDialog
        station={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
      />
    </div>
  );
}
