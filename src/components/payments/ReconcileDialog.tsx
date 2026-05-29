/**
 * ReconcileDialog — allows an officer to reconcile an invoice against a
 * real Pesaflow transaction once back online.
 *
 * Flow:
 * 1. Original Pesaflow ref is shown read-only (audit trail)
 * 2. Officer may enter an Alternate Reference if payment went to a different eCitizen ref
 * 3. "Verify" queries Pesaflow using the alternate ref (if given) or the original ref
 * 4. Shows transaction details; M-Pesa ref field is always required (Pesaflow may not return it)
 * 5. Notes become required when alternate ref differs from original
 * 6. "Reconcile" updates the invoice status + generates a receipt with the M-Pesa ref, notes, alternate ref
 */

'use client';

import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import { queryPaymentStatus, reconcileInvoice, type PesaflowPaymentStatusResponse } from '@/lib/api/integration';
import { AlertTriangle, CheckCircle2, Info, Loader2, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface ReconcileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNo: string;
  pesaflowInvoiceNumber?: string;
  amountDue: number;
  currency: string;
  onReconciled?: () => void;
}

type Step = 'input' | 'verifying' | 'confirmed' | 'reconciling' | 'done';

export function ReconcileDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceNo,
  pesaflowInvoiceNumber,
  amountDue,
  currency,
  onReconciled,
}: ReconcileDialogProps) {
  const [step, setStep] = useState<Step>('input');
  const [alternateRef, setAlternateRef] = useState('');
  const [amount, setAmount] = useState(amountDue.toString());
  const [mpesaRef, setMpesaRef] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PesaflowPaymentStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const originalRef = pesaflowInvoiceNumber?.trim() || '';
  // Alternate ref is "active" when provided and different from the original
  const isUsingAlternateRef =
    alternateRef.trim() !== '' &&
    alternateRef.trim().toUpperCase() !== originalRef.toUpperCase();
  // Notes are required when reconciling under a different reference
  const notesRequired = isUsingAlternateRef;

  useEffect(() => {
    if (!open) return;
    setAlternateRef('');
    setAmount(amountDue.toString());
    setMpesaRef('');
    setNotes('');
    setPaymentStatus(null);
    setError(null);
    setStep('input');
  }, [open, amountDue]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: currency || 'KES' }).format(val);

  const handleVerify = async () => {
    const refToQuery = alternateRef.trim() || originalRef;
    if (!refToQuery) {
      setError('A Pesaflow reference is required for verification');
      return;
    }

    setError(null);
    setStep('verifying');

    try {
      const status = await queryPaymentStatus(invoiceId, refToQuery);

      if (status.status === 'PAID' || status.status === 'settled' || status.status?.toLowerCase() === 'paid' || status.status?.toLowerCase() === 'settled' || status.amountPaid > 0) {
        setPaymentStatus(status);
        // Cap amount at invoice amountDue — Pesaflow returns penalty + eCitizen service fee
        setAmount(Math.min(status.amountPaid, amountDue).toString());
        // Pre-fill M-Pesa ref if Pesaflow returned it; otherwise leave blank for manual entry
        setMpesaRef(status.paymentReference || '');

        // Auto-suggest notes when using an alternate reference
        if (isUsingAlternateRef && !notes.trim()) {
          const mpesaCode = status.paymentReference || '';
          setNotes(
            `eCitizen ref ${alternateRef.trim()} confirmed paid${mpesaCode ? ` via M-Pesa ${mpesaCode}` : ''}; ` +
            `original invoice ref ${originalRef} could not be used for payment ` +
            `(please explain reason — e.g. iframe blocked on live eCitizen).`
          );
        }

        setStep('confirmed');
      } else {
        setError(
          `Transaction not found or not yet paid. Status: ${status.status || 'UNKNOWN'}. ` +
          'Please verify the reference and try again.'
        );
        setStep('input');
      }
    } catch {
      setError('Failed to verify payment. Please check the reference and try again.');
      setStep('input');
    }
  };

  const handleReconcile = async () => {
    if (!mpesaRef.trim()) {
      setError('M-Pesa / Transaction Reference is required for reconciliation.');
      return;
    }

    if (notesRequired && !notes.trim()) {
      setError('Notes are required when reconciling under a different reference — please explain why.');
      return;
    }

    setError(null);
    setStep('reconciling');

    try {
      const result = await reconcileInvoice(invoiceId, {
        transactionReference: mpesaRef.trim(),
        amountPaid: parseFloat(amount),
        alternateReference: isUsingAlternateRef ? alternateRef.trim() : undefined,
        notes: notes.trim() || undefined,
      });

      if (result.success) {
        setStep('done');
        toast.success(`Invoice ${invoiceNo} reconciled successfully`);

        setTimeout(() => {
          onReconciled?.();
          onOpenChange(false);
        }, 1500);
      } else {
        setError(result.message || 'Failed to reconcile invoice. Please try again.');
        setStep('confirmed');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to reconcile invoice. Please try again.';
      setError(msg);
      setStep('confirmed');
    }
  };

  const handleClose = () => {
    if (step === 'verifying' || step === 'reconciling') return;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reconcile Invoice</DialogTitle>
          <DialogDescription>
            Verify and reconcile <strong>{invoiceNo}</strong> against Pesaflow payment records.
          </DialogDescription>
        </DialogHeader>

        {/* Step: Input */}
        {(step === 'input' || step === 'verifying') && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reconcile-amount">Amount Due</Label>
              <Input
                id="reconcile-amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>

            {/* Original reference — read-only, preserved for audit trail */}
            <div className="space-y-2">
              <Label htmlFor="original-ref" className="flex items-center gap-1.5">
                Original Pesaflow Reference
                <span className="text-xs text-muted-foreground font-normal">(read-only)</span>
              </Label>
              <Input
                id="original-ref"
                value={originalRef || '—'}
                readOnly
                disabled
                className="bg-muted text-muted-foreground font-mono text-sm"
              />
            </div>

            {/* Alternate reference — for when payment went to a different eCitizen ref */}
            <div className="space-y-2">
              <Label htmlFor="alternate-ref">
                Alternate Reference
                <span className="text-xs text-muted-foreground font-normal ml-1.5">(optional)</span>
              </Label>
              <Input
                id="alternate-ref"
                value={alternateRef}
                onChange={(e) => setAlternateRef(e.target.value)}
                placeholder="e.g. BVXAJQVX — if payment went to a different eCitizen ref"
                disabled={step === 'verifying'}
                className="font-mono"
              />
              {isUsingAlternateRef && (
                <p className="flex items-center gap-1.5 text-xs text-amber-600">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  Pesaflow will be queried using this reference. Notes will be required.
                </p>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Step: Confirmed — show verified payment details + M-Pesa ref + notes */}
        {step === 'confirmed' && paymentStatus && (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="font-medium text-emerald-800">Payment Verified</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Amount Paid</span>
                  <p className="font-semibold">{formatCurrency(paymentStatus.amountPaid)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount to Record</span>
                  <p className="font-semibold text-emerald-700">{formatCurrency(parseFloat(amount))}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Channel</span>
                  <p className="font-semibold">{paymentStatus.paymentChannel || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date</span>
                  <p className="font-semibold">
                    {paymentStatus.paymentDate
                      ? new Date(paymentStatus.paymentDate).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {parseFloat(amount) < paymentStatus.amountPaid && (
                <p className="text-xs text-amber-700 flex items-center gap-1.5 border-t border-emerald-200 pt-2">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  Amount capped at invoice total ({formatCurrency(parseFloat(amount))}). Pesaflow returned {formatCurrency(paymentStatus.amountPaid)} which includes the eCitizen service fee.
                </p>
              )}

              {isUsingAlternateRef && (
                <div className="border-t border-emerald-200 pt-2 text-xs text-emerald-700 space-y-0.5">
                  <p><span className="font-medium">Queried via alternate ref:</span> {alternateRef.trim()}</p>
                  <p><span className="font-medium">Original invoice ref:</span> {originalRef} (preserved)</p>
                </div>
              )}
            </div>

            {/* M-Pesa / Transaction Reference — always required */}
            <div className="space-y-2">
              <Label htmlFor="mpesa-ref" className="flex items-center gap-1">
                M-Pesa / Transaction Reference
                <span className="text-red-500 text-xs ml-1">* required</span>
              </Label>
              <Input
                id="mpesa-ref"
                value={mpesaRef}
                onChange={(e) => setMpesaRef(e.target.value.trim().toUpperCase())}
                placeholder="e.g. UETJS5SUID"
                className={`font-mono ${!mpesaRef.trim() ? 'border-amber-400 focus:border-amber-500' : ''}`}
              />
              {!paymentStatus.paymentReference && (
                <p className="text-xs text-amber-600 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  Not returned by Pesaflow — enter the M-Pesa or bank transaction code manually.
                </p>
              )}
            </div>

            {/* Notes — required when alternate ref was used */}
            <div className="space-y-2">
              <Label htmlFor="reconcile-notes" className="flex items-center gap-1">
                Reconciliation Notes
                {notesRequired && <span className="text-red-500 text-xs ml-1">* required</span>}
              </Label>
              <Textarea
                id="reconcile-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  notesRequired
                    ? 'Required: explain why payment was made under a different reference...'
                    : 'Optional: add any notes about this reconciliation...'
                }
                rows={3}
                className={notesRequired && !notes.trim() ? 'border-amber-400 focus:border-amber-500' : ''}
              />
              {notesRequired && !notes.trim() && (
                <p className="text-xs text-amber-600 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Notes are required when reconciling under a different reference.
                </p>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="flex flex-col items-center py-6 gap-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <p className="font-medium text-emerald-700">Invoice Reconciled</p>
            <Badge variant="outline" className="text-emerald-700 border-emerald-300">
              Receipt generated
            </Badge>
          </div>
        )}

        {/* Step: Reconciling */}
        {step === 'reconciling' && (
          <div className="flex flex-col items-center py-6 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Reconciling invoice...</p>
          </div>
        )}

        <DialogFooter>
          {step === 'input' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleVerify} className="gap-2">
                <Search className="h-4 w-4" />
                Verify Payment
              </Button>
            </>
          )}

          {step === 'verifying' && (
            <Button disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </Button>
          )}

          {step === 'confirmed' && (
            <>
              <Button variant="outline" onClick={() => { setStep('input'); setError(null); }}>
                Back
              </Button>
              <Button
                onClick={handleReconcile}
                disabled={(notesRequired && !notes.trim()) || !mpesaRef.trim()}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                Reconcile
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
