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
import { createSubcounty, type CountyDto, type SubcountyDto } from '@/lib/api/geographic';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function AddSubcountyModal({
  counties,
  onCreated,
  trigger,
}: {
  counties: CountyDto[];
  onCreated: (s: SubcountyDto) => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [countyId, setCountyId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !countyId) {
      toast.error('County and name are required');
      return;
    }
    setLoading(true);
    try {
      const created = await createSubcounty({
        countyId,
        name: name.trim(),
        code: code.trim() || undefined,
      });
      toast.success('Subcounty added');
      onCreated(created);
      setCountyId('');
      setName('');
      setCode('');
      setOpen(false);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Failed to add subcounty';
      toast.error(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline" size="icon" title="Add subcounty">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add subcounty</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>County</Label>
            <Select value={countyId} onValueChange={setCountyId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select county" />
              </SelectTrigger>
              <SelectContent>
                {counties.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subcounty-name">Name</Label>
            <Input
              id="subcounty-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Westlands"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subcounty-code">Code (optional)</Label>
            <Input
              id="subcounty-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. KE47-01"
            />
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
