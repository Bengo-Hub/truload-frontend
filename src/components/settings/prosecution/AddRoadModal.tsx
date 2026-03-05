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
import type { Road } from '@/lib/api/weighing';
import { createRoad } from '@/lib/api/weighing';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const ROAD_CLASSES = ['A', 'B', 'C', 'D', 'E', 'S'];

export function AddRoadModal({
  onCreated,
  trigger,
}: {
  onCreated: (r: Road) => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [roadClass, setRoadClass] = useState('C');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      toast.error('Code and name are required');
      return;
    }
    setLoading(true);
    try {
      const created = await createRoad({
        code: code.trim(),
        name: name.trim(),
        roadClass: roadClass || 'C',
      });
      toast.success('Road added');
      onCreated(created);
      setCode('');
      setName('');
      setRoadClass('C');
      setOpen(false);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Failed to add road';
      toast.error(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline" size="icon" title="Add road">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add road</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="road-code">Code</Label>
            <Input
              id="road-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. A109"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="road-name">Name</Label>
            <Input
              id="road-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Langata Road"
            />
          </div>
          <div className="space-y-2">
            <Label>Class</Label>
            <Select value={roadClass} onValueChange={setRoadClass}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROAD_CLASSES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
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
