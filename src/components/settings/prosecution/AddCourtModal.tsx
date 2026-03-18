'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { createCourt, type CourtDto } from '@/lib/api/courtHearing';
import type { CountyDto, SubcountyDto } from '@/lib/api/geographic';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const COURT_TYPES = ['magistrate', 'high_court', 'appeal_court', 'supreme_court'];

export function AddCourtModal({
  counties,
  subcounties,
  onCreated,
  trigger,
}: {
  counties: CountyDto[];
  subcounties: SubcountyDto[];
  onCreated: (c: CourtDto) => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [courtType, setCourtType] = useState('magistrate');
  const [countyId, setCountyId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      toast.error('Code and name are required');
      return;
    }
    setLoading(true);
    try {
      const created = await createCourt({
        code: code.trim(),
        name: name.trim(),
        location: location.trim() || undefined,
        courtType,
        countyId: countyId || undefined,
        districtId: districtId || undefined,
      });
      toast.success('Court added');
      onCreated(created);
      setCode('');
      setName('');
      setLocation('');
      setCourtType('magistrate');
      setCountyId('');
      setDistrictId('');
      setOpen(false);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Failed to add court';
      toast.error(String(msg));
    } finally {
      setLoading(false);
    }
  };

  const filteredSubcounties = countyId
    ? subcounties.filter((s) => s.countyId === countyId)
    : subcounties;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline" size="icon" title="Add court">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add court</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="court-name">Name</Label>
            <Input
              id="court-name"
              value={name}
              onChange={(e) => {
                const newName = e.target.value;
                setName(newName);
                if (newName.trim()) {
                  setCode(newName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10));
                }
              }}
              placeholder="e.g. Nairobi Law Courts"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="court-code">Code</Label>
            <Input
              id="court-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="AUTO-GENERATED"
              disabled={true}
              className="bg-gray-50 font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="court-location">Location (optional)</Label>
            <Input
              id="court-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Address or town"
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={courtType} onValueChange={setCourtType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COURT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>County (optional)</Label>
            <Select value={countyId || 'none'} onValueChange={(v) => { setCountyId(v === 'none' ? '' : v); setDistrictId(''); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select county" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {counties.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Subcounty (optional)</Label>
            <Select value={districtId || 'none'} onValueChange={(v) => setDistrictId(v === 'none' ? '' : v)} disabled={!countyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select subcounty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {filteredSubcounties.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding…' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
