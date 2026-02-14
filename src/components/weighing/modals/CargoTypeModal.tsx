"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Package } from 'lucide-react';

export interface CargoType {
  id?: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  isHazardous?: boolean;
  requiresPermit?: boolean;
}

export interface CreateCargoTypeRequest {
  code: string;
  name: string;
  description?: string;
  category?: string;
  isHazardous?: boolean;
  requiresPermit?: boolean;
}

interface CargoTypeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit' | 'view';
  cargoType?: CargoType;
  onSave: (data: CreateCargoTypeRequest) => Promise<void>;
  isSaving?: boolean;
}

/**
 * CargoTypeModal - Modal for creating/editing cargo types
 *
 * Used on:
 * - Vehicle Details page for adding new cargo types not in backend
 * - Admin cargo type management
 *
 * Fields:
 * - Code (unique identifier)
 * - Name (display name)
 * - Description (optional)
 * - Category (e.g., "General", "Bulk", "Container", "Livestock")
 * - Is Hazardous (boolean flag)
 * - Requires Permit (boolean flag)
 */
export function CargoTypeModal({
  open,
  onOpenChange,
  mode,
  cargoType,
  onSave,
  isSaving = false,
}: CargoTypeModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isHazardous, setIsHazardous] = useState(false);
  const [requiresPermit, setRequiresPermit] = useState(false);

  const isViewMode = mode === 'view';

  // Reset form when modal opens or cargo type changes
  useEffect(() => {
    if (open) {
      if ((mode === 'edit' || mode === 'view') && cargoType) {
        setCode(cargoType.code || '');
        setName(cargoType.name || '');
        setDescription(cargoType.description || '');
        setCategory(cargoType.category || '');
        setIsHazardous(cargoType.isHazardous || false);
        setRequiresPermit(cargoType.requiresPermit || false);
      } else {
        // Reset for create mode
        setCode('');
        setName('');
        setDescription('');
        setCategory('');
        setIsHazardous(false);
        setRequiresPermit(false);
      }
    }
  }, [open, mode, cargoType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim() || !name.trim()) {
      return;
    }

    await onSave({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      isHazardous,
      requiresPermit,
    });
  };

  const isValid = code.trim().length > 0 && name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            {mode === 'create' ? 'Add New Cargo Type' : mode === 'edit' ? 'Edit Cargo Type' : 'View Cargo Type'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new cargo type for weighing transactions.'
              : mode === 'edit'
              ? 'Update cargo type details.'
              : 'Cargo type details.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 space-y-4 -mx-4 sm:-mx-6 px-4 sm:px-6 py-1">
          {/* Code */}
          <div className="space-y-2">
            <Label htmlFor="cargo-code">Code *</Label>
            <Input
              id="cargo-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g., CEMENT, FUEL, LIVESTOCK"
              disabled={isSaving || mode === 'edit' || isViewMode}
              className="uppercase"
            />
            <p className="text-xs text-gray-500">
              Unique identifier for this cargo type
            </p>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="cargo-name">Name *</Label>
            <Input
              id="cargo-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Cement Bags, Petroleum Fuel"
              disabled={isSaving || isViewMode}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="cargo-category">Category</Label>
            <Input
              id="cargo-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Building Materials, Fuel, Livestock"
              disabled={isSaving || isViewMode}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="cargo-description">Description</Label>
            <Textarea
              id="cargo-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              disabled={isSaving || isViewMode}
              rows={2}
            />
          </div>

          {/* Flags */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isHazardous}
                onChange={(e) => setIsHazardous(e.target.checked)}
                disabled={isSaving || isViewMode}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Hazardous</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={requiresPermit}
                onChange={(e) => setRequiresPermit(e.target.checked)}
                disabled={isSaving || isViewMode}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Requires Permit</span>
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {isViewMode ? 'Close' : 'Cancel'}
            </Button>
            {!isViewMode && (
              <Button type="submit" disabled={!isValid || isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'create' ? 'Add Cargo Type' : 'Save Changes'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CargoTypeModal;
