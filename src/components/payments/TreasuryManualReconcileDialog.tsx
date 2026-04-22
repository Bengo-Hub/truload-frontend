'use client';

/**
 * TreasuryManualReconcileDialog — records a manual / offline payment for
 * a commercial weighing invoice (cash, bank transfer, M-Pesa offline, etc.).
 *
 * Use when the payer cannot complete payment via the treasury iframe (e.g. cash
 * at the gate or offline M-Pesa). The operator enters the amount, channel, and
 * optional reference, and the invoice is marked paid server-side.
 */

import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { manualReconcileInvoice } from '@/lib/api/invoice';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface TreasuryManualReconcileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNo: string;
  amountDue: number;
  currency: string;
  onReconciled?: () => void;
}

const PAYMENT_CHANNELS = [
  { value: 'cash', label: 'Cash' },
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

export function TreasuryManualReconcileDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceNo,
  amountDue,
  currency,
  onReconciled,
}: TreasuryManualReconcileDialogProps) {
  const [channel, setChannel] = useState('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleReset = () => {
    setChannel('cash');
    setReference('');
    setNotes('');
    setIsSubmitting(false);
    setDone(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) handleReset();
    onOpenChange(open);
  };

  const handleSubmit = async () => {
    if (!channel) {
      toast.error('Please select a payment channel');
      return;
    }
    try {
      setIsSubmitting(true);
      await manualReconcileInvoice(invoiceId, {
        amountPaid: amountDue,
        channel,
        reference: reference || undefined,
        notes: notes || undefined,
      });
      setDone(true);
      onReconciled?.();
    } catch (_err) {
      toast.error('Failed to record payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Manual Payment</DialogTitle>
          <DialogDescription>Invoice {invoiceNo}</DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center py-8 text-center gap-3">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <h3 className="font-semibold text-lg">Payment Recorded</h3>
            <p className="text-sm text-muted-foreground">
              {currency} {amountDue.toLocaleString()} marked as paid via {
                PAYMENT_CHANNELS.find(c => c.value === channel)?.label ?? channel
              }.
            </p>
            <Button className="mt-2" onClick={() => handleClose(false)}>Close</Button>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-2">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Amount to Record</p>
                <p className="text-2xl font-bold">{currency} {amountDue.toLocaleString()}</p>
              </div>

              <div className="space-y-2">
                <Label>Payment Channel <span className="text-red-500">*</span></Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select channel..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_CHANNELS.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Reference / Transaction Code</Label>
                <Input
                  placeholder="e.g. M-Pesa code, receipt no."
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Optional notes for audit trail"
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Recording...</>
                ) : (
                  'Record Payment'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
