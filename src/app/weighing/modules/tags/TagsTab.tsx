"use client";

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination, usePagination } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { SearchInput, StatusBadge, SummaryCard } from '@/components/weighing';
import { useHasPermission } from '@/hooks/useAuth';
import {
  useCloseVehicleTag,
  useCreateVehicleTag,
  useTagCategories,
  useVehicleTags,
  YARD_QUERY_KEYS,
} from '@/hooks/queries/useYardQueries';
import type { VehicleTagDto, TagCategoryDto } from '@/lib/api/yard';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Check,
  Eye,
  Filter,
  ImageIcon,
  Loader2,
  Plus,
  RefreshCcw,
  Tag,
  Upload,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const TAG_TYPE_LABELS: Record<string, string> = {
  automatic: 'Automatic',
  manual: 'Manual',
};

/**
 * Tags Tab
 *
 * Manages vehicle tags for tracking violations and compliance issues.
 * Connected to VehicleTagController backend API with real-time data.
 */
export default function TagsTab() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tagTypeFilter, setTagTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewingTag, setViewingTag] = useState<VehicleTagDto | null>(null);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<VehicleTagDto | null>(null);

  const { page, pageNumber, pageSize, setPage, setPageSize, reset: resetPagination } = usePagination();
  const queryClient = useQueryClient();

  // Permissions matching backend
  const canCreateTag = useHasPermission('tag.create');
  const canUpdateTag = useHasPermission('tag.update');
  const canReadTag = useHasPermission('tag.read');
  const canExportTag = useHasPermission('tag.export');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      resetPagination();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, resetPagination]);

  // Reset pagination when filters change
  useEffect(() => {
    resetPagination();
  }, [statusFilter, tagTypeFilter, categoryFilter, resetPagination]);

  // Fetch tag categories
  const { data: categories = [] } = useTagCategories();

  // Fetch vehicle tags with server-side filtering and pagination
  const { data: tagsResult, isLoading, isFetching } = useVehicleTags({
    regNo: debouncedSearch || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    tagType: tagTypeFilter !== 'all' ? tagTypeFilter : undefined,
    tagCategoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
    pageNumber,
    pageSize,
    sortBy: 'OpenedAt',
    sortOrder: 'desc',
  });

  // Mutations
  const createMutation = useCreateVehicleTag();
  const closeMutation = useCloseVehicleTag();

  const tags = tagsResult?.items ?? [];
  const totalCount = tagsResult?.totalCount ?? 0;

  // Summary counts from current filtered result
  const openCount = tags.filter((t) => t.status === 'open').length;
  const closedCount = tags.filter((t) => t.status === 'closed').length;
  const exportedCount = tags.filter((t) => t.exported).length;

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-KE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTagStatusBadge = (status: string): 'ACTIVE' | 'RESOLVED' => {
    return status === 'open' ? 'ACTIVE' : 'RESOLVED';
  };

  const parseEffectiveDays = (effectiveTimePeriod?: string): number | null => {
    if (!effectiveTimePeriod) return null;
    // Parse TimeSpan format like "30.00:00:00"
    const match = effectiveTimePeriod.match(/^(\d+)\./);
    return match ? parseInt(match[1], 10) : null;
  };

  const handleCloseTag = (tag: VehicleTagDto) => {
    setSelectedTag(tag);
    setCloseDialogOpen(true);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: YARD_QUERY_KEYS.VEHICLE_TAGS });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          title="Open Tags"
          value={openCount}
          icon={AlertTriangle}
          iconColor="text-red-600"
          iconBgColor="bg-red-100"
        />
        <SummaryCard
          title="Closed Tags"
          value={closedCount}
          icon={Check}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
        />
        <SummaryCard
          title="Exported to External"
          value={exportedCount}
          icon={Upload}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
      </div>

      {/* Filters */}
      <Card className="border border-gray-200 rounded-xl">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 gap-3 flex-wrap">
              <SearchInput
                placeholder="Search by vehicle, reason, category..."
                value={search}
                onChange={setSearch}
                className="flex-1 max-w-sm"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tagTypeFilter} onValueChange={setTagTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Tag Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="automatic">Automatic</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              {canCreateTag && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Tag
                </Button>
              )}
              {canExportTag && (
                <Button variant="outline" size="sm">
                  <Upload className="mr-2 h-4 w-4" />
                  Export
                </Button>
              )}
              <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isFetching}>
                <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tags Table */}
      <Card className="border border-gray-200 rounded-xl">
        <CardHeader className="pb-2 pt-5 px-6">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            Vehicle Tags ({totalCount})
            {isFetching && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-gray-100">
                <TableHead className="font-semibold text-gray-900 h-12 pl-6">Vehicle</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12">Type</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12">Category</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12">Reason</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12">Station</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12">Duration</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12">Opened</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12">Status</TableHead>
                <TableHead className="font-semibold text-gray-900 h-12 pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading tags...
                  </TableCell>
                </TableRow>
              ) : tags.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                    No tags found.
                  </TableCell>
                </TableRow>
              ) : (
                tags.map((tag) => {
                  const effectiveDays = parseEffectiveDays(tag.effectiveTimePeriod);
                  return (
                    <TableRow key={tag.id} className="hover:bg-gray-50 border-b border-gray-50">
                      <TableCell className="py-4 pl-6">
                        <div className="font-mono font-medium text-gray-900">{tag.regNo}</div>
                        {tag.tagPhotoPath && (
                          <div className="flex items-center gap-1 text-xs text-blue-600 mt-1">
                            <ImageIcon className="h-3 w-3" />
                            <span>Photo attached</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant={tag.tagType === 'automatic' ? 'secondary' : 'outline'} className="rounded-md">
                          {TAG_TYPE_LABELS[tag.tagType] || tag.tagType}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="secondary" className="rounded-md">
                          {tag.tagCategoryName || tag.tagCategoryCode}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 max-w-xs">
                        <div className="text-sm text-gray-600 line-clamp-2">{tag.reason}</div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="text-sm text-gray-600">{tag.stationCode}</div>
                      </TableCell>
                      <TableCell className="py-4">
                        {effectiveDays ? (
                          <span className="text-sm text-gray-600">{effectiveDays} days</span>
                        ) : (
                          <span className="text-sm text-gray-400">Indefinite</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="text-sm text-gray-600">{formatDateTime(tag.openedAt)}</div>
                        <div className="text-xs text-gray-500">by {tag.createdByName || '-'}</div>
                        {tag.closedAt && (
                          <div className="text-xs text-green-600 mt-1">
                            Closed: {formatDateTime(tag.closedAt)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={getTagStatusBadge(tag.status)} />
                          {tag.exported && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                              Exported
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 pr-6 text-right">
                        <div className="flex justify-end gap-1">
                          {canReadTag && (
                            <Button variant="ghost" size="sm" onClick={() => setViewingTag(tag)} title="View Details">
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {tag.status === 'open' && canUpdateTag && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCloseTag(tag)}
                              disabled={closeMutation.isPending}
                            >
                              <Check className="mr-1 h-4 w-4" />
                              Close
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Pagination */}
        <div className="border-t border-gray-200 px-4 py-3">
          <Pagination
            page={page}
            pageSize={pageSize}
            totalItems={totalCount}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            isLoading={isLoading}
          />
        </div>
      </Card>

      {/* Create Tag Dialog */}
      <CreateTagDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        categories={categories}
        onSubmit={async (data) => {
          await createMutation.mutateAsync(data);
          toast.success('Tag created successfully');
          setCreateDialogOpen(false);
        }}
        isSubmitting={createMutation.isPending}
      />

      {/* Close Tag Dialog */}
      {selectedTag && (
        <CloseTagDialog
          tag={selectedTag}
          open={closeDialogOpen}
          onClose={() => {
            setCloseDialogOpen(false);
            setSelectedTag(null);
          }}
          onSubmit={async (closedReason) => {
            await closeMutation.mutateAsync({
              id: selectedTag.id,
              request: { closedReason },
            });
            toast.success('Tag closed successfully');
            setCloseDialogOpen(false);
            setSelectedTag(null);
          }}
          isSubmitting={closeMutation.isPending}
        />
      )}

      {/* View Tag Dialog */}
      {viewingTag && (
        <ViewTagDialog tag={viewingTag} onClose={() => setViewingTag(null)} />
      )}
    </div>
  );
}

interface CreateTagDialogProps {
  open: boolean;
  onClose: () => void;
  categories: TagCategoryDto[];
  onSubmit: (data: {
    regNo: string;
    tagType: string;
    tagCategoryId: string;
    reason: string;
    stationCode: string;
    effectiveDays?: number;
  }) => Promise<void>;
  isSubmitting: boolean;
}

/**
 * CreateTagDialog - Create new vehicle tag
 */
function CreateTagDialog({ open, onClose, categories, onSubmit, isSubmitting }: CreateTagDialogProps) {
  const [regNo, setRegNo] = useState('');
  const [tagCategoryId, setTagCategoryId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [effectiveDays, setEffectiveDays] = useState<number>(30);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      regNo: regNo.toUpperCase(),
      tagType: 'manual',
      tagCategoryId,
      reason,
      stationCode: 'MRK', // TODO: Get from user's station context
      effectiveDays: effectiveDays > 0 ? effectiveDays : undefined,
    });
    // Reset form
    setRegNo('');
    setTagCategoryId('');
    setReason('');
    setEffectiveDays(30);
  };

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Tag</DialogTitle>
          <DialogDescription>
            Manually tag a vehicle for cross-station enforcement and watchlist tracking.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="regNo">Vehicle Registration <span className="text-red-500">*</span></Label>
            <Input
              id="regNo"
              placeholder="KAA 123A"
              value={regNo}
              onChange={(e) => setRegNo(e.target.value.toUpperCase())}
              className="font-mono uppercase"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagCategory">Tag Category <span className="text-red-500">*</span></Label>
            <Select value={tagCategoryId} onValueChange={setTagCategoryId} required>
              <SelectTrigger id="tagCategory">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex flex-col">
                      <span>{cat.name}</span>
                      {cat.description && (
                        <span className="text-xs text-gray-500">{cat.description}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason / Description <span className="text-red-500">*</span></Label>
            <Textarea
              id="reason"
              placeholder="Provide detailed reason for tagging this vehicle..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
            />
            <p className="text-xs text-gray-500">
              Be specific and include relevant details (dates, amounts, evidence).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="effectiveDays">Effective Duration (Days)</Label>
            <Input
              id="effectiveDays"
              type="number"
              min={0}
              max={365}
              value={effectiveDays}
              onChange={(e) => setEffectiveDays(parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-gray-500">
              How long this tag should remain active. Set to 0 for indefinite.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !regNo || !tagCategoryId || !reason}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Tag className="mr-2 h-4 w-4" />
                  Create Tag
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface CloseTagDialogProps {
  tag: VehicleTagDto;
  open: boolean;
  onClose: () => void;
  onSubmit: (closedReason: string) => Promise<void>;
  isSubmitting: boolean;
}

/**
 * CloseTagDialog - Close an open tag
 */
function CloseTagDialog({ tag, open, onClose, onSubmit, isSubmitting }: CloseTagDialogProps) {
  const [closedReason, setClosedReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(closedReason);
    setClosedReason('');
  };

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Close Tag</DialogTitle>
          <DialogDescription>
            Close tag for vehicle {tag.regNo}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm">
              <strong>Category:</strong> {tag.tagCategoryName}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              <strong>Reason:</strong> {tag.reason}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="closedReason">Closure Reason <span className="text-red-500">*</span></Label>
            <Textarea
              id="closedReason"
              placeholder="Provide reason for closing this tag..."
              value={closedReason}
              onChange={(e) => setClosedReason(e.target.value)}
              rows={3}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !closedReason}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Closing...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Close Tag
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ViewTagDialogProps {
  tag: VehicleTagDto;
  onClose: () => void;
}

/**
 * ViewTagDialog - View tag details
 */
function ViewTagDialog({ tag, onClose }: ViewTagDialogProps) {
  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-KE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const parseEffectiveDays = (effectiveTimePeriod?: string): number | null => {
    if (!effectiveTimePeriod) return null;
    const match = effectiveTimePeriod.match(/^(\d+)\./);
    return match ? parseInt(match[1], 10) : null;
  };

  const effectiveDays = parseEffectiveDays(tag.effectiveTimePeriod);

  return (
    <Dialog open onOpenChange={(value) => (!value ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Tag Details
          </DialogTitle>
          <DialogDescription>Vehicle: {tag.regNo}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-gray-500">Status</Label>
              <div className="mt-1">
                <Badge variant={tag.status === 'open' ? 'destructive' : 'secondary'}>
                  {tag.status === 'open' ? 'Open' : 'Closed'}
                </Badge>
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Tag Type</Label>
              <p className="text-sm font-medium">{TAG_TYPE_LABELS[tag.tagType] || tag.tagType}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Category</Label>
              <p className="text-sm font-medium">{tag.tagCategoryName || tag.tagCategoryCode}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Station</Label>
              <p className="text-sm font-medium">{tag.stationCode}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Effective Duration</Label>
              <p className="text-sm font-medium">{effectiveDays ? `${effectiveDays} days` : 'Indefinite'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Exported</Label>
              <p className="text-sm font-medium">{tag.exported ? 'Yes' : 'No'}</p>
            </div>
          </div>

          <div>
            <Label className="text-xs text-gray-500">Reason</Label>
            <p className="text-sm mt-1 bg-gray-50 p-3 rounded-lg">{tag.reason}</p>
          </div>

          <div className="border-t pt-4">
            <Label className="text-xs text-gray-500">Created</Label>
            <p className="text-sm">{formatDateTime(tag.openedAt)} by {tag.createdByName || '-'}</p>
          </div>

          {tag.closedAt && (
            <div>
              <Label className="text-xs text-gray-500">Closed</Label>
              <p className="text-sm">{formatDateTime(tag.closedAt)} by {tag.closedByName || '-'}</p>
              {tag.closedReason && (
                <p className="text-sm mt-1 bg-green-50 p-3 rounded-lg">{tag.closedReason}</p>
              )}
            </div>
          )}

          {tag.tagPhotoPath && (
            <div>
              <Label className="text-xs text-gray-500">Evidence Photo</Label>
              <div className="mt-1 p-2 border rounded-lg bg-gray-50 text-center">
                <ImageIcon className="h-8 w-8 mx-auto text-gray-400" />
                <p className="text-xs text-gray-500 mt-1">Photo attached</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
