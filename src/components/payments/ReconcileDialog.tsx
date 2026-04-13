/**
 * ReconcileDialog — allows an officer to reconcile an offline-created
 * invoice against a real Pesaflow transaction once back online.
 *
 * Flow:
 * 1. User inputs the amount paid and Pesaflow transaction reference
 * 2. "Verify" queries the Pesaflow payment status endpoint
 * 3. Shows transaction details for confirmation
 * 4. "Reconcile" updates the invoice status + generates a receipt
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
import { queryPaymentStatus, reconcileInvoice, type PesaflowPaymentStatusResponse } from '@/lib/api/integration';
import { AlertTriangle, CheckCircle2, Loader2, Search } from 'lucide-react';
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
  const [transactionRef, setTransactionRef] = useState('');
  const [amount, setAmount] = useState(amountDue.toString());
  const [paymentStatus, setPaymentStatus] = useState<PesaflowPaymentStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const invoiceReference = pesaflowInvoiceNumber?.trim() || '';

  useEffect(() => {
    if (!open) return;
    setTransactionRef(invoiceReference);
    setAmount(amountDue.toString());
  }, [open, invoiceReference, amountDue]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: currency || 'KES' }).format(val);

  const handleVerify = async () => {
    if (!invoiceReference.trim() && !transactionRef.trim()) {
      setError('Invoice reference is required for verification');
      return;
    }

    setError(null);
    setStep('verifying');

    try {
      const refNo = invoiceReference || transactionRef.trim();
      const status = await queryPaymentStatus(invoiceId, refNo);

      if (status.status === 'PAID' || status.amountPaid > 0) {
        setPaymentStatus(status);
        setAmount(status.amountPaid.toString());
        setStep('confirmed');
      } else {
        setError(
          `Transaction not found or not yet paid. Status: ${status.status || 'UNKNOWN'}. ` +
          'Please verify the transaction reference and try again.'
        );
        setStep('input');
      }
    } catch {
      setError('Failed to verify payment. Please check the reference and try again.');
      setStep('input');
    }
  };

  const handleReconcile = async () => {
    setStep('reconciling');

    try {
      // Use the new unified backend reconciliation endpoint
      const result = await reconcileInvoice(invoiceId, {
        amountPaid: parseFloat(amount),
        transactionReference: paymentStatus?.paymentReference || transactionRef,
      });

      if (result.success) {
        setStep('done');
        toast.success(`Invoice ${invoiceNo} reconciled successfully`);

        // Notify parent after short delay so user sees success state
        setTimeout(() => {
          onReconciled?.();
          onOpenChange(false);
          // Reset state
          setStep('input');
          setTransactionRef('');
          setPaymentStatus(null);
          setError(null);
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
    if (step === 'verifying' || step === 'reconciling') return; // prevent close during async ops
    onOpenChange(false);
    // Reset after animation
    setTimeout(() => {
      setStep('input');
      setTransactionRef('');
      setPaymentStatus(null);
      setError(null);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reconcile Invoice</DialogTitle>
          <DialogDescription>
            Verify and reconcile offline invoice <strong>{invoiceNo}</strong> against Pesaflow payment records.
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

            <div className="space-y-2">
              <Label htmlFor="reconcile-ref">Pesaflow Transaction Reference</Label>
              <Input
                id="reconcile-ref"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="e.g. PJLVXY or UDDEQ11M54"
                disabled={step === 'verifying'}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Step: Confirmed — show verified payment details */}
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
                  <span className="text-muted-foreground">Channel</span>
                  <p className="font-semibold">{paymentStatus.paymentChannel || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Reference</span>
                  <p className="font-mono text-xs">{paymentStatus.paymentReference || transactionRef}</p>
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
              <Button onClick={handleReconcile} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
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
