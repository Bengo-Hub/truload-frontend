/**
 * Portal Team Management Page
 *
 * Allows a Transporter Admin to invite and manage team members
 * (Manager/Viewer roles) who can access the portal.
 */

'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePortalTeam,
  useInviteTeamMember,
  useRemoveTeamMember,
} from '@/hooks/queries/usePortalQueries';
import type { PortalTeamMember } from '@/types/portal';
import { Crown, Trash2, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  viewer: 'Viewer',
};

const ROLE_BADGE_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  admin: 'default',
  manager: 'secondary',
  viewer: 'outline',
};

function MemberRow({
  member,
  canManage,
  onRemove,
}: {
  member: PortalTeamMember;
  canManage: boolean;
  onRemove: (member: PortalTeamMember) => void;
}) {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          {member.isOwner && <Crown className="h-4 w-4 text-amber-500 flex-shrink-0" />}
          <div>
            <p className="text-sm font-medium text-gray-900">{member.userName}</p>
            <p className="text-xs text-gray-500">{member.userEmail}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <Badge variant={ROLE_BADGE_VARIANTS[member.role] ?? 'outline'}>
          {ROLE_LABELS[member.role] ?? member.role}
        </Badge>
      </td>
      <td className="py-3 px-4 text-sm text-gray-500">
        {new Date(member.joinedAt).toLocaleDateString('en-KE')}
      </td>
      <td className="py-3 px-4 text-right">
        {!member.isOwner && canManage && (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => onRemove(member)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </td>
    </tr>
  );
}

function InviteModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'manager' | 'viewer'>('viewer');
  const invite = useInviteTeamMember();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    try {
      const result = await invite.mutateAsync({ email, role });
      toast.success(result.message ?? 'Invitation sent successfully.');
      setEmail('');
      setRole('viewer');
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to send invitation.';
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to someone to join your portal team. They will need to log in to
            accept.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as 'manager' | 'viewer')}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">
                    <div>
                      <p className="font-medium">Manager</p>
                      <p className="text-xs text-gray-500">Can view all data and manage settings</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div>
                      <p className="font-medium">Viewer</p>
                      <p className="text-xs text-gray-500">Read-only access to portal data</p>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={invite.isPending}>
              {invite.isPending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RemoveConfirmModal({
  member,
  onClose,
}: {
  member: PortalTeamMember | null;
  onClose: () => void;
}) {
  const remove = useRemoveTeamMember();

  const handleConfirm = async () => {
    if (!member) return;
    try {
      const result = await remove.mutateAsync(member.userId);
      toast.success(result.message ?? 'Team member removed.');
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to remove team member.';
      toast.error(msg);
    }
  };

  return (
    <Dialog open={!!member} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remove Team Member</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove{' '}
            <span className="font-medium">{member?.userName ?? member?.userEmail}</span> from the
            portal team? They will immediately lose access.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={remove.isPending} onClick={handleConfirm}>
            {remove.isPending ? 'Removing...' : 'Remove'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PortalTeamPage() {
  const { data: members, isLoading } = usePortalTeam();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeMember, setRemoveMember] = useState<PortalTeamMember | null>(null);

  // User is the owner if there's an owner member that is themselves
  // We know the user is "admin" if the first member (owner) has their session
  // For simplicity, show invite/remove buttons — the backend enforces owner-only
  const ownerMember = members?.find((m) => m.isOwner);
  const canManage = true; // Backend enforces; UI shows buttons and backend rejects if not owner

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Team Management</h2>
          <p className="text-sm text-gray-500">Manage who has access to this portal</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Team Management</h2>
          <p className="text-sm text-gray-500">
            Manage who has access to your transporter portal.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite Member
        </Button>
      </div>

      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Team Members
          </CardTitle>
          <CardDescription>
            {members?.length ?? 0} member{(members?.length ?? 0) !== 1 ? 's' : ''} with portal
            access
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {!members || members.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">No team members yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left py-2.5 px-4">Member</th>
                  <th className="text-left py-2.5 px-4">Role</th>
                  <th className="text-left py-2.5 px-4">Joined</th>
                  <th className="py-2.5 px-4" />
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <MemberRow
                    key={member.userId}
                    member={member}
                    canManage={canManage}
                    onRemove={setRemoveMember}
                  />
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Role Legend */}
      <Card className="bg-gray-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-700">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Crown className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-semibold text-gray-900">Admin</span>
              </div>
              <p className="text-xs text-gray-500">
                Full access. Can invite/remove team members and manage all settings.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-semibold text-gray-900">Manager</span>
              </div>
              <p className="text-xs text-gray-500">
                Can view all data, download tickets, and access reports.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-semibold text-gray-900">Viewer</span>
              </div>
              <p className="text-xs text-gray-500">Read-only access to weighing history and data.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <RemoveConfirmModal member={removeMember} onClose={() => setRemoveMember(null)} />
    </div>
  );
}
