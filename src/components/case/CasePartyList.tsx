"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePartiesByCaseId, useAddParty, useUpdateParty, useRemoveParty } from '@/hooks/queries';
import type { CasePartyDto } from '@/lib/api/caseParty';
import { Loader2, MoreHorizontal, Plus, Trash2, Edit, Users } from 'lucide-react';
import { useHasPermission } from '@/hooks/useAuth';
import { useCanDelete } from '@/hooks/useCanDelete';
import { toast } from 'sonner';

const PARTY_ROLES = [
  { value: 'defendant_driver', label: 'Defendant (Driver)', color: 'bg-red-100 text-red-800' },
  { value: 'defendant_owner', label: 'Defendant (Owner)', color: 'bg-red-100 text-red-700' },
  { value: 'defendant_transporter', label: 'Defendant (Transporter)', color: 'bg-red-100 text-red-600' },
  { value: 'complainant', label: 'Complainant', color: 'bg-blue-100 text-blue-800' },
  { value: 'witness', label: 'Witness', color: 'bg-purple-100 text-purple-800' },
  { value: 'investigating_officer', label: 'Investigating Officer', color: 'bg-green-100 text-green-800' },
  { value: 'ocs', label: 'OCS', color: 'bg-green-100 text-green-700' },
  { value: 'arresting_officer', label: 'Arresting Officer', color: 'bg-green-100 text-green-600' },
  { value: 'prosecutor', label: 'Prosecutor', color: 'bg-amber-100 text-amber-800' },
  { value: 'other', label: 'Other (Specify)', color: 'bg-gray-100 text-gray-800' },
];

function getRoleBadge(role: string) {
  const r = PARTY_ROLES.find((p) => p.value === role);
  return <Badge className={r?.color ?? 'bg-gray-100 text-gray-800'}>{r?.label ?? role}</Badge>;
}

function getPartyDisplayName(party: CasePartyDto): string {
  return party.userName || party.driverName || party.vehicleOwnerName
    || party.transporterName || party.externalName || 'Unknown';
}

interface Props {
  caseId: string;
  caseNo: string;
}

export function CasePartyList({ caseId, caseNo }: Props) {
  const canDelete = useCanDelete();
  const canEdit = useHasPermission('case.update');
  const { data: parties = [], isLoading } = usePartiesByCaseId(caseId);
  const addMutation = useAddParty();
  const updateMutation = useUpdateParty();
  const removeMutation = useRemoveParty();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [selectedParty, setSelectedParty] = useState<CasePartyDto | null>(null);

  // Add form state
  const [addRole, setAddRole] = useState('');
  const [addExternalName, setAddExternalName] = useState('');
  const [addExternalIdNumber, setAddExternalIdNumber] = useState('');
  const [addExternalPhone, setAddExternalPhone] = useState('');
  const [addNotes, setAddNotes] = useState('');

  // Edit form state
  const [editNotes, setEditNotes] = useState('');

  const resetAddForm = () => {
    setAddRole('');
    setAddExternalName('');
    setAddExternalIdNumber('');
    setAddExternalPhone('');
    setAddNotes('');
  };

  const handleAdd = async () => {
    if (!addRole || !addExternalName) {
      toast.error('Party role and name are required');
      return;
    }
    try {
      await addMutation.mutateAsync({
        caseId,
        request: {
          partyRole: addRole,
          externalName: addExternalName,
          externalIdNumber: addExternalIdNumber || undefined,
          externalPhone: addExternalPhone || undefined,
          notes: addNotes || undefined,
        },
      });
      toast.success('Party added successfully');
      setShowAddModal(false);
      resetAddForm();
    } catch {
      toast.error('Failed to add party');
    }
  };

  const handleEdit = async () => {
    if (!selectedParty) return;
    try {
      await updateMutation.mutateAsync({
        caseId,
        partyId: selectedParty.id,
        request: { notes: editNotes || undefined },
      });
      toast.success('Party updated');
      setShowEditModal(false);
    } catch {
      toast.error('Failed to update party');
    }
  };

  const handleRemove = async () => {
    if (!selectedParty) return;
    try {
      await removeMutation.mutateAsync({ caseId, partyId: selectedParty.id });
      toast.success('Party removed');
      setShowRemoveConfirm(false);
    } catch {
      toast.error('Failed to remove party');
    }
  };

  const openEdit = (party: CasePartyDto) => {
    setSelectedParty(party);
    setEditNotes(party.notes ?? '');
    setShowEditModal(true);
  };

  const openRemove = (party: CasePartyDto) => {
    setSelectedParty(party);
    setShowRemoveConfirm(true);
  };

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Case Parties ({parties.length})
          </CardTitle>
          {canEdit && (
            <Button size="sm" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Party
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : parties.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p>No parties added to this case</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>ID Number</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added</TableHead>
                    {canEdit && <TableHead className="w-[50px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parties.map((party) => (
                    <TableRow key={party.id}>
                      <TableCell className="font-medium">{getPartyDisplayName(party)}</TableCell>
                      <TableCell>{getRoleBadge(party.partyRole)}</TableCell>
                      <TableCell className="font-mono text-sm">{party.externalIdNumber || '-'}</TableCell>
                      <TableCell>{party.externalPhone || '-'}</TableCell>
                      <TableCell>
                        {party.isCurrentlyActive
                          ? <Badge className="bg-green-100 text-green-800">Active</Badge>
                          : <Badge variant="secondary">Removed</Badge>}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{formatDate(party.addedAt)}</TableCell>
                      {canEdit && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(party)}>
                                <Edit className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => openRemove(party)}>
                                <Trash2 className="h-4 w-4 mr-2" /> Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Party Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Case Party</DialogTitle>
            <DialogDescription>Add a party to case {caseNo}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Party Role *</Label>
              <Select value={addRole} onValueChange={setAddRole}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {PARTY_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {addRole === 'other' && (
              <div className="space-y-2">
                <Label>Custom Role Description *</Label>
                <Input
                  value={addNotes.startsWith('[Role: ') ? addNotes.replace(/^\[Role: [^\]]*\]\s*/, '') : addNotes}
                  onChange={(e) => setAddNotes(`[Role: ${e.target.value}]`)}
                  placeholder="Specify the party role (e.g., Loader, Consignee, Agent)"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input value={addExternalName} onChange={(e) => setAddExternalName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ID Number</Label>
                <Input value={addExternalIdNumber} onChange={(e) => setAddExternalIdNumber(e.target.value)} placeholder="ID/Passport" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={addExternalPhone} onChange={(e) => setAddExternalPhone(e.target.value)} placeholder="+254..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={addNotes} onChange={(e) => setAddNotes(e.target.value)} placeholder="Additional notes..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={addMutation.isPending}>
              {addMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add Party
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Party Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Party</DialogTitle>
            <DialogDescription>Update notes for {selectedParty && getPartyDisplayName(selectedParty)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <Dialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Party</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedParty && getPartyDisplayName(selectedParty)} from this case?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemove} disabled={removeMutation.isPending}>
              {removeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
