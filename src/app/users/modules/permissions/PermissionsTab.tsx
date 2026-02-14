"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Filter,
  Key,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { fetchPermissions, fetchRoles } from "@/lib/api/setup";
import type { PermissionDto } from "@/types/setup";

// ---------------------------------------------------------------------------
// Category colours
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<
  string,
  { bg: string; text: string; border: string; badge: string }
> = {
  Weighing: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-700",
  },
  Yard: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
  },
  Case: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
  },
  Tag: {
    bg: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
    badge: "bg-violet-100 text-violet-700",
  },
  User: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
    badge: "bg-sky-100 text-sky-700",
  },
  Station: {
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
    badge: "bg-teal-100 text-teal-700",
  },
  System: {
    bg: "bg-gray-50",
    text: "text-gray-700",
    border: "border-gray-200",
    badge: "bg-gray-100 text-gray-700",
  },
  Analytics: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    badge: "bg-indigo-100 text-indigo-700",
  },
  Config: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    badge: "bg-orange-100 text-orange-700",
  },
  Invoice: {
    bg: "bg-pink-50",
    text: "text-pink-700",
    border: "border-pink-200",
    badge: "bg-pink-100 text-pink-700",
  },
  Receipt: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    badge: "bg-rose-100 text-rose-700",
  },
  Financial: {
    bg: "bg-fuchsia-50",
    text: "text-fuchsia-700",
    border: "border-fuchsia-200",
    badge: "bg-fuchsia-100 text-fuchsia-700",
  },
};

const FALLBACK_COLORS = {
  bg: "bg-slate-50",
  text: "text-slate-700",
  border: "border-slate-200",
  badge: "bg-slate-100 text-slate-700",
};

function getCategoryColors(category: string) {
  return CATEGORY_COLORS[category] ?? FALLBACK_COLORS;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupByCategory(permissions: PermissionDto[]): Record<string, PermissionDto[]> {
  const groups: Record<string, PermissionDto[]> = {};
  for (const perm of permissions) {
    const cat = perm.category || "Uncategorised";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(perm);
  }
  // Sort categories alphabetically
  const sorted: Record<string, PermissionDto[]> = {};
  for (const key of Object.keys(groups).sort()) {
    sorted[key] = groups[key].sort((a, b) => a.code.localeCompare(b.code));
  }
  return sorted;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type ViewMode = "grouped" | "table";

export default function PermissionsTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grouped");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Fetch all system permissions
  const {
    data: permissions = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["permissions-all"],
    queryFn: fetchPermissions,
  });

  // Fetch all roles for context
  const { data: roles = [] } = useQuery({
    queryKey: ["roles-all"],
    queryFn: () => fetchRoles(false),
  });

  // Derived data
  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const p of permissions) {
      cats.add(p.category || "Uncategorised");
    }
    return Array.from(cats).sort();
  }, [permissions]);

  const filteredPermissions = useMemo(() => {
    let list = permissions;
    if (categoryFilter !== "all") {
      list = list.filter((p) => (p.category || "Uncategorised") === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.code.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [permissions, categoryFilter, searchQuery]);

  const grouped = useMemo(() => groupByCategory(filteredPermissions), [filteredPermissions]);

  const toggleCategory = useCallback((cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedCategories(new Set(Object.keys(grouped)));
  }, [grouped]);

  const collapseAll = useCallback(() => {
    setExpandedCategories(new Set());
  }, []);

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  const stats = useMemo(
    () => ({
      total: permissions.length,
      categories: categories.length,
      filtered: filteredPermissions.length,
    }),
    [permissions, categories, filteredPermissions]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="flex items-center gap-3 px-4 py-3">
          <div className="rounded-lg bg-blue-100 p-2">
            <Key className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Permissions</p>
            <p className="text-lg font-semibold">{isLoading ? "–" : stats.total}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 px-4 py-3">
          <div className="rounded-lg bg-emerald-100 p-2">
            <LayoutGrid className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Categories</p>
            <p className="text-lg font-semibold">{isLoading ? "–" : stats.categories}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 px-4 py-3">
          <div className="rounded-lg bg-amber-100 p-2">
            <Shield className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Roles</p>
            <p className="text-lg font-semibold">{roles.length || "–"}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 px-4 py-3">
          <div className="rounded-lg bg-violet-100 p-2">
            <Filter className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Showing</p>
            <p className="text-lg font-semibold">{isLoading ? "–" : stats.filtered}</p>
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search permissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {viewMode === "grouped" && (
            <>
              <Button variant="ghost" size="sm" onClick={expandAll} className="text-xs">
                Expand All
              </Button>
              <Button variant="ghost" size="sm" onClick={collapseAll} className="text-xs">
                Collapse All
              </Button>
            </>
          )}
          <div className="flex rounded-lg border">
            <Button
              variant={viewMode === "grouped" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-r-none"
              onClick={() => setViewMode("grouped")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-l-none"
              onClick={() => setViewMode("table")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
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
        </div>
      </div>

      {/* Summary bar */}
      {!isLoading && permissions.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>{permissions.length} permissions</span>
          <span className="text-muted-foreground/40">|</span>
          <span>{categories.length} categories</span>
          {(searchQuery || categoryFilter !== "all") && (
            <>
              <span className="text-muted-foreground/40">|</span>
              <span>
                Showing {filteredPermissions.length} of {permissions.length}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("all");
                }}
                className="text-primary hover:underline ml-1"
              >
                Clear filters
              </button>
            </>
          )}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-2 w-full rounded-none" />
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <Skeleton key={j} className="h-8 rounded-md" />
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredPermissions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Key className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {searchQuery || categoryFilter !== "all"
              ? "No matching permissions"
              : "No permissions found"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {searchQuery || categoryFilter !== "all"
              ? "Try adjusting your search query or category filter."
              : "No permissions are configured in the system. Check the backend seeder."}
          </p>
        </div>
      )}

      {/* Grouped View */}
      {!isLoading && filteredPermissions.length > 0 && viewMode === "grouped" && (
        <div className="space-y-3">
          {Object.entries(grouped).map(([category, perms]) => {
            const colors = getCategoryColors(category);
            const isExpanded = expandedCategories.has(category);

            return (
              <Card key={category} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className={`w-full flex items-center justify-between px-4 py-3 ${colors.bg} hover:opacity-90 transition-opacity`}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className={`h-4 w-4 ${colors.text}`} />
                    ) : (
                      <ChevronRight className={`h-4 w-4 ${colors.text}`} />
                    )}
                    <span className={`text-sm font-semibold ${colors.text}`}>{category}</span>
                    <Badge className={`text-[10px] ${colors.badge} border-0`}>
                      {perms.length}
                    </Badge>
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {perms.map((perm) => (
                        <div
                          key={perm.id}
                          className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors"
                        >
                          <div className={`rounded-md p-1.5 ${colors.bg}`}>
                            <Key className={`h-3.5 w-3.5 ${colors.text}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">
                              {perm.name}
                            </p>
                            <p className="text-xs font-mono text-muted-foreground truncate">
                              {perm.code}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {!isLoading && filteredPermissions.length > 0 && viewMode === "table" && (
        <Card>
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <Key className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">All Permissions</span>
            <Badge variant="secondary" className="text-xs">
              {filteredPermissions.length}
            </Badge>
          </div>
          <ScrollArea className="max-h-[65vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPermissions.map((perm, idx) => {
                  const colors = getCategoryColors(perm.category || "Uncategorised");
                  return (
                    <TableRow key={perm.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{perm.name}</TableCell>
                      <TableCell>
                        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                          {perm.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${colors.badge} border-0`}
                        >
                          {perm.category || "Uncategorised"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
