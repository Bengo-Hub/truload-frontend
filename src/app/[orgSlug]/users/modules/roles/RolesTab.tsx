"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Edit3,
  Eye,
  Key,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldOff,
  Trash2,
  XCircle,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { PermissionActionButton } from "@/components/ui/permission-action-button";
import { useAuth, useHasPermission } from "@/hooks/useAuth";
import { useCanDelete } from "@/hooks/useCanDelete";
import {
  assignPermissionsToRole,
  createRole,
  deleteRole,
  fetchPermissions,
  fetchRolePermissions,
  fetchRoles,
  updateRole,
} from "@/lib/api/setup";
import type {
  CreateRoleRequest,
  PermissionDto,
  RoleDto,
  UpdateRoleRequest,
} from "@/types/setup";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLE_GRADIENT_MAP: Record<string, string> = {
  SUPERUSER: "from-red-600 to-red-500",
  SUPER_USER: "from-red-600 to-red-500",
  SYSTEM_ADMIN: "from-purple-600 to-purple-500",
  STATION_MANAGER: "from-blue-600 to-blue-500",
  WEIGHBRIDGE_OPERATOR: "from-sky-600 to-sky-500",
  ENFORCEMENT_OFFICER: "from-amber-600 to-amber-500",
  CLERK: "from-emerald-600 to-emerald-500",
  AUDITOR: "from-teal-600 to-teal-500",
  VIEWER: "from-gray-600 to-gray-500",
  PROSECUTOR: "from-rose-600 to-rose-500",
  FINANCE_OFFICER: "from-orange-600 to-orange-500",
};

const FALLBACK_GRADIENTS = [
  "from-indigo-600 to-indigo-500",
  "from-cyan-600 to-cyan-500",
  "from-fuchsia-600 to-fuchsia-500",
  "from-lime-600 to-lime-500",
  "from-pink-600 to-pink-500",
  "from-violet-600 to-violet-500",
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  Weighing:      { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    badge: "bg-blue-100 text-blue-800" },
  Yard:          { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-800" },
  Tag:           { bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200",  badge: "bg-violet-100 text-violet-800" },
  Case:          { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   badge: "bg-amber-100 text-amber-800" },
  Prosecution:   { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200",     badge: "bg-red-100 text-red-800" },
  User:          { bg: "bg-cyan-50",    text: "text-cyan-700",    border: "border-cyan-200",    badge: "bg-cyan-100 text-cyan-800" },
  Station:       { bg: "bg-indigo-50",  text: "text-indigo-700",  border: "border-indigo-200",  badge: "bg-indigo-100 text-indigo-800" },
  Configuration: { bg: "bg-gray-50",    text: "text-gray-700",    border: "border-gray-200",    badge: "bg-gray-100 text-gray-800" },
  Analytics:     { bg: "bg-teal-50",    text: "text-teal-700",    border: "border-teal-200",    badge: "bg-teal-100 text-teal-800" },
  Financial:     { bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200",  badge: "bg-orange-100 text-orange-800" },
  System:        { bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200",    badge: "bg-rose-100 text-rose-800" },
};

const DEFAULT_CATEGORY_COLOR = {
  bg: "bg-slate-50",
  text: "text-slate-700",
  border: "border-slate-200",
  badge: "bg-slate-100 text-slate-800",
};

const CATEGORY_ORDER = [
  "Weighing",
  "Yard",
  "Tag",
  "Case",
  "Prosecution",
  "User",
  "Station",
  "Configuration",
  "Analytics",
  "Financial",
  "System",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRoleGradient(role: RoleDto): string {
  const code = (role.code ?? role.name).toUpperCase().replace(/[\s-]+/g, "_");
  if (ROLE_GRADIENT_MAP[code]) return ROLE_GRADIENT_MAP[code];

  // Deterministic fallback based on role id
  let hash = 0;
  for (let i = 0; i < (role.id ?? "").length; i++) {
    hash = ((hash << 5) - hash + role.id.charCodeAt(i)) | 0;
  }
  return FALLBACK_GRADIENTS[Math.abs(hash) % FALLBACK_GRADIENTS.length];
}

function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] ?? DEFAULT_CATEGORY_COLOR;
}

function groupPermissionsByCategory(permissions: PermissionDto[]): Record<string, PermissionDto[]> {
  const grouped: Record<string, PermissionDto[]> = {};
  for (const perm of permissions) {
    const cat = perm.category || "Uncategorized";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(perm);
  }
  // Sort permissions within each category by name
  for (const cat of Object.keys(grouped)) {
    grouped[cat].sort((a, b) => a.name.localeCompare(b.name));
  }
  return grouped;
}

function sortedCategoryKeys(grouped: Record<string, PermissionDto[]>): string[] {
  const keys = Object.keys(grouped);
  return keys.sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    const aIdx = ai === -1 ? 999 : ai;
    const bIdx = bi === -1 ? 999 : bi;
    if (aIdx !== bIdx) return aIdx - bIdx;
    return a.localeCompare(b);
  });
}

// ---------------------------------------------------------------------------
// Sub-components: Skeleton loader
// ---------------------------------------------------------------------------

function RoleCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-2 w-full rounded-none" />
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
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-5 w-28 rounded-full" />
          <div className="flex gap-1">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sub-components: Empty state
// ---------------------------------------------------------------------------

function EmptyState({ searchActive }: { searchActive: boolean }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Shield className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        {searchActive ? "No matching roles" : "No roles found"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {searchActive
          ? "Try adjusting your search query or clear the filter to see all roles."
          : "Get started by creating your first role. Roles define what users can access in the system."}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components: Create Role Dialog
// ---------------------------------------------------------------------------

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateRoleDialog({ open, onOpenChange }: CreateRoleDialogProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateRoleRequest>({
    defaultValues: { name: "", description: "" },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateRoleRequest) => createRole(data),
    onSuccess: () => {
      toast.success("Role created successfully");
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      reset();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error("Failed to create role", { description: err.message });
    },
  });

  const onSubmit = (data: CreateRoleRequest) => {
    mutation.mutate({ ...data, name: data.name.trim(), description: data.description?.trim() || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Role</DialogTitle>
          <DialogDescription>
            Define a new role that can be assigned to users. You can add permissions after creation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-role-name">
              Role Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="create-role-name"
              placeholder="e.g. Station Manager"
              {...register("name", {
                required: "Role name is required",
                minLength: { value: 2, message: "Name must be at least 2 characters" },
                maxLength: { value: 100, message: "Name must not exceed 100 characters" },
              })}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-role-description">Description</Label>
            <Textarea
              id="create-role-description"
              placeholder="Brief description of this role's purpose..."
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
            <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Sub-components: Edit Role Dialog
// ---------------------------------------------------------------------------

interface EditRoleDialogProps {
  role: RoleDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function EditRoleDialog({ role, open, onOpenChange }: EditRoleDialogProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UpdateRoleRequest>({
    values: role
      ? { name: role.name, description: role.description ?? "", isActive: role.isActive }
      : { name: "", description: "", isActive: true },
  });

  const isActive = watch("isActive");

  const mutation = useMutation({
    mutationFn: (data: UpdateRoleRequest) => updateRole(role!.id, data),
    onSuccess: () => {
      toast.success("Role updated successfully");
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error("Failed to update role", { description: err.message });
    },
  });

  const onSubmit = (data: UpdateRoleRequest) => {
    mutation.mutate({
      ...data,
      name: data.name?.trim(),
      description: data.description?.trim() || undefined,
    });
  };

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Role</DialogTitle>
          <DialogDescription>
            Update the details for <span className="font-medium">{role.name}</span>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-role-name">
              Role Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-role-name"
              {...register("name", {
                required: "Role name is required",
                minLength: { value: 2, message: "Name must be at least 2 characters" },
                maxLength: { value: 100, message: "Name must not exceed 100 characters" },
              })}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-role-description">Description</Label>
            <Textarea
              id="edit-role-description"
              rows={3}
              {...register("description", {
                maxLength: { value: 500, message: "Description must not exceed 500 characters" },
              })}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="edit-role-active" className="text-sm font-medium">
                Active Status
              </Label>
              <p className="text-xs text-muted-foreground">
                Inactive roles cannot be assigned to users
              </p>
            </div>
            <Switch
              id="edit-role-active"
              checked={isActive ?? true}
              onCheckedChange={(checked) => setValue("isActive", checked)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
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
// Sub-components: View Role Dialog
// ---------------------------------------------------------------------------

interface ViewRoleDialogProps {
  role: RoleDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ViewRoleDialog({ role, open, onOpenChange }: ViewRoleDialogProps) {
  const { data: rolePerms, isLoading } = useQuery({
    queryKey: ["rolePermissions", role?.id],
    queryFn: () => fetchRolePermissions(role!.id),
    enabled: open && !!role,
  });

  const grouped = useMemo(
    () => (rolePerms ? groupPermissionsByCategory(rolePerms.permissions) : {}),
    [rolePerms],
  );
  const categories = useMemo(() => sortedCategoryKeys(grouped), [grouped]);

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {role.name}
          </DialogTitle>
          <DialogDescription>Role details and assigned permissions</DialogDescription>
        </DialogHeader>

        {/* Role info */}
        <div className="space-y-3 border-b pb-4">
          <div className="flex flex-wrap items-center gap-2">
            {role.code && (
              <Badge variant="outline" className="font-mono text-xs">
                {role.code}
              </Badge>
            )}
            <Badge
              className={
                role.isActive
                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-100"
              }
            >
              {role.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          {role.description && (
            <p className="text-sm text-muted-foreground">{role.description}</p>
          )}
        </div>

        {/* Permissions */}
        <div className="flex-1 min-h-0">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-foreground">Assigned Permissions</h4>
            {rolePerms && (
              <Badge variant="secondary" className="text-xs">
                {rolePerms.permissions.length} total
              </Badge>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : !rolePerms || rolePerms.permissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ShieldOff className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No permissions assigned to this role.</p>
            </div>
          ) : (
            <ScrollArea className="h-[320px] pr-3">
              <div className="space-y-3">
                {categories.map((cat) => {
                  const colors = getCategoryColor(cat);
                  const perms = grouped[cat];
                  return (
                    <div key={cat} className={`rounded-lg border ${colors.border} ${colors.bg} p-3`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-semibold uppercase tracking-wider ${colors.text}`}>
                          {cat}
                        </span>
                        <Badge className={`text-[10px] ${colors.badge} border-0`}>
                          {perms.length}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {perms.map((perm) => (
                          <span
                            key={perm.id}
                            className="inline-flex items-center rounded-md bg-white/70 px-2 py-0.5 text-xs font-medium text-foreground border"
                          >
                            {perm.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Sub-components: Delete Role Dialog
// ---------------------------------------------------------------------------

interface DeleteRoleDialogProps {
  role: RoleDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DeleteRoleDialog({ role, open, onOpenChange }: DeleteRoleDialogProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deleteRole(role!.id),
    onSuccess: () => {
      toast.success("Role deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error("Failed to delete role", { description: err.message });
    },
  });

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Role
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the role and remove
            it from all associated users.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-foreground">
            You are about to delete:
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Shield className="h-4 w-4 text-destructive" />
            <span className="text-sm font-semibold">{role.name}</span>
            {role.code && (
              <Badge variant="outline" className="font-mono text-xs">
                {role.code}
              </Badge>
            )}
          </div>
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
            Delete Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Sub-components: Permission Management Dialog
// ---------------------------------------------------------------------------

interface PermissionManagementDialogProps {
  role: RoleDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function PermissionManagementDialog({ role, open, onOpenChange }: PermissionManagementDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);

  // Fetch all system permissions
  const { data: allPermissions = [], isLoading: loadingPermissions } = useQuery({
    queryKey: ["permissions", user?.tenantUseCase],
    queryFn: () => fetchPermissions(user?.tenantUseCase),
    enabled: open,
  });

  // Fetch current role permissions
  const { data: rolePerms, isLoading: loadingRolePerms } = useQuery({
    queryKey: ["rolePermissions", role?.id],
    queryFn: () => fetchRolePermissions(role!.id),
    enabled: open && !!role,
  });

  // Initialize selected IDs from current role permissions
  useMemo(() => {
    if (rolePerms && !initialized) {
      setSelectedIds(new Set(rolePerms.permissions.map((p) => p.id)));
      // Expand all categories that have assigned permissions
      const cats = new Set(rolePerms.permissions.map((p) => p.category || "Uncategorized"));
      setExpandedCategories(cats);
      setInitialized(true);
    }
  }, [rolePerms, initialized]);

  // Reset state when dialog opens/closes
  useMemo(() => {
    if (!open) {
      setInitialized(false);
      setSearchQuery("");
      setExpandedCategories(new Set());
    }
  }, [open]);

  const grouped = useMemo(() => groupPermissionsByCategory(allPermissions), [allPermissions]);
  const categories = useMemo(() => sortedCategoryKeys(grouped), [grouped]);

  // Filter permissions by search
  const filteredGrouped = useMemo(() => {
    if (!searchQuery.trim()) return grouped;
    const q = searchQuery.toLowerCase();
    const result: Record<string, PermissionDto[]> = {};
    for (const [cat, perms] of Object.entries(grouped)) {
      const filtered = perms.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          cat.toLowerCase().includes(q),
      );
      if (filtered.length > 0) result[cat] = filtered;
    }
    return result;
  }, [grouped, searchQuery]);

  const filteredCategories = useMemo(() => sortedCategoryKeys(filteredGrouped), [filteredGrouped]);

  const totalPermissions = allPermissions.length;
  const selectedCount = selectedIds.size;

  const togglePermission = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleCategory = useCallback(
    (category: string, perms: PermissionDto[]) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        const allSelected = perms.every((p) => next.has(p.id));
        if (allSelected) {
          perms.forEach((p) => next.delete(p.id));
        } else {
          perms.forEach((p) => next.add(p.id));
        }
        return next;
      });
    },
    [],
  );

  const toggleExpanded = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedCategories(new Set(categories));
  }, [categories]);

  const collapseAll = useCallback(() => {
    setExpandedCategories(new Set());
  }, []);

  const mutation = useMutation({
    mutationFn: () =>
      assignPermissionsToRole(role!.id, { permissionIds: Array.from(selectedIds) }),
    onSuccess: () => {
      toast.success("Permissions updated successfully");
      queryClient.invalidateQueries({ queryKey: ["rolePermissions", role!.id] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error("Failed to update permissions", { description: err.message });
    },
  });

  const isLoading = loadingPermissions || loadingRolePerms;

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col overflow-hidden p-0">
        {/* Header - fixed */}
        <div className="shrink-0 px-6 pt-6 pb-4 border-b space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Manage Permissions
            </DialogTitle>
            <DialogDescription>
              Configure permissions for <span className="font-medium">{role.name}</span>.
              Select which permissions this role should have access to.
            </DialogDescription>
          </DialogHeader>

          {/* Search + stats bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search permissions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant="secondary" className="whitespace-nowrap">
                {selectedCount} of {totalPermissions} selected
              </Badge>
              <Button type="button" variant="ghost" size="sm" onClick={expandAll} className="text-xs">
                Expand All
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={collapseAll} className="text-xs">
                Collapse All
              </Button>
            </div>
          </div>
        </div>

        {/* Permission categories - scrollable middle: explicit max-height + overflow-auto */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-4"
          style={{ maxHeight: 'min(calc(90vh - 220px), 480px)' }}
        >
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No permissions match your search.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCategories.map((cat) => {
                const perms = filteredGrouped[cat];
                const colors = getCategoryColor(cat);
                const isExpanded = expandedCategories.has(cat);
                const selectedInCategory = perms.filter((p) => selectedIds.has(p.id)).length;
                const allInCategorySelected = selectedInCategory === perms.length;
                const _someInCategorySelected = selectedInCategory > 0 && !allInCategorySelected;

                return (
                  <div
                    key={cat}
                    className={`rounded-lg border ${colors.border} overflow-hidden transition-colors`}
                  >
                    {/* Category header */}
                    <button
                      type="button"
                      onClick={() => toggleExpanded(cat)}
                      className={`w-full flex items-center justify-between px-4 py-3 ${colors.bg} hover:opacity-90 transition-opacity`}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className={`h-4 w-4 ${colors.text}`} />
                        ) : (
                          <ChevronRight className={`h-4 w-4 ${colors.text}`} />
                        )}
                        <span className={`text-sm font-semibold ${colors.text}`}>{cat}</span>
                        <Badge className={`text-[10px] ${colors.badge} border-0`}>
                          {selectedInCategory}/{perms.length}
                        </Badge>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCategory(cat, perms);
                        }}
                        className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
                          allInCategorySelected
                            ? "text-destructive hover:bg-destructive/10"
                            : `${colors.text} hover:bg-white/50`
                        }`}
                      >
                        {allInCategorySelected ? "Deselect All" : "Select All"}
                      </button>
                    </button>

                    {/* Permission checkboxes */}
                    {isExpanded && (
                      <div className="px-4 py-3 bg-white/50 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {perms.map((perm) => {
                          const isSelected = selectedIds.has(perm.id);
                          return (
                            <label
                              key={perm.id}
                              className={`flex items-start gap-2.5 rounded-md px-3 py-2 cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-primary/5 border border-primary/20"
                                  : "hover:bg-muted/50 border border-transparent"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => togglePermission(perm.id)}
                                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/50"
                              />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-foreground block truncate">
                                  {perm.name}
                                </span>
                                <span className="text-[11px] text-muted-foreground font-mono block truncate">
                                  {perm.code}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer - fixed */}
        <div className="shrink-0 px-6 py-4 border-t bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {selectedCount === 0
              ? "No permissions selected"
              : `${selectedCount} permission${selectedCount !== 1 ? "s" : ""} will be assigned to this role`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Permissions
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Sub-components: Role Card
// ---------------------------------------------------------------------------

interface RoleCardProps {
  role: RoleDto;
  permissionCount: number | null;
  onView: (role: RoleDto) => void;
  onEdit: (role: RoleDto) => void;
  onManagePermissions: (role: RoleDto) => void;
  onDelete: (role: RoleDto) => void;
}

function RoleCard({
  role,
  permissionCount,
  onView,
  onEdit,
  onManagePermissions,
  onDelete,
}: RoleCardProps) {
  const gradient = getRoleGradient(role);
  const canDelete = useCanDelete();

  return (
    <Card className="overflow-hidden group hover:shadow-md transition-shadow duration-200">
      {/* Gradient header strip */}
      <div className={`h-2 bg-gradient-to-r ${gradient}`} />

      <div className="p-4 space-y-3">
        {/* Top row: name + status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">{role.name}</h3>
            {role.code && (
              <Badge variant="outline" className="mt-1 font-mono text-[10px] px-1.5">
                {role.code}
              </Badge>
            )}
          </div>
          <Badge
            className={`text-[10px] shrink-0 ${
              role.isActive
                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                : "bg-gray-100 text-gray-600 hover:bg-gray-100"
            }`}
          >
            {role.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
          {role.description || "No description provided"}
        </p>

        {/* Footer: permission count + actions */}
        <div className="flex items-center justify-between pt-1 border-t">
          <Badge variant="secondary" className="text-[10px] gap-1">
            <Key className="h-3 w-3" />
            {permissionCount !== null ? `${permissionCount} permissions` : "..."}
          </Badge>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={() => onView(role)}
              title="View role details"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <PermissionActionButton
              permission="system.manage_roles"
              icon={Edit3}
              label="Edit role"
              size="icon"
              onClick={() => onEdit(role)}
              className="h-8 w-8 text-muted-foreground hover:text-primary"
            />
            <PermissionActionButton
              permission="user.manage_permissions"
              icon={Key}
              label="Manage permissions"
              size="icon"
              onClick={() => onManagePermissions(role)}
              className="h-8 w-8 text-muted-foreground hover:text-violet-600"
            />
            {canDelete && (
              <PermissionActionButton
                permission="system.manage_roles"
                icon={Trash2}
                label="Delete role"
                size="icon"
                destructive
                onClick={() => onDelete(role)}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              />
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function RolesTab() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManageRoles = useHasPermission("system.manage_roles");

  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editRole, setEditRole] = useState<RoleDto | null>(null);
  const [viewRole, setViewRole] = useState<RoleDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleDto | null>(null);
  const [permRole, setPermRole] = useState<RoleDto | null>(null);

  // Fetch roles (include inactive so admins see everything)
  const {
    data: roles = [],
    isLoading,
    isRefetching,
  } = useQuery<RoleDto[]>({
    queryKey: ["roles", user?.tenantUseCase],
    queryFn: () => fetchRoles(true, user?.tenantUseCase),
  });

  // Fetch permission counts for all roles in a batch-like manner
  // We fetch each role's permissions individually but leverage react-query caching
  const permissionCountMap = useMemo(() => {
    const map: Record<string, number | null> = {};
    for (const role of roles) {
      map[role.id] = null; // Will be populated by individual queries
    }
    return map;
  }, [roles]);

  // We use a separate component-level approach: fetch all role permissions eagerly
  // This batches nicely with react-query dedup
  const rolePermQueries = useQuery({
    queryKey: ["allRolePermissionCounts", roles.map((r) => r.id).join(",")],
    queryFn: async () => {
      if (roles.length === 0) return {};
      const results: Record<string, number> = {};
      const promises = roles.map(async (role) => {
        try {
          const rp = await fetchRolePermissions(role.id);
          results[role.id] = rp.permissions.length;
        } catch {
          results[role.id] = 0;
        }
      });
      await Promise.all(promises);
      return results;
    },
    enabled: roles.length > 0,
    staleTime: 30_000,
  });

  const permCounts = rolePermQueries.data ?? permissionCountMap;

  // Filter roles by search
  const filteredRoles = useMemo(() => {
    if (!searchQuery.trim()) return roles;
    const q = searchQuery.toLowerCase();
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.code ?? "").toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q),
    );
  }, [roles, searchQuery]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["roles"] });
    queryClient.invalidateQueries({ queryKey: ["allRolePermissionCounts"] });
    toast.info("Refreshing roles...");
  }, [queryClient]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search roles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefetching}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          {canManageRoles && (
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Role</span>
              <span className="sm:hidden">New</span>
            </Button>
          )}
        </div>
      </div>

      {/* Summary bar */}
      {!isLoading && roles.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span>{roles.filter((r) => r.isActive).length} active</span>
          <span className="text-muted-foreground/40">|</span>
          <XCircle className="h-3.5 w-3.5 text-gray-400" />
          <span>{roles.filter((r) => !r.isActive).length} inactive</span>
          {searchQuery && (
            <>
              <span className="text-muted-foreground/40">|</span>
              <span>Showing {filteredRoles.length} of {roles.length}</span>
            </>
          )}
        </div>
      )}

      {/* Role cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <RoleCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredRoles.length === 0 ? (
        <EmptyState searchActive={!!searchQuery.trim()} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRoles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              permissionCount={permCounts[role.id] ?? null}
              onView={setViewRole}
              onEdit={setEditRole}
              onManagePermissions={setPermRole}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <CreateRoleDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditRoleDialog role={editRole} open={!!editRole} onOpenChange={(v) => { if (!v) setEditRole(null); }} />
      <ViewRoleDialog role={viewRole} open={!!viewRole} onOpenChange={(v) => { if (!v) setViewRole(null); }} />
      <DeleteRoleDialog role={deleteTarget} open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }} />
      <PermissionManagementDialog role={permRole} open={!!permRole} onOpenChange={(v) => { if (!v) setPermRole(null); }} />
    </div>
  );
}
