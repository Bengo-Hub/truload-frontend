'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import { Briefcase, ChevronRight, Scale } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface EscalateChooserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
}

/**
 * Escalation chooser: a case can be escalated either to Prosecution (by creating a prosecution
 * case + charge sheet) or to a Case Manager (by creating a court case managed from Case Management).
 * Both paths reuse the existing flows on the case detail page — selecting an option navigates there.
 */
export function EscalateChooserModal({ open, onOpenChange, caseId }: EscalateChooserModalProps) {
  const router = useRouter();
  const orgSlug = useOrgSlug();

  const choose = (target: 'prosecution' | 'manager') => {
    onOpenChange(false);
    const query = target === 'prosecution' ? 'tab=prosecution' : 'escalate=manager';
    router.push(`/${orgSlug}/cases/${caseId}?${query}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Escalate Case</DialogTitle>
          <DialogDescription>Choose how to escalate this case.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={() => choose('prosecution')}
            className="w-full text-left rounded-lg border p-4 hover:border-orange-300 hover:bg-orange-50 transition-colors flex items-start gap-3"
          >
            <Scale className="h-6 w-6 text-orange-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Escalate to Prosecution</p>
              <p className="text-sm text-gray-500">
                Create a prosecution case and charge sheet, then invoice and collect the fine.
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 mt-1" />
          </button>

          <button
            type="button"
            onClick={() => choose('manager')}
            className="w-full text-left rounded-lg border p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors flex items-start gap-3"
          >
            <Briefcase className="h-6 w-6 text-blue-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Escalate to Case Manager</p>
              <p className="text-sm text-gray-500">
                Create a court case (assign case manager, IO &amp; NTACs) managed from Case Management.
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 mt-1" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
