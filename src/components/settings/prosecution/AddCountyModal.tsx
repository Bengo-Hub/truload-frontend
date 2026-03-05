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
import { createCounty, type CountyDto } from '@/lib/api/geographic';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function AddCountyModal({
  onCreated,
  trigger,
}: {
  onCreated: (c: CountyDto) => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    setLoading(true);
    try {
      const created = await createCounty({ name: name.trim(), code: code.trim() || undefined });
      toast.success('County added');
      onCreated(created);
      setName('');
      setCode('');
      setOpen(false);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Failed to add county';
      toast.error(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline" size="icon" title="Add county">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add county</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="county-name">Name</Label>
            <Input
              id="county-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nairobi City"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="county-code">Code (optional)</Label>
            <Input
              id="county-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. KE47"
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
