"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building,
  Landmark,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
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
  createOrganization,
  deleteOrganization,
  fetchOrganizations,
  updateOrganization,
} from "@/lib/api/setup";
import type {
  CreateOrganizationRequest,
  OrganizationDto,
  UpdateOrganizationRequest,
} from "@/types/setup";

// ---------------------------------------------------------------------------
// Constants & Colour helpers
// ---------------------------------------------------------------------------

const ORG_TYPE_OPTIONS = [
  { value: "Government", label: "Government" },
  { value: "Private", label: "Private" },
] as const;

const NONE_VALUE = "__none__";

const TYPE_COLORS: Record<string, string> = {
  government: "bg-blue-100 text-blue-700",
  private: "bg-emerald-100 text-emerald-700",
  parastatal: "bg-purple-100 text-purple-700",
  ngo: "bg-amber-100 text-amber-700",
};

function getTypeColor(orgType?: string) {
  if (!orgType) return "bg-gray-100 text-gray-600";
  return TYPE_COLORS[orgType.toLowerCase()] ?? "bg-gray-100 text-gray-600";
}

// ---------------------------------------------------------------------------
// Form value types
// ---------------------------------------------------------------------------

interface CreateOrgFormValues {
  code: string;
  name: string;
  orgType: string;
  tenantType: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
}

interface EditOrgFormValues {
  code: string;
  name: string;
  orgType: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Create Organization Dialog
// ---------------------------------------------------------------------------

function CreateOrgDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateOrgFormValues>({
    defaultValues: {
      code: "",
      name: "",
      orgType: "",
      tenantType: "AxleLoadEnforcement",
      contactEmail: "",
      contactPhone: "",
      address: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateOrganizationRequest) =>
      createOrganization(payload),
    onSuccess: () => {
      toast.success("Organization created successfully");
      queryClient.invalidateQueries({ queryKey: ["orgs"] });
      handleClose();
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Failed to create organization";
      toast.error(message);
    },
  });

  function handleClose() {
    reset();
    onClose();
  }

  function onSubmit(values: CreateOrgFormValues) {
    const payload: CreateOrganizationRequest = {
      code: values.code.trim(),
      name: values.name.trim(),
      orgType: values.orgType || undefined,
      tenantType: values.tenantType || undefined,
      contactEmail: values.contactEmail.trim() || undefined,
      contactPhone: values.contactPhone.trim() || undefined,
      address: values.address.trim() || undefined,
    };
    createMutation.mutate(payload);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Organization
          </DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new organization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Code */}
            <div className="space-y-2">
              <Label htmlFor="create-org-code">
                Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-org-code"
                placeholder="e.g. ORG-001"
                {...register("code", {
                  required: "Code is required",
                  minLength: {
                    value: 2,
                    message: "Code must be at least 2 characters",
                  },
                  maxLength: {
                    value: 20,
                    message: "Code must be 20 characters or fewer",
                  },
                })}
              />
              {errors.code && (
                <p className="text-xs text-red-500">{errors.code.message}</p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="create-org-name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-org-name"
                placeholder="Organization name"
                {...register("name", {
                  required: "Name is required",
                  minLength: {
                    value: 2,
                    message: "Name must be at least 2 characters",
                  },
                })}
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* Org Type */}
            <div className="space-y-2">
              <Label>Organization Type</Label>
              <Controller
                name="orgType"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || NONE_VALUE}
                    onValueChange={(v) =>
                      field.onChange(v === NONE_VALUE ? "" : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>None</SelectItem>
                      {ORG_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Tenant Type (use case) */}
            <div className="space-y-2">
              <Label>Tenant Use Case</Label>
              <Controller
                name="tenantType"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || "AxleLoadEnforcement"}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select use case" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AxleLoadEnforcement">Axle Load Enforcement</SelectItem>
                      <SelectItem value="CommercialWeighing">Commercial Weighing</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Contact Email */}
            <div className="space-y-2">
              <Label htmlFor="create-org-email">Contact Email</Label>
              <Input
                id="create-org-email"
                type="email"
                placeholder="contact@org.com"
                {...register("contactEmail", {
                  pattern: {
                    value: /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Enter a valid email address",
                  },
                })}
              />
              {errors.contactEmail && (
                <p className="text-xs text-red-500">
                  {errors.contactEmail.message}
                </p>
              )}
            </div>

            {/* Contact Phone */}
            <div className="space-y-2">
              <Label htmlFor="create-org-phone">Contact Phone</Label>
              <Input
                id="create-org-phone"
                placeholder="07xx xxx xxx"
                {...register("contactPhone")}
              />
            </div>

            {/* Address */}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="create-org-address">Address</Label>
              <Input
                id="create-org-address"
                placeholder="Physical address"
                {...register("address")}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              {createMutation.isPending
                ? "Creating..."
                : "Create Organization"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Edit Organization Dialog
// ---------------------------------------------------------------------------

function EditOrgDialog({
  org,
  open,
  onClose,
}: {
  org: OrganizationDto | null;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<EditOrgFormValues>({
    defaultValues: {
      code: "",
      name: "",
      orgType: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (org) {
      reset({
        code: org.code ?? "",
        name: org.name ?? "",
        orgType: org.orgType ?? "",
        contactEmail: org.contactEmail ?? "",
        contactPhone: org.contactPhone ?? "",
        address: org.address ?? "",
        isActive: org.isActive,
      });
    }
  }, [org, reset]);

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; payload: UpdateOrganizationRequest }) =>
      updateOrganization(input.id, input.payload),
    onSuccess: () => {
      toast.success("Organization updated successfully");
      queryClient.invalidateQueries({ queryKey: ["orgs"] });
      onClose();
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Failed to update organization";
      toast.error(message);
    },
  });

  function onSubmit(values: EditOrgFormValues) {
    if (!org) return;
    const payload: UpdateOrganizationRequest = {
      code: values.code.trim() || undefined,
      name: values.name.trim() || undefined,
      orgType: values.orgType || undefined,
      contactEmail: values.contactEmail.trim() || undefined,
      contactPhone: values.contactPhone.trim() || undefined,
      address: values.address.trim() || undefined,
      isActive: values.isActive,
    };
    updateMutation.mutate({ id: org.id, payload });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit Organization
          </DialogTitle>
          <DialogDescription>
            Update the details for{" "}
            <span className="font-medium">{org?.name}</span>.
          </DialogDescription>
        </DialogHeader>

        {org ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Code */}
              <div className="space-y-2">
                <Label htmlFor="edit-org-code">
                  Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-org-code"
                  placeholder="e.g. ORG-001"
                  {...register("code", {
                    required: "Code is required",
                    minLength: {
                      value: 2,
                      message: "Code must be at least 2 characters",
                    },
                    maxLength: {
                      value: 20,
                      message: "Code must be 20 characters or fewer",
                    },
                  })}
                />
                {errors.code && (
                  <p className="text-xs text-red-500">{errors.code.message}</p>
                )}
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="edit-org-name">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-org-name"
                  placeholder="Organization name"
                  {...register("name", {
                    required: "Name is required",
                    minLength: {
                      value: 2,
                      message: "Name must be at least 2 characters",
                    },
                  })}
                />
                {errors.name && (
                  <p className="text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>

              {/* Org Type */}
              <div className="space-y-2 sm:col-span-2">
                <Label>Organization Type</Label>
                <Controller
                  name="orgType"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || NONE_VALUE}
                      onValueChange={(v) =>
                        field.onChange(v === NONE_VALUE ? "" : v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>None</SelectItem>
                        {ORG_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Contact Email */}
              <div className="space-y-2">
                <Label htmlFor="edit-org-email">Contact Email</Label>
                <Input
                  id="edit-org-email"
                  type="email"
                  placeholder="contact@org.com"
                  {...register("contactEmail", {
                    pattern: {
                      value: /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Enter a valid email address",
                    },
                  })}
                />
                {errors.contactEmail && (
                  <p className="text-xs text-red-500">
                    {errors.contactEmail.message}
                  </p>
                )}
              </div>

              {/* Contact Phone */}
              <div className="space-y-2">
                <Label htmlFor="edit-org-phone">Contact Phone</Label>
                <Input
                  id="edit-org-phone"
                  placeholder="07xx xxx xxx"
                  {...register("contactPhone")}
                />
              </div>

              {/* Address */}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-org-address">Address</Label>
                <Input
                  id="edit-org-address"
                  placeholder="Physical address"
                  {...register("address")}
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-org-active" className="text-sm font-medium">
                    Active Status
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive organizations will not appear in standard listings.
                  </p>
                </div>
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="edit-org-active"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending || !isDirty}
              >
                {updateMutation.isPending && (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                )}
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Delete Organization Dialog
// ---------------------------------------------------------------------------

function DeleteOrgDialog({
  org,
  open,
  onClose,
}: {
  org: OrganizationDto | null;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOrganization(id),
    onSuccess: () => {
      toast.success("Organization deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["orgs"] });
      onClose();
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Failed to delete organization";
      toast.error(message);
    },
  });

  function handleConfirm() {
    if (!org) return;
    deleteMutation.mutate(org.id);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Organization
          </DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">
              You are about to permanently delete the organization{" "}
              <span className="font-semibold">{org?.name}</span>. Any users or
              data associated with this organization may be affected.
            </p>
          </div>

          {org && (
            <div className="flex items-center gap-3 rounded-lg border bg-gray-50 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                <Landmark className="h-4 w-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{org.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {org.code}
                  {org.orgType ? ` \u00b7 ${org.orgType}` : ""}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending && (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            )}
            <Trash2 className="mr-1.5 h-4 w-4" />
            {deleteMutation.isPending ? "Deleting..." : "Delete Organization"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function OrganizationsTab() {
  // -- State
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editOrg, setEditOrg] = useState<OrganizationDto | null>(null);
  const [deleteTargetOrg, setDeleteTargetOrg] = useState<OrganizationDto | null>(null);

  // -- Permissions
  const canManage = useHasPermission("system.manage_organizations");

  // -- Data
  const {
    data: orgs = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<OrganizationDto[]>({
    queryKey: ["orgs"],
    queryFn: () => fetchOrganizations(),
  });

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return orgs;
    const q = searchQuery.toLowerCase();
    return orgs.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.code.toLowerCase().includes(q) ||
        (o.contactEmail ?? "").toLowerCase().includes(q)
    );
  }, [orgs, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Card className="flex items-center gap-3 px-4 py-3">
          <div className="rounded-lg bg-blue-100 p-2">
            <Landmark className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Organizations</p>
            <p className="text-lg font-semibold">
              {isLoading ? "\u2013" : orgs.length}
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 px-4 py-3">
          <div className="rounded-lg bg-emerald-100 p-2">
            <Mail className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">With Contact</p>
            <p className="text-lg font-semibold">
              {isLoading
                ? "\u2013"
                : orgs.filter((o) => o.contactEmail).length}
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 px-4 py-3 col-span-2 lg:col-span-1">
          <div className="rounded-lg bg-violet-100 p-2">
            <Building className="h-4 w-4 text-violet-600" />
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
            placeholder="Search organizations..."
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
            <RefreshCw
              className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          {canManage && (
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create Organization
            </Button>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4 space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Landmark className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {searchQuery
              ? "No matching organizations"
              : "No organizations found"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {searchQuery
              ? "Try adjusting your search query."
              : "No organizations are configured in the system yet."}
          </p>
          {!searchQuery && canManage && (
            <Button
              className="mt-4"
              size="sm"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Create Organization
            </Button>
          )}
        </div>
      )}

      {/* Cards */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((org) => (
            <Card
              key={org.id}
              className="overflow-hidden hover:shadow-md transition-shadow duration-200"
            >
              <div
                className={`h-1.5 ${
                  org.isActive
                    ? "bg-gradient-to-r from-blue-500 to-blue-400"
                    : "bg-gradient-to-r from-gray-400 to-gray-300"
                }`}
              />
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-foreground truncate">
                      {org.name}
                    </h4>
                    <p className="text-xs font-mono text-muted-foreground">
                      {org.code}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {org.orgType && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] border-0 ${getTypeColor(org.orgType)}`}
                      >
                        {org.orgType}
                      </Badge>
                    )}
                    {!org.isActive && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-gray-300 bg-gray-100 text-gray-500"
                      >
                        Inactive
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  {org.contactEmail && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{org.contactEmail}</span>
                    </div>
                  )}
                  {org.contactPhone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3 flex-shrink-0" />
                      <span>{org.contactPhone}</span>
                    </div>
                  )}
                  {org.address && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{org.address}</span>
                    </div>
                  )}
                  {!org.contactEmail && !org.contactPhone && !org.address && (
                    <p className="text-xs text-muted-foreground/60 italic">
                      No contact info
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                {canManage && (
                  <div className="flex items-center justify-end gap-1 border-t pt-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Edit organization"
                      onClick={() => setEditOrg(org)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Delete organization"
                      onClick={() => setDeleteTargetOrg(org)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      {canManage && (
        <>
          <CreateOrgDialog
            open={createDialogOpen}
            onClose={() => setCreateDialogOpen(false)}
          />

          <EditOrgDialog
            org={editOrg}
            open={editOrg !== null}
            onClose={() => setEditOrg(null)}
          />

          <DeleteOrgDialog
            org={deleteTargetOrg}
            open={deleteTargetOrg !== null}
            onClose={() => setDeleteTargetOrg(null)}
          />
        </>
      )}
    </div>
  );
}
