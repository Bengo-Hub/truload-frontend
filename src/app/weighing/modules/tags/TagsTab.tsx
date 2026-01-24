"use client";

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { SearchInput, StatusBadge, SummaryCard } from '@/components/weighing';
import { useHasPermission } from '@/hooks/useAuth';
import {
  AlertTriangle,
  Check,
  Eye,
  Filter,
  ImageIcon,
  Plus,
  RefreshCcw,
  Tag,
  Upload,
} from 'lucide-react';
import { useState } from 'react';

/**
 * VehicleTag interface matching backend model
 * @see TruLoad.Backend.Models.Yard.VehicleTag
 */
interface VehicleTagDto {
  id: string;
  regNo: string;
  tagType: 'automatic' | 'manual';
  tagCategoryId: string;
  tagCategoryCode?: string;
  tagCategoryName?: string;
  reason: string;
  stationCode: string;
  stationName?: string;
  status: 'open' | 'closed';
  tagPhotoPath?: string;
  effectiveTimePeriod?: string; // Duration string like "30.00:00:00"
  effectiveDays?: number;
  createdById: string;
  createdByName?: string;
  closedById?: string;
  closedByName?: string;
  closedReason?: string;
  openedAt: string;
  closedAt?: string;
  exported: boolean;
}

/**
 * TagCategory interface matching backend model
 * @see TruLoad.Backend.Models.Yard.TagCategory
 */
interface TagCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
}

// Default tag categories (would be fetched from API)
const TAG_CATEGORIES: TagCategory[] = [
  { id: 'cat-1', code: 'OVERLOAD', name: 'Overload Violation', description: 'Vehicle exceeded weight limits' },
  { id: 'cat-2', code: 'HABITUAL', name: 'Habitual Offender', description: 'Repeat violation offender' },
  { id: 'cat-3', code: 'STOLEN', name: 'Stolen Vehicle', description: 'Reported stolen vehicle' },
  { id: 'cat-4', code: 'DOCUMENT', name: 'Document Issue', description: 'Missing or invalid documents' },
  { id: 'cat-5', code: 'MECHANICAL', name: 'Mechanical Defect', description: 'Vehicle safety issues' },
  { id: 'cat-6', code: 'PERMIT', name: 'Permit Issue', description: 'Permit expired or invalid' },
  { id: 'cat-7', code: 'OTHER', name: 'Other', description: 'Other compliance issues' },
];

const TAG_TYPE_LABELS: Record<string, string> = {
  automatic: 'Automatic',
  manual: 'Manual',
};

/**
 * Tags Tab
 *
 * Manages vehicle tags for tracking violations and compliance issues.
 * Maps to VehicleTag backend model with TagCategory reference.
 */
export default function TagsTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tagTypeFilter, setTagTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewingTag, setViewingTag] = useState<VehicleTagDto | null>(null);

  // Correct permissions matching backend
  const canCreateTag = useHasPermission('tag.create');
  const canUpdateTag = useHasPermission('tag.update');
  const canReadTag = useHasPermission('tag.read');
  const canExportTag = useHasPermission('tag.export');

  // Mock data matching VehicleTag model structure
  const mockTags: VehicleTagDto[] = [
    {
      id: '1',
      regNo: 'KBB 456B',
      tagType: 'automatic',
      tagCategoryId: 'cat-1',
      tagCategoryCode: 'OVERLOAD',
      tagCategoryName: 'Overload Violation',
      reason: 'Vehicle exceeded GVW by 4,300kg. Sent to yard for offloading. Axle weights: A1=8500kg, A2=9200kg, A3=12100kg, A4=11800kg, A5=10700kg. Total measured: 52,300kg vs Permissible: 48,000kg.',
      stationCode: 'MRK',
      stationName: 'Mariakani',
      status: 'open',
      effectiveDays: 30,
      createdById: 'user-2',
      createdByName: 'Jane Smith',
      openedAt: '2026-01-23T09:52:00Z',
      exported: false,
    },
    {
      id: '2',
      regNo: 'KEE 555E',
      tagType: 'automatic',
      tagCategoryId: 'cat-2',
      tagCategoryCode: 'HABITUAL',
      tagCategoryName: 'Habitual Offender',
      reason: 'Third overload violation in 30 days. Axle Group B exceeded limit by 6,500kg. Previous violations on 2026-01-05 and 2026-01-15.',
      stationCode: 'MRK',
      stationName: 'Mariakani',
      status: 'open',
      effectiveDays: 90,
      createdById: 'user-1',
      createdByName: 'John Doe',
      openedAt: '2026-01-23T07:35:00Z',
      exported: true,
    },
    {
      id: '3',
      regNo: 'KGG 777G',
      tagType: 'manual',
      tagCategoryId: 'cat-4',
      tagCategoryCode: 'DOCUMENT',
      tagCategoryName: 'Document Issue',
      reason: 'Vehicle insurance expired on 2026-01-10. Driver presented invalid insurance certificate.',
      stationCode: 'MRK',
      stationName: 'Mariakani',
      status: 'closed',
      effectiveDays: 7,
      createdById: 'user-2',
      createdByName: 'Jane Smith',
      closedById: 'user-1',
      closedByName: 'John Doe',
      closedReason: 'Driver presented valid renewed insurance certificate.',
      openedAt: '2026-01-22T14:20:00Z',
      closedAt: '2026-01-23T10:30:00Z',
      exported: true,
    },
    {
      id: '4',
      regNo: 'KHH 888H',
      tagType: 'manual',
      tagCategoryId: 'cat-5',
      tagCategoryCode: 'MECHANICAL',
      tagCategoryName: 'Mechanical Defect',
      reason: 'Brake lights not functioning. Rear reflectors missing. Vehicle poses safety risk.',
      stationCode: 'ATR',
      stationName: 'Athi River',
      status: 'open',
      tagPhotoPath: '/uploads/tags/khh888h-brake-lights.jpg',
      effectiveDays: 14,
      createdById: 'user-1',
      createdByName: 'John Doe',
      openedAt: '2026-01-15T11:00:00Z',
      exported: false,
    },
  ];

  const filteredTags = mockTags.filter((tag) => {
    const matchesSearch =
      tag.id.toLowerCase().includes(search.toLowerCase()) ||
      tag.regNo.toLowerCase().includes(search.toLowerCase()) ||
      tag.reason.toLowerCase().includes(search.toLowerCase()) ||
      (tag.tagCategoryName?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || tag.status === statusFilter;
    const matchesType = tagTypeFilter === 'all' || tag.tagType === tagTypeFilter;
    const matchesCategory = categoryFilter === 'all' || tag.tagCategoryId === categoryFilter;
    return matchesSearch && matchesStatus && matchesType && matchesCategory;
  });

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

  // Summary counts
  const openCount = mockTags.filter((t) => t.status === 'open').length;
  const closedCount = mockTags.filter((t) => t.status === 'closed').length;
  const exportedCount = mockTags.filter((t) => t.exported).length;

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
                  {TAG_CATEGORIES.map((cat) => (
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
              <Button variant="outline" size="icon">
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tags Table */}
      <Card className="border border-gray-200 rounded-xl">
        <CardHeader className="pb-2 pt-5 px-6">
          <CardTitle className="text-base font-semibold text-gray-900">
            Vehicle Tags ({filteredTags.length})
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
              {filteredTags.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                    No tags found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTags.map((tag) => (
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
                        {TAG_TYPE_LABELS[tag.tagType]}
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
                      <div className="text-sm text-gray-600">{tag.stationName}</div>
                      <div className="text-xs text-gray-500">{tag.stationCode}</div>
                    </TableCell>
                    <TableCell className="py-4">
                      {tag.effectiveDays ? (
                        <span className="text-sm text-gray-600">{tag.effectiveDays} days</span>
                      ) : (
                        <span className="text-sm text-gray-400">Indefinite</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="text-sm text-gray-600">{formatDateTime(tag.openedAt)}</div>
                      <div className="text-xs text-gray-500">by {tag.createdByName}</div>
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
                          <Button variant="outline" size="sm">
                            <Check className="mr-1 h-4 w-4" />
                            Close
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Tag Dialog */}
      <CreateTagDialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} />

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
}

/**
 * CreateTagDialog - Create new vehicle tag
 * Matches VehicleTag backend model fields
 */
function CreateTagDialog({ open, onClose }: CreateTagDialogProps) {
  const [regNo, setRegNo] = useState('');
  const [tagCategoryId, setTagCategoryId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [effectiveDays, setEffectiveDays] = useState<number>(30);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement tag creation API call
    console.log('Creating tag:', {
      regNo,
      tagType: 'manual', // Manual tags are created by users
      tagCategoryId,
      reason,
      effectiveTimePeriod: `${effectiveDays}.00:00:00`, // Duration format
      status: 'open',
    });
    onClose();
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
                {TAG_CATEGORIES.map((cat) => (
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
              min={1}
              max={365}
              value={effectiveDays}
              onChange={(e) => setEffectiveDays(parseInt(e.target.value) || 30)}
            />
            <p className="text-xs text-gray-500">
              How long this tag should remain active. Leave empty for indefinite.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              <Tag className="mr-2 h-4 w-4" />
              Create Tag
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
              <p className="text-sm font-medium">{TAG_TYPE_LABELS[tag.tagType]}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Category</Label>
              <p className="text-sm font-medium">{tag.tagCategoryName}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Station</Label>
              <p className="text-sm font-medium">{tag.stationName} ({tag.stationCode})</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Effective Duration</Label>
              <p className="text-sm font-medium">{tag.effectiveDays ? `${tag.effectiveDays} days` : 'Indefinite'}</p>
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
            <p className="text-sm">{formatDateTime(tag.openedAt)} by {tag.createdByName}</p>
          </div>

          {tag.closedAt && (
            <div>
              <Label className="text-xs text-gray-500">Closed</Label>
              <p className="text-sm">{formatDateTime(tag.closedAt)} by {tag.closedByName}</p>
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
