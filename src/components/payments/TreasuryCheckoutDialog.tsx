'use client';

/**
 * TreasuryCheckoutDialog: Embeds the treasury pay page in an iframe modal
 * for seamless payment processing without leaving the app.
 *
 * Uses postMessage pattern for real-time payment status updates from
 * the treasury-ui iframe — same pattern as PesaflowCheckoutDialog.
 *
 * The treasury pay page at books.codevertexitsolutions.com/pay handles:
 * - Invoice display
 * - Gateway selection (Paystack, M-Pesa, Cash, Wallet)
 * - Payment processing
 * - Status callbacks via postMessage
 */

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCcw,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface PaymentResult {
  intentId: string;
  amount: number;
  reference?: string;
  channel?: string;
}

interface TreasuryCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceNo: string;
  amountDue: number;
  currency: string;
  treasuryPaymentUrl: string;
  paymentIntentId?: string;
  treasuryIntentStatus?: string;
  onPaymentConfirmed?: (result?: PaymentResult) => void;
}

type PaymentState = 'loading' | 'checkout' | 'checking' | 'paid' | 'failed';

export function TreasuryCheckoutDialog({
  open,
  onOpenChange,
  invoiceNo,
  amountDue,
  currency,
  treasuryPaymentUrl,
  paymentIntentId,
  treasuryIntentStatus,
  onPaymentConfirmed,
}: TreasuryCheckoutDialogProps) {
  const [paymentState, setPaymentState] = useState<PaymentState>('loading');
  const [result, setResult] = useState<PaymentResult | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isPaid = treasuryIntentStatus === 'succeeded' || paymentState === 'paid';

  // Build embed URL
  const embedUrl = treasuryPaymentUrl
    ? `${treasuryPaymentUrl}${treasuryPaymentUrl.includes('?') ? '&' : '?'}embed=true`
    : '';

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setPaymentState(isPaid ? 'paid' : 'loading');
      if (!isPaid) setResult(null);
    }
  }, [open, isPaid]);

  // Listen for treasury-ui postMessage events
  useEffect(() => {
    if (!open || isPaid) return;

    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (!data?.type?.startsWith('treasury:')) return;

      if (data.type === 'treasury:payment_confirmed') {
        const paymentResult: PaymentResult = {
          intentId: data.intentId ?? paymentIntentId ?? '',
          amount: data.amount ?? amountDue,
          reference: data.reference,
          channel: data.channel,
        };
        setResult(paymentResult);
        setPaymentState('paid');
        onPaymentConfirmed?.(paymentResult);
      } else if (data.type === 'treasury:payment_failed') {
        setPaymentState('failed');
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [open, isPaid, paymentIntentId, amountDue, onPaymentConfirmed]);

  const handleIframeLoad = useCallback(() => {
    setPaymentState('checkout');
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b">
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Pay Invoice
          </DialogTitle>
          <DialogDescription>
            Complete payment for invoice {invoiceNo}
          </DialogDescription>
        </DialogHeader>

        {/* Status bar */}
        <div className="px-6 py-2 bg-muted/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            {paymentState === 'paid' || isPaid ? (
              <Badge className="bg-green-100 text-green-700">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Payment Confirmed
              </Badge>
            ) : paymentState === 'failed' ? (
              <Badge className="bg-red-100 text-red-700">
                <XCircle className="h-3 w-3 mr-1" />
                Payment Failed
              </Badge>
            ) : paymentState === 'checking' ? (
              <Badge className="bg-blue-100 text-blue-700">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Checking...
              </Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-700">
                Awaiting Payment
              </Badge>
            )}
            <span className="text-sm font-bold">{currency} {amountDue.toLocaleString()}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 relative">
          {paymentState === 'paid' || isPaid ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Payment Successful</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Amount: <span className="font-medium text-foreground">{currency} {(result?.amount ?? amountDue).toLocaleString()}</span></p>
                {result?.reference && (
                  <p>Reference: <span className="font-mono text-foreground">{result.reference}</span></p>
                )}
                {result?.channel && (
                  <p>Channel: <span className="text-foreground">{result.channel}</span></p>
                )}
              </div>
              <Button className="mt-6" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          ) : paymentState === 'failed' ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <XCircle className="h-16 w-16 text-red-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Payment Failed</h3>
              <p className="text-sm text-muted-foreground mb-6">Please try again or use a different payment method.</p>
              <Button variant="outline" onClick={() => setPaymentState('loading')}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : !embedUrl ? (
            <div className="flex items-center justify-center py-12">
              <XCircle className="h-8 w-8 text-red-400 mr-2" />
              <span className="text-muted-foreground">No payment URL available</span>
            </div>
          ) : (
            <>
              {paymentState === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading payment page...</p>
                  </div>
                </div>
              )}
              <iframe
                ref={iframeRef}
                src={embedUrl}
                className="w-full h-[500px] border-0"
                title="Treasury Payment"
                onLoad={handleIframeLoad}
                sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
