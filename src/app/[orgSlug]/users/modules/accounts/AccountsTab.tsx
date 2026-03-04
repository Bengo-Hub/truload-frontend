"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
    AlertTriangle,
    Building2,
    Download,
    Eye,
    Filter,
    KeyRound,
    Layers,
    Mail,
    MapPin,
    Pencil,
    Phone,
    Plus,
    RefreshCcw,
    Search,
    Shield,
    ShieldCheck,
    Trash2,
    UserCheck,
    UserPlus,
    Users,
    UsersRound,
    X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
import { Pagination, usePagination } from "@/components/ui/pagination";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useHasPermission } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/auth.store";
import {
    adminResetPassword,
    assignRoles,
    createUser,
    deleteUser,
    fetchDepartments,
    fetchOrganizations,
    fetchRoles,
    fetchStations,
    fetchUsers,
    sendPasswordResetEmail,
    updateUser,
} from "@/lib/api/setup";
import type {
    CreateUserRequest,
    DepartmentDto,
    OrganizationDto,
    RoleDto,
    StationDto,
    UpdateUserRequest,
    UserSummary,
} from "@/types/setup";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLE_COLOR_MAP: Record<string, string> = {
  SUPERUSER: "bg-red-100 text-red-700 border-red-200",
  SYSTEM_ADMIN: "bg-purple-100 text-purple-700 border-purple-200",
  STATION_MANAGER: "bg-blue-100 text-blue-700 border-blue-200",
  WEIGHING_OPERATOR: "bg-emerald-100 text-emerald-700 border-emerald-200",
  ENFORCEMENT_OFFICER: "bg-amber-100 text-amber-700 border-amber-200",
  INSPECTOR: "bg-cyan-100 text-cyan-700 border-cyan-200",
  AUDITOR: "bg-orange-100 text-orange-700 border-orange-200",
};

const ROLE_CHIP_COLOR_MAP: Record<string, { active: string; inactive: string }> = {
  SUPERUSER: {
    active: "border-red-500 bg-red-50 text-red-700",
    inactive: "border-gray-200 text-gray-600 hover:border-red-300",
  },
  SYSTEM_ADMIN: {
    active: "border-purple-500 bg-purple-50 text-purple-700",
    inactive: "border-gray-200 text-gray-600 hover:border-purple-300",
  },
  STATION_MANAGER: {
    active: "border-blue-500 bg-blue-50 text-blue-700",
    inactive: "border-gray-200 text-gray-600 hover:border-blue-300",
  },
  WEIGHING_OPERATOR: {
    active: "border-emerald-500 bg-emerald-50 text-emerald-700",
    inactive: "border-gray-200 text-gray-600 hover:border-emerald-300",
  },
  ENFORCEMENT_OFFICER: {
    active: "border-amber-500 bg-amber-50 text-amber-700",
    inactive: "border-gray-200 text-gray-600 hover:border-amber-300",
  },
  INSPECTOR: {
    active: "border-cyan-500 bg-cyan-50 text-cyan-700",
    inactive: "border-gray-200 text-gray-600 hover:border-cyan-300",
  },
  AUDITOR: {
    active: "border-orange-500 bg-orange-50 text-orange-700",
    inactive: "border-gray-200 text-gray-600 hover:border-orange-300",
  },
};

const DEFAULT_CHIP_COLORS = {
  active: "border-emerald-500 bg-emerald-50 text-emerald-700",
  inactive: "border-gray-200 text-gray-600 hover:border-gray-300",
};

const AVATAR_GRADIENTS: Record<string, string> = {
  A: "from-red-400 to-pink-500",
  B: "from-orange-400 to-amber-500",
  C: "from-amber-400 to-yellow-500",
  D: "from-yellow-400 to-lime-500",
  E: "from-lime-400 to-green-500",
  F: "from-green-400 to-emerald-500",
  G: "from-emerald-400 to-teal-500",
  H: "from-teal-400 to-cyan-500",
  I: "from-cyan-400 to-sky-500",
  J: "from-sky-400 to-blue-500",
  K: "from-blue-400 to-indigo-500",
  L: "from-indigo-400 to-violet-500",
  M: "from-violet-400 to-purple-500",
  N: "from-purple-400 to-fuchsia-500",
  O: "from-fuchsia-400 to-pink-500",
  P: "from-pink-400 to-rose-500",
  Q: "from-rose-400 to-red-500",
  R: "from-red-500 to-orange-400",
  S: "from-orange-500 to-yellow-400",
  T: "from-teal-500 to-emerald-400",
  U: "from-blue-500 to-cyan-400",
  V: "from-violet-500 to-indigo-400",
  W: "from-emerald-500 to-lime-400",
  X: "from-sky-500 to-teal-400",
  Y: "from-amber-500 to-orange-400",
  Z: "from-indigo-500 to-blue-400",
};

const NONE_VALUE = "__none__";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name?: string, email?: string): string {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }
  if (email) return email.substring(0, 2).toUpperCase();
  return "??";
}

function getAvatarGradient(name?: string, email?: string): string {
  const letter = (name?.[0] ?? email?.[0] ?? "A").toUpperCase();
  return AVATAR_GRADIENTS[letter] ?? "from-gray-400 to-gray-500";
}

function getRoleBadgeClass(roleName: string): string {
  const upper = roleName.toUpperCase();
  return ROLE_COLOR_MAP[upper] ?? "bg-gray-100 text-gray-700 border-gray-200";
}

function getRoleChipClass(roleName: string, selected: boolean): string {
  const upper = roleName.toUpperCase();
  const colors = ROLE_CHIP_COLOR_MAP[upper] ?? DEFAULT_CHIP_COLORS;
  return selected ? colors.active : colors.inactive;
}

function rolesChanged(current: string[], selected: string[]): boolean {
  if (current.length !== selected.length) return true;
  const sorted1 = [...current].sort();
  const sorted2 = [...selected].sort();
  return sorted1.some((r, i) => r !== sorted2[i]);
}

function exportUsersToCSV(users: UserSummary[]) {
  const headers = [
    "Name",
    "Email",
    "Phone",
    "Roles",
    "Organization",
    "Station",
    "Status",
    "Last Login",
  ];
  const rows = users.map((u) => [
    u.fullName || "",
    u.email,
    u.phoneNumber || "",
    (u.roles || []).join("; "),
    u.organizationName || "",
    u.stationName || "",
    u.lastLoginAt ? "Active" : "Inactive",
    u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "",
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function UserAvatar({ user }: { user: UserSummary }) {
  const initials = getInitials(user.fullName, user.email);
  const gradient = getAvatarGradient(user.fullName, user.email);
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-xs font-bold text-white shadow-sm`}
    >
      {initials}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <Card className="flex items-center gap-3 px-4 py-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold leading-tight">{value}</p>
      </div>
    </Card>
  );
}

function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-4 w-36" /></TableCell>
          <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell className="hidden lg:table-cell">
            <div className="flex gap-1">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
          </TableCell>
          <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell className="hidden xl:table-cell"><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
          <TableCell className="hidden 2xl:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-8 w-20" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

function EmptyState({ search }: { search: string }) {
  return (
    <TableRow>
      <TableCell colSpan={9}>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <UsersRound className="h-7 w-7 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">No users found</p>
          <p className="mt-1 max-w-sm text-xs text-gray-500">
            {search
              ? `No users match "${search}". Try adjusting your search or filters.`
              : "There are no user accounts yet. Create one to get started."}
          </p>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ---------------------------------------------------------------------------
// Create User Dialog
// ---------------------------------------------------------------------------

interface CreateUserFormValues {
  email: string;
  fullName: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  organizationId: string;
  stationId: string;
  departmentId: string;
  roleNames: string[];
}

function CreateUserDialog({
  open,
  onClose,
  roles,
  orgs,
  stations,
  departments,
  stationSelectDisabled = false,
}: {
  open: boolean;
  onClose: () => void;
  roles: RoleDto[];
  orgs: OrganizationDto[];
  stations: StationDto[];
  departments: DepartmentDto[];
  /** When true, station dropdown shows only current user's station and is disabled (non-HQ/non-superuser). */
  stationSelectDisabled?: boolean;
}) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateUserFormValues>({
    defaultValues: {
      email: "",
      fullName: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
      organizationId: "",
      stationId: "",
      departmentId: "",
      roleNames: [],
    },
  });

  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const watchPassword = watch("password");

  const createMutation = useMutation({
    mutationFn: (payload: CreateUserRequest) => createUser(payload),
    onSuccess: () => {
      toast.success("User created successfully");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      handleClose();
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Failed to create user";
      toast.error(message);
    },
  });

  function handleClose() {
    reset();
    setSelectedRoles([]);
    onClose();
  }

  function onSubmit(values: CreateUserFormValues) {
    const payload: CreateUserRequest = {
      email: values.email,
      fullName: values.fullName || undefined,
      phoneNumber: values.phoneNumber || undefined,
      password: values.password,
      organizationId: values.organizationId || undefined,
      stationId: values.stationId || undefined,
      departmentId: values.departmentId || undefined,
      roleNames: selectedRoles.length > 0 ? selectedRoles : undefined,
    };
    createMutation.mutate(payload);
  }

  function toggleRole(name: string) {
    setSelectedRoles((prev) =>
      prev.includes(name) ? prev.filter((r) => r !== name) : [...prev, name]
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create New User
          </DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new user account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Email */}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="create-email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-email"
                type="email"
                placeholder="user@example.com"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Enter a valid email address",
                  },
                })}
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="create-fullName">Full Name</Label>
              <Input
                id="create-fullName"
                placeholder="Jane Doe"
                {...register("fullName")}
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="create-phone">Phone Number</Label>
              <Input
                id="create-phone"
                placeholder="07xx xxx xxx"
                {...register("phoneNumber")}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="create-password">
                Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-password"
                type="password"
                placeholder="Min 8 characters"
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters",
                  },
                })}
              />
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="create-confirmPassword">
                Confirm Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-confirmPassword"
                type="password"
                placeholder="Re-enter password"
                {...register("confirmPassword", {
                  required: "Please confirm password",
                  validate: (val) =>
                    val === watchPassword || "Passwords do not match",
                })}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-500">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Organization */}
            <div className="space-y-2">
              <Label>Organization</Label>
              <Controller
                name="organizationId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || NONE_VALUE}
                    onValueChange={(v) => field.onChange(v === NONE_VALUE ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>None</SelectItem>
                      {orgs.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Station - required for tenant users */}
            <div className="space-y-2">
              <Label>Station <span className="text-destructive">*</span></Label>
              <Controller
                name="stationId"
                control={control}
                rules={{
                  validate: (v) =>
                    watch("organizationId") && !v
                      ? "Station is required when creating a tenant user."
                      : true,
                }}
                render={({ field, fieldState }) => (
                  <>
                    <Select
                      value={field.value || NONE_VALUE}
                      onValueChange={(val) => field.onChange(val === NONE_VALUE ? "" : val)}
                      disabled={stationSelectDisabled}
                    >
                      <SelectTrigger className={fieldState.error ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select station" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>Select station...</SelectItem>
                        {stations.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.error && (
                      <p className="text-sm text-destructive">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </div>

            {/* Department */}
            <div className="space-y-2 sm:col-span-2">
              <Label>Department</Label>
              <Controller
                name="departmentId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || NONE_VALUE}
                    onValueChange={(v) => field.onChange(v === NONE_VALUE ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>None</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Roles */}
          <div className="space-y-2">
            <Label>Roles</Label>
            <div className="flex flex-wrap gap-2">
              {roles
                .filter((r) => r.isActive)
                .map((role) => {
                  const selected = selectedRoles.includes(role.name);
                  return (
                    <button
                      type="button"
                      key={role.id}
                      onClick={() => toggleRole(role.name)}
                      className={`rounded-full border px-3 py-1 text-sm font-medium transition-all ${getRoleChipClass(role.name, selected)}`}
                    >
                      {role.name}
                    </button>
                  );
                })}
            </div>
            <p className="text-xs text-muted-foreground">
              Click to toggle roles for this user.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Edit User Dialog
// ---------------------------------------------------------------------------

interface EditUserFormValues {
  fullName: string;
  phoneNumber: string;
  organizationId: string;
  stationId: string;
  departmentId: string;
}

function EditUserDialog({
  user,
  open,
  onClose,
  roles,
  orgs,
  stations,
  departments,
  canEdit,
  canAssignRoles,
  stationSelectDisabled = false,
}: {
  user: UserSummary | null;
  open: boolean;
  onClose: () => void;
  roles: RoleDto[];
  orgs: OrganizationDto[];
  stations: StationDto[];
  departments: DepartmentDto[];
  canEdit: boolean;
  canAssignRoles: boolean;
  /** When true, station dropdown shows only current user's station and is disabled (non-HQ/non-superuser). */
  stationSelectDisabled?: boolean;
}) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<EditUserFormValues>({
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      organizationId: "",
      stationId: "",
      departmentId: "",
    },
  });

  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      reset({
        fullName: user.fullName ?? "",
        phoneNumber: user.phoneNumber ?? "",
        organizationId: user.organizationId ?? "",
        stationId: user.stationId ?? "",
        departmentId: user.departmentId ?? "",
      });
      setSelectedRoles(user.roles ?? []);
    }
  }, [user, reset]);

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; payload: UpdateUserRequest }) =>
      updateUser(input.id, input.payload),
    onSuccess: () => {
      toast.success("User profile updated");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => toast.error("Failed to update user profile"),
  });

  const assignRolesMutation = useMutation({
    mutationFn: (input: { id: string; roleNames: string[] }) =>
      assignRoles(input.id, { roleNames: input.roleNames }),
    onSuccess: () => {
      toast.success("Roles updated successfully");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => toast.error("Failed to update roles"),
  });

  function handleClose() {
    onClose();
  }

  function onSubmitProfile(values: EditUserFormValues) {
    if (!user) return;
    const payload: UpdateUserRequest = {
      fullName: values.fullName || undefined,
      phoneNumber: values.phoneNumber || undefined,
      organizationId: values.organizationId || undefined,
      stationId: values.stationId || undefined,
      departmentId: values.departmentId || undefined,
    };
    updateMutation.mutate({ id: user.id, payload });
  }

  function handleSaveRoles() {
    if (!user) return;
    assignRolesMutation.mutate({ id: user.id, roleNames: selectedRoles });
  }

  function toggleRole(name: string) {
    setSelectedRoles((prev) =>
      prev.includes(name) ? prev.filter((r) => r !== name) : [...prev, name]
    );
  }

  const hasRoleChanges = user ? rolesChanged(user.roles ?? [], selectedRoles) : false;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit User
          </DialogTitle>
          <DialogDescription>
            Update user profile and role assignments for{" "}
            <span className="font-medium">{user?.fullName ?? user?.email}</span>.
          </DialogDescription>
        </DialogHeader>

        {user ? (
          <div className="space-y-6">
            {/* Profile section */}
            <form onSubmit={handleSubmit(onSubmitProfile)} className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Users className="h-4 w-4" />
                Profile Information
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-fullName">Full Name</Label>
                  <Input
                    id="edit-fullName"
                    placeholder="Jane Doe"
                    {...register("fullName")}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone Number</Label>
                  <Input
                    id="edit-phone"
                    placeholder="07xx xxx xxx"
                    {...register("phoneNumber")}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Organization</Label>
                  <Controller
                    name="organizationId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value || NONE_VALUE}
                        onValueChange={(v) => field.onChange(v === NONE_VALUE ? "" : v)}
                        disabled={!canEdit}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select organization" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>None</SelectItem>
                          {orgs.map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Station</Label>
                  <Controller
                    name="stationId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value || NONE_VALUE}
                        onValueChange={(v) => field.onChange(v === NONE_VALUE ? "" : v)}
                        disabled={!canEdit || stationSelectDisabled}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select station" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>None</SelectItem>
                          {stations.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Department</Label>
                  <Controller
                    name="departmentId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value || NONE_VALUE}
                        onValueChange={(v) => field.onChange(v === NONE_VALUE ? "" : v)}
                        disabled={!canEdit}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>None</SelectItem>
                          {departments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
              {canEdit && (
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending || isSubmitting || !isDirty}
                  >
                    {updateMutation.isPending ? "Saving..." : "Save Profile"}
                  </Button>
                </div>
              )}
            </form>

            {/* Roles section */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <ShieldCheck className="h-4 w-4" />
                Role Assignments
              </div>
              <div className="flex flex-wrap gap-2">
                {roles
                  .filter((r) => r.isActive)
                  .map((role) => {
                    const selected = selectedRoles.includes(role.name);
                    return (
                      <button
                        type="button"
                        key={role.id}
                        onClick={() => toggleRole(role.name)}
                        disabled={!canAssignRoles}
                        className={`rounded-full border px-3 py-1 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 ${getRoleChipClass(role.name, selected)}`}
                      >
                        {role.name}
                      </button>
                    );
                  })}
              </div>
              <p className="text-xs text-muted-foreground">
                Click to toggle roles. Permissions are derived from roles.
              </p>
              {canAssignRoles && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveRoles}
                    disabled={assignRolesMutation.isPending || !hasRoleChanges}
                  >
                    <ShieldCheck className="mr-1.5 h-4 w-4" />
                    {assignRolesMutation.isPending ? "Saving..." : "Save Roles"}
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={handleClose}>
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// View User Dialog
// ---------------------------------------------------------------------------

function ViewUserDialog({
  user,
  open,
  onClose,
}: {
  user: UserSummary | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            User Details
          </DialogTitle>
          <DialogDescription>
            Viewing profile for {user.fullName ?? user.email}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header with avatar */}
          <div className="flex items-center gap-4 rounded-lg border bg-gray-50/50 p-4">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(user.fullName, user.email)} text-lg font-bold text-white shadow`}
            >
              {getInitials(user.fullName, user.email)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">
                {user.fullName ?? "No name set"}
              </p>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <DetailItem icon={Mail} label="Email" value={user.email} />
            <DetailItem icon={Phone} label="Phone" value={user.phoneNumber} />
            <DetailItem icon={Building2} label="Organization" value={user.organizationName} />
            <DetailItem icon={MapPin} label="Station" value={user.stationName} />
            <DetailItem
              icon={Building2}
              label="Department"
              value={user.departmentName}
            />
            <DetailItem
              icon={UserCheck}
              label="Last Login"
              value={
                user.lastLoginAt
                  ? format(new Date(user.lastLoginAt), "dd MMM yyyy, HH:mm")
                  : undefined
              }
            />
            <DetailItem
              icon={UserPlus}
              label="Created"
              value={
                user.createdAt
                  ? format(new Date(user.createdAt), "dd MMM yyyy, HH:mm")
                  : undefined
              }
            />
          </div>

          {/* Roles */}
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <Shield className="h-4 w-4" />
              Roles
            </p>
            <div className="flex flex-wrap gap-1.5">
              {user.roles && user.roles.length > 0 ? (
                user.roles.map((role) => (
                  <Badge
                    key={role}
                    variant="outline"
                    className={`text-xs ${getRoleBadgeClass(role)}`}
                  >
                    {role}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">No roles assigned</span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-medium">{value || "\u2014"}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete Confirmation Dialog
// ---------------------------------------------------------------------------

function DeleteUserDialog({
  user,
  open,
  onClose,
}: {
  user: UserSummary | null;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      toast.success("User deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
    onError: () => toast.error("Failed to delete user"),
  });

  function handleConfirm() {
    if (!user) return;
    deleteMutation.mutate(user.id);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete User
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">
              You are about to permanently delete the user account for{" "}
              <span className="font-semibold">
                {user?.fullName ?? user?.email}
              </span>
              . All associated data will be removed.
            </p>
          </div>
          {user && (
            <div className="flex items-center gap-3 rounded-lg border bg-gray-50 p-3">
              <UserAvatar user={user} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {user.fullName ?? "No name"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} disabled={deleteMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            {deleteMutation.isPending ? "Deleting..." : "Delete User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Reset Password Dialog
// ---------------------------------------------------------------------------

function ResetPasswordDialog({
  user,
  open,
  onClose,
}: {
  user: UserSummary | null;
  open: boolean;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"choose" | "email" | "direct">("choose");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const emailResetMutation = useMutation({
    mutationFn: (email: string) => sendPasswordResetEmail(email),
    onSuccess: () => {
      toast.success("Password reset email sent", {
        description: `A password reset link has been sent to ${user?.email}`,
      });
      handleClose();
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Failed to send reset email";
      toast.error(message);
    },
  });

  const directResetMutation = useMutation({
    mutationFn: ({ userId, password, confirm }: { userId: string; password: string; confirm: string }) =>
      adminResetPassword(userId, password, confirm),
    onSuccess: () => {
      toast.success("Password reset successfully", {
        description: `Password for ${user?.email} has been updated.`,
      });
      handleClose();
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Failed to reset password";
      toast.error(message);
    },
  });

  const handleClose = () => {
    setMode("choose");
    setNewPassword("");
    setConfirmPassword("");
    onClose();
  };

  const isPending = emailResetMutation.isPending || directResetMutation.isPending;
  const passwordsMatch = newPassword === confirmPassword;
  const passwordValid = newPassword.length >= 8;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <KeyRound className="h-5 w-5" />
            Reset Password
          </DialogTitle>
          <DialogDescription>
            {mode === "choose" && "Choose how to reset the user's password."}
            {mode === "email" && "Send a password reset link to the user's email."}
            {mode === "direct" && "Set a new password directly for the user."}
          </DialogDescription>
        </DialogHeader>

        {user && (
          <div className="flex items-center gap-3 rounded-lg border bg-gray-50 p-3">
            <UserAvatar user={user} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {user.fullName ?? "No name"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
        )}

        {mode === "choose" && (
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3"
              onClick={() => setMode("direct")}
            >
              <KeyRound className="h-5 w-5 mr-3 text-amber-600" />
              <div className="text-left">
                <p className="font-medium">Set New Password</p>
                <p className="text-xs text-muted-foreground">Enter a new password directly</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3"
              onClick={() => setMode("email")}
            >
              <Mail className="h-5 w-5 mr-3 text-blue-600" />
              <div className="text-left">
                <p className="font-medium">Send Reset Email</p>
                <p className="text-xs text-muted-foreground">User receives a link to set their own password</p>
              </div>
            </Button>
          </div>
        )}

        {mode === "email" && (
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                A password reset email will be sent to{" "}
                <span className="font-semibold">{user?.email}</span>. The user
                will need to click the link in the email to set a new password.
              </p>
            </div>
          </div>
        )}

        {mode === "direct" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
              />
              {newPassword && !passwordValid && (
                <p className="text-xs text-red-500">Password must be at least 8 characters</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
              />
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-red-500">Passwords do not match</p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {mode !== "choose" && (
            <Button variant="ghost" onClick={() => setMode("choose")} disabled={isPending}>
              Back
            </Button>
          )}
          <Button variant="ghost" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          {mode === "email" && (
            <Button
              onClick={() => user && emailResetMutation.mutate(user.email)}
              disabled={isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Mail className="mr-1.5 h-4 w-4" />
              {emailResetMutation.isPending ? "Sending..." : "Send Reset Email"}
            </Button>
          )}
          {mode === "direct" && (
            <Button
              onClick={() =>
                user &&
                directResetMutation.mutate({
                  userId: user.id,
                  password: newPassword,
                  confirm: confirmPassword,
                })
              }
              disabled={isPending || !passwordValid || !passwordsMatch}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <KeyRound className="mr-1.5 h-4 w-4" />
              {directResetMutation.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AccountsTab() {
  // -- State
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const {
    pageNumber,
    pageSize,
    page,
    setPage,
    setPageSize,
    reset: resetPagination,
  } = usePagination();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserSummary | null>(null);
  const [viewUser, setViewUser] = useState<UserSummary | null>(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState<UserSummary | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserSummary | null>(null);

  // -- Permissions
  const canCreate = useHasPermission("user.create");
  const canEdit = useHasPermission("user.update");
  const canDelete = useHasPermission("user.delete");
  const canAssignRoles = useHasPermission("user.assign_roles");

  const queryClient = useQueryClient();

  // Reset pagination when filters change
  useEffect(() => {
    resetPagination();
  }, [search, roleFilter, orgFilter, deptFilter, resetPagination]);

  // -- Data queries
  const { data: usersResult, isLoading } = useQuery({
    queryKey: ["users", search, orgFilter, pageNumber, pageSize],
    queryFn: () =>
      fetchUsers({
        search: search || undefined,
        organizationId: orgFilter || undefined,
        pageNumber,
        pageSize,
      }),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: () => fetchRoles(),
  });
  const { data: orgs = [] } = useQuery({
    queryKey: ["orgs"],
    queryFn: () => fetchOrganizations(),
  });
  const { data: stations = [] } = useQuery({
    queryKey: ["stations"],
    queryFn: () => fetchStations(),
  });
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: () => fetchDepartments(),
  });

  // -- Derived data
  const allUsers = usersResult?.items ?? [];

  // Client-side role & department filter (server doesn't support these)
  const users = useMemo(() => {
    let filtered = allUsers;
    if (roleFilter) {
      filtered = filtered.filter((u) =>
        u.roles?.some((r) => r.toUpperCase() === roleFilter.toUpperCase())
      );
    }
    if (deptFilter) {
      filtered = filtered.filter((u) => u.departmentId === deptFilter);
    }
    return filtered;
  }, [allUsers, roleFilter, deptFilter]);

  const totalUsers = usersResult?.totalCount ?? 0;
  const activeCount = useMemo(
    () => allUsers.filter((u) => u.lastLoginAt).length,
    [allUsers]
  );
  const activeRoles = roles.filter((r) => r.isActive);
  const activeDepartments = departments.filter((d) => d.isActive);
  const hasActiveFilters = !!(search || roleFilter || orgFilter || deptFilter);

  // -- Handlers
  const handleClearFilters = useCallback(() => {
    setSearch("");
    setRoleFilter("");
    setOrgFilter("");
    setDeptFilter("");
  }, []);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
  }, [queryClient]);

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Users"
          value={totalUsers}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          icon={UserCheck}
          label="Active (this page)"
          value={activeCount}
          color="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          icon={Shield}
          label="Roles"
          value={activeRoles.length}
          color="bg-purple-100 text-purple-600"
        />
        <StatCard
          icon={Building2}
          label="Organizations"
          value={orgs.length}
          color="bg-amber-100 text-amber-600"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Role filter */}
          <Select
            value={roleFilter || NONE_VALUE}
            onValueChange={(v) => setRoleFilter(v === NONE_VALUE ? "" : v)}
          >
            <SelectTrigger className="w-auto min-w-[160px]">
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="All Roles" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>All Roles</SelectItem>
              {activeRoles.map((role) => (
                <SelectItem key={role.id} value={role.name}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Org filter */}
          <Select
            value={orgFilter || NONE_VALUE}
            onValueChange={(v) => setOrgFilter(v === NONE_VALUE ? "" : v)}
          >
            <SelectTrigger className="w-auto min-w-[160px]">
              <div className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="All Organizations" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>All Organizations</SelectItem>
              {orgs.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Department filter */}
          <Select
            value={deptFilter || NONE_VALUE}
            onValueChange={(v) => setDeptFilter(v === NONE_VALUE ? "" : v)}
          >
            <SelectTrigger className="w-auto min-w-[160px]">
              <div className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="All Departments" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>All Departments</SelectItem>
              {activeDepartments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-9 gap-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Clear Filters
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            title="Refresh"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => exportUsersToCSV(users)}
            disabled={users.length === 0}
            title="Export filtered users to CSV"
          >
            <Download className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
          {canCreate && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create User
            </Button>
          )}
        </div>
      </div>

      {/* Data table */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="max-h-[65vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Name</TableHead>
                <TableHead className="min-w-[180px]">Email</TableHead>
                <TableHead className="hidden min-w-[120px] md:table-cell">
                  Phone
                </TableHead>
                <TableHead className="hidden min-w-[160px] lg:table-cell">
                  Roles
                </TableHead>
                <TableHead className="hidden min-w-[140px] lg:table-cell">
                  Organization
                </TableHead>
                <TableHead className="hidden min-w-[120px] xl:table-cell">
                  Station
                </TableHead>
                <TableHead className="hidden min-w-[80px] xl:table-cell">
                  Status
                </TableHead>
                <TableHead className="hidden min-w-[140px] 2xl:table-cell">
                  Last Login
                </TableHead>
                <TableHead className="min-w-[100px] text-right sticky right-0 bg-white z-10">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <SkeletonRows count={pageSize > 10 ? 10 : pageSize} />}
              {!isLoading && users.length === 0 && <EmptyState search={search} />}
              {!isLoading &&
                users.map((user) => (
                  <TableRow key={user.id} className="group">
                    {/* Name + Avatar */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar user={user} />
                        <span className="truncate font-medium">
                          {user.fullName ?? "\u2014"}
                        </span>
                      </div>
                    </TableCell>

                    {/* Email */}
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>

                    {/* Phone */}
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {user.phoneNumber ?? "\u2014"}
                    </TableCell>

                    {/* Roles */}
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {user.roles && user.roles.length > 0 ? (
                          user.roles.map((role) => (
                            <Badge
                              key={role}
                              variant="outline"
                              className={`text-[10px] leading-tight ${getRoleBadgeClass(role)}`}
                            >
                              {role}
                            </Badge>
                          ))
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-amber-200 bg-amber-50 text-amber-700 text-[10px] leading-tight gap-1"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            No Roles
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Organization */}
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {user.organizationName ?? "\u2014"}
                    </TableCell>

                    {/* Station */}
                    <TableCell className="hidden text-muted-foreground xl:table-cell">
                      {user.stationName ?? "\u2014"}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="hidden xl:table-cell">
                      {user.lastLoginAt ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-200 bg-emerald-50 text-emerald-700 text-xs"
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-gray-200 bg-gray-50 text-gray-500 text-xs"
                        >
                          Inactive
                        </Badge>
                      )}
                    </TableCell>

                    {/* Last Login */}
                    <TableCell className="hidden text-muted-foreground 2xl:table-cell">
                      {user.lastLoginAt
                        ? format(new Date(user.lastLoginAt), "dd MMM yyyy, HH:mm")
                        : "\u2014"}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right sticky right-0 bg-white z-10">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="View user"
                          onClick={() => setViewUser(user)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Edit user"
                            onClick={() => setEditUser(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-600 hover:text-amber-700"
                            title="Send password reset email"
                            onClick={() => setResetPasswordUser(user)}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            title="Delete user"
                            onClick={() => setDeleteTargetUser(user)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="border-t px-4 py-3">
          <Pagination
            page={page}
            pageSize={pageSize}
            totalItems={usersResult?.totalCount ?? 0}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Dialogs */}
      {canCreate && (
        <CreateUserDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          roles={roles}
          orgs={orgs}
          stations={stations}
          departments={departments}
        />
      )}

      <EditUserDialog
        user={editUser}
        open={editUser !== null}
        onClose={() => setEditUser(null)}
        roles={roles}
        orgs={orgs}
        stations={stations}
        departments={departments}
        canEdit={canEdit}
        canAssignRoles={canAssignRoles}
      />

      <ViewUserDialog
        user={viewUser}
        open={viewUser !== null}
        onClose={() => setViewUser(null)}
      />

      <DeleteUserDialog
        user={deleteTargetUser}
        open={deleteTargetUser !== null}
        onClose={() => setDeleteTargetUser(null)}
      />

      <ResetPasswordDialog
        user={resetPasswordUser}
        open={resetPasswordUser !== null}
        onClose={() => setResetPasswordUser(null)}
      />
    </div>
  );
}
