"use client";

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Eye, Pencil, Plus, Save, X } from 'lucide-react';
import { ReactNode } from 'react';

export type ModalMode = 'create' | 'edit' | 'view';

interface EntityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ModalMode;
  title: string;
  description?: string;
  children: ReactNode;
  onSave?: () => void;
  isSaving?: boolean;
  isValid?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

/**
 * EntityModal - Base modal for CRUD operations
 *
 * Provides consistent styling and behavior for create/edit/view modals.
 * Used by VehicleModal, DriverModal, TransporterModal, etc.
 */
export function EntityModal({
  open,
  onOpenChange,
  mode,
  title,
  description,
  children,
  onSave,
  isSaving = false,
  isValid = true,
  maxWidth = 'lg',
}: EntityModalProps) {
  const isViewMode = mode === 'view';

  const getModeIcon = () => {
    switch (mode) {
      case 'create':
        return <Plus className="h-5 w-5 text-green-600" />;
      case 'edit':
        return <Pencil className="h-5 w-5 text-blue-600" />;
      case 'view':
        return <Eye className="h-5 w-5 text-gray-600" />;
    }
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'create':
        return 'Create';
      case 'edit':
        return 'Edit';
      case 'view':
        return 'View';
    }
  };

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }[maxWidth];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={maxWidthClass}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getModeIcon()}
            {getModeLabel()} {title}
          </DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="py-4">{children}</div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            <X className="mr-2 h-4 w-4" />
            {isViewMode ? 'Close' : 'Cancel'}
          </Button>
          {!isViewMode && onSave && (
            <Button
              type="button"
              onClick={onSave}
              disabled={isSaving || !isValid}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : mode === 'create' ? 'Create' : 'Save Changes'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Helper hook for modal state management
 */
export interface UseEntityModalState<T> {
  isOpen: boolean;
  mode: ModalMode;
  entity: T | null;
  open: (mode: ModalMode, entity?: T) => void;
  close: () => void;
}
