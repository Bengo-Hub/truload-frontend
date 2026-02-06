"use client";

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';

interface MissingFieldsWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  missingFields: string[];
}

/**
 * MissingFieldsWarningModal - Warns user about missing required fields
 *
 * Shown when a user tries to take a decision action (Finish, Yard, Special Release)
 * without filling in required fields (Driver, Transporter, Origin, Destination).
 */
export function MissingFieldsWarningModal({
  isOpen,
  onClose,
  missingFields,
}: MissingFieldsWarningModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-center mb-2">
            <div className="p-3 rounded-full bg-amber-100">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-lg">
            Missing Required Fields
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm text-gray-600 text-center">
            Please fill in the following fields before proceeding:
          </p>
          <ul className="space-y-1">
            {missingFields.map((field) => (
              <li
                key={field}
                className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm font-medium text-amber-800"
              >
                <span className="h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
                {field}
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button onClick={onClose} className="w-full">
            Go Back & Fill Details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MissingFieldsWarningModal;
