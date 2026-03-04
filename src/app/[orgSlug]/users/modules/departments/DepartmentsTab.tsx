"use client";

import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building2,
  Landmark,
  Loader2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { useHasPermission } from "@/hooks/useAuth";
import {
  createDepartment,
  deleteDepartment,
  fetchDepartments,
  fetchOrganizations,
  updateDepartment,
} from "@/lib/api/setup";
import type {
  CreateDepartmentRequest,
  DepartmentDto,
  OrganizationDto,
  UpdateDepartmentRequest,
} from "@/types/setup";

// ---------------------------------------------------------------------------
// Sub-components: Create Department Dialog
// ---------------------------------------------------------------------------

interface CreateDepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateDepartmentDialog({ open, onOpenChange }: CreateDepartmentDialogProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateDepartmentRequest>({
    defaultValues: { organizationId: "", code: "", name: "", description: "" },
  });

  const { data: organizations = [], isLoading: orgsLoading } = useQuery<OrganizationDto[]>({
    queryKey: ["organizations"],
    queryFn: () => fetchOrganizations(),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (data: CreateDepartmentRequest) => createDepartment(data),
    onSuccess: () => {
      toast.success("Department created successfully");
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      reset();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error("Failed to create department", { description: err.message });
    },
  });

  const onSubmit = (data: CreateDepartmentRequest) => {
    mutation.mutate({
      ...data,
      code: data.code.trim(),
      name: data.name.trim(),
      description: data.description?.trim() || undefined,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Department</DialogTitle>
          <DialogDescription>
            Add a new department to your organization structure.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Organization */}
          <div className="space-y-2">
            <Label htmlFor="create-dept-org">
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
                  disabled={orgsLoading}
                >
                  <SelectTrigger id="create-dept-org">
                    <SelectValue
                      placeholder={orgsLoading ? "Loading organizations..." : "Select an organization"}
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

          {/* Code */}
          <div className="space-y-2">
            <Label htmlFor="create-dept-code">
              Code <span className="text-destructive">*</span>
            </Label>
            <Input
              id="create-dept-code"
              placeholder="e.g. HR, FIN, OPS"
              {...register("code", {
                required: "Department code is required",
                minLength: { value: 2, message: "Code must be at least 2 characters" },
                maxLength: { value: 20, message: "Code must not exceed 20 characters" },
              })}
            />
            {errors.code && (
              <p className="text-xs text-destructive">{errors.code.message}</p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="create-dept-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="create-dept-name"
              placeholder="e.g. Human Resources"
              {...register("name", {
                required: "Department name is required",
                minLength: { value: 2, message: "Name must be at least 2 characters" },
                maxLength: { value: 100, message: "Name must not exceed 100 characters" },
              })}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="create-dept-description">Description</Label>
            <Textarea
              id="create-dept-description"
              placeholder="Brief description of this department..."
              rows={3}
              {...register("description", {
                maxLength: { value: 500, message: "Description must not exceed 500 characters" },
              })}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

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
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Department
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Sub-components: Edit Department Dialog
// ---------------------------------------------------------------------------

interface EditDepartmentDialogProps {
  department: DepartmentDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function EditDepartmentDialog({ department, open, onOpenChange }: EditDepartmentDialogProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UpdateDepartmentRequest>({
    values: department
      ? {
          code: department.code,
          name: department.name,
          description: department.description ?? "",
          isActive: department.isActive,
        }
      : { code: "", name: "", description: "", isActive: true },
  });

  const isActive = watch("isActive");

  const mutation = useMutation({
    mutationFn: (data: UpdateDepartmentRequest) => updateDepartment(department!.id, data),
    onSuccess: () => {
      toast.success("Department updated successfully");
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error("Failed to update department", { description: err.message });
    },
  });

  const onSubmit = (data: UpdateDepartmentRequest) => {
    mutation.mutate({
      ...data,
      code: data.code?.trim(),
      name: data.name?.trim(),
      description: data.description?.trim() || undefined,
    });
  };

  if (!department) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Department</DialogTitle>
          <DialogDescription>
            Update the details for <span className="font-medium">{department.name}</span>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Organization (read-only) */}
          <div className="space-y-2">
            <Label>Organization</Label>
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
              <Landmark className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {department.organizationName || "Unknown Organization"}
              </span>
            </div>
          </div>

          {/* Code */}
          <div className="space-y-2">
            <Label htmlFor="edit-dept-code">
              Code <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-dept-code"
              {...register("code", {
                required: "Department code is required",
                minLength: { value: 2, message: "Code must be at least 2 characters" },
                maxLength: { value: 20, message: "Code must not exceed 20 characters" },
              })}
            />
            {errors.code && (
              <p className="text-xs text-destructive">{errors.code.message}</p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-dept-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-dept-name"
              {...register("name", {
                required: "Department name is required",
                minLength: { value: 2, message: "Name must be at least 2 characters" },
                maxLength: { value: 100, message: "Name must not exceed 100 characters" },
              })}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-dept-description">Description</Label>
            <Textarea
              id="edit-dept-description"
              rows={3}
              {...register("description", {
                maxLength: { value: 500, message: "Description must not exceed 500 characters" },
              })}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="edit-dept-active" className="text-sm font-medium">
                Active Status
              </Label>
              <p className="text-xs text-muted-foreground">
                Inactive departments are hidden from selection dropdowns
              </p>
            </div>
            <Switch
              id="edit-dept-active"
              checked={isActive ?? true}
              onCheckedChange={(checked) => setValue("isActive", checked)}
            />
          </div>

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
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Sub-components: Delete Department Dialog
// ---------------------------------------------------------------------------

interface DeleteDepartmentDialogProps {
  department: DepartmentDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DeleteDepartmentDialog({ department, open, onOpenChange }: DeleteDepartmentDialogProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deleteDepartment(department!.id),
    onSuccess: () => {
      toast.success("Department deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error("Failed to delete department", { description: err.message });
    },
  });

  if (!department) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Department
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the department and may
            affect users currently assigned to it.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-foreground">You are about to delete:</p>
          <div className="mt-2 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-destructive" />
            <span className="text-sm font-semibold">{department.name}</span>
            <Badge variant="outline" className="font-mono text-xs">
              {department.code}
            </Badge>
          </div>
          {department.organizationName && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Organization: {department.organizationName}
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
            Delete Department
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DepartmentsTab() {
  const canManageDepartments = useHasPermission("system.manage_departments");

  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editDept, setEditDept] = useState<DepartmentDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DepartmentDto | null>(null);

  const {
    data: departments = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<DepartmentDto[]>({
    queryKey: ["departments"],
    queryFn: () => fetchDepartments(true),
  });

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return departments;
    const q = searchQuery.toLowerCase();
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        (d.description ?? "").toLowerCase().includes(q) ||
        (d.organizationName ?? "").toLowerCase().includes(q),
    );
  }, [departments, searchQuery]);

  const activeCount = useMemo(
    () => departments.filter((d) => d.isActive).length,
    [departments],
  );

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Card className="flex items-center gap-3 px-4 py-3">
          <div className="rounded-lg bg-orange-100 p-2">
            <Building2 className="h-4 w-4 text-orange-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Departments</p>
            <p className="text-lg font-semibold">
              {isLoading ? "\u2013" : departments.length}
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 px-4 py-3">
          <div className="rounded-lg bg-emerald-100 p-2">
            <Building2 className="h-4 w-4 text-emerald-600" />
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
            placeholder="Search departments..."
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
          {canManageDepartments && (
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Department</span>
              <span className="sm:hidden">New</span>
            </Button>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-1.5 w-full rounded-none" />
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex items-center justify-end gap-1 pt-2 border-t">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Building2 className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {searchQuery ? "No matching departments" : "No departments found"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {searchQuery
              ? "Try adjusting your search query or clear the filter to see all departments."
              : "No departments are configured in the system yet. Get started by creating one."}
          </p>
          {!searchQuery && canManageDepartments && (
            <Button
              size="sm"
              className="mt-4 gap-1.5"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create Department
            </Button>
          )}
        </div>
      )}

      {/* Cards */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((dept) => (
            <Card
              key={dept.id}
              className="overflow-hidden group hover:shadow-md transition-shadow duration-200"
            >
              <div className="h-1.5 bg-gradient-to-r from-orange-500 to-orange-400" />
              <div className="p-4 space-y-3">
                {/* Header: name + status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-foreground truncate">
                      {dept.name}
                    </h4>
                    <Badge variant="outline" className="mt-1 font-mono text-[10px] px-1.5">
                      {dept.code}
                    </Badge>
                  </div>
                  <Badge
                    className={`text-[10px] shrink-0 ${
                      dept.isActive
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {dept.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {/* Organization badge */}
                {dept.organizationName && (
                  <div className="flex items-center gap-1.5">
                    <Landmark className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-normal truncate max-w-full"
                    >
                      {dept.organizationName}
                    </Badge>
                  </div>
                )}

                {/* Description */}
                {dept.description ? (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {dept.description}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground/60 italic">No description</p>
                )}

                {/* Actions */}
                {canManageDepartments && (
                  <div className="flex items-center justify-end gap-0.5 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => setEditDept(dept)}
                      title="Edit department"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(dept)}
                      title="Delete department"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <CreateDepartmentDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditDepartmentDialog
        department={editDept}
        open={!!editDept}
        onOpenChange={(v) => {
          if (!v) setEditDept(null);
        }}
      />
      <DeleteDepartmentDialog
        department={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
      />
    </div>
  );
}
