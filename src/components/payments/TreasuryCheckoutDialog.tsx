'use client';

/**
 * TreasuryCheckoutDialog: Redirects commercial tenants to the treasury pay page
 * for payment processing via Paystack/M-Pesa.
 *
 * The treasury pay page at books.codevertexitsolutions.com/pay handles:
 * - Invoice display
 * - Gateway selection (Paystack, M-Pesa, Cash)
 * - Payment processing
 * - Status callbacks
 *
 * After payment, the treasury webhook notifies truload-backend which auto-marks
 * the invoice as paid and sends a notification to the weighing officer.
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
import { Badge } from '@/components/ui/badge';
import { CheckCircle, CreditCard, ExternalLink, Loader2 } from 'lucide-react';
import { useCallback, useState } from 'react';

interface TreasuryCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceNo: string;
  amountDue: number;
  currency: string;
  treasuryPaymentUrl: string;
  treasuryIntentStatus?: string;
  onPaymentConfirmed?: () => void;
}

export function TreasuryCheckoutDialog({
  open,
  onOpenChange,
  invoiceNo,
  amountDue,
  currency,
  treasuryPaymentUrl,
  treasuryIntentStatus,
  onPaymentConfirmed,
}: TreasuryCheckoutDialogProps) {
  const [redirecting, setRedirecting] = useState(false);
  const isPaid = treasuryIntentStatus === 'succeeded';

  const handlePayNow = useCallback(() => {
    setRedirecting(true);
    // Open treasury pay page in a new tab (so user stays on truload)
    window.open(treasuryPaymentUrl, '_blank', 'noopener,noreferrer');
    // After a brief delay, allow user to check status
    setTimeout(() => setRedirecting(false), 2000);
  }, [treasuryPaymentUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pay Invoice
          </DialogTitle>
          <DialogDescription>
            Complete payment for invoice {invoiceNo} via the secure payment portal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Invoice summary */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Invoice</span>
              <span className="font-mono text-sm font-medium">{invoiceNo}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="text-lg font-bold">{currency} {amountDue.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge className={isPaid ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                {isPaid ? 'Paid' : 'Pending Payment'}
              </Badge>
            </div>
          </div>

          {isPaid ? (
            <div className="flex flex-col items-center gap-2 rounded-lg bg-green-50 p-4 text-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <p className="text-sm font-medium text-green-800">Payment Confirmed</p>
              <p className="text-xs text-green-600">Receipt has been generated automatically.</p>
            </div>
          ) : (
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                You will be redirected to the secure payment portal where you can pay via M-Pesa, card, or bank transfer.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isPaid ? 'Close' : 'Cancel'}
          </Button>
          {!isPaid && (
            <Button onClick={handlePayNow} disabled={redirecting}>
              {redirecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Pay Now
            </Button>
          )}
          {isPaid && onPaymentConfirmed && (
            <Button onClick={onPaymentConfirmed}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
