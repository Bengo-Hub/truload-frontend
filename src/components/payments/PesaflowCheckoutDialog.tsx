'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, Loader2, RefreshCcw, CheckCircle2, XCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PesaflowPaymentStatusResponse } from '@/lib/api/integration';
import { queryPaymentStatus } from '@/lib/api/integration';
import { toast } from 'sonner';

interface PesaflowCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentLink: string | null;
  invoiceId: string;
  invoiceNo: string;
  pesaflowInvoiceNumber?: string;
  onPaymentConfirmed?: () => void;
}

type PaymentState = 'loading' | 'checkout' | 'checking' | 'paid' | 'failed';

export function PesaflowCheckoutDialog({
  open,
  onOpenChange,
  paymentLink,
  invoiceId,
  invoiceNo,
  pesaflowInvoiceNumber,
  onPaymentConfirmed,
}: PesaflowCheckoutDialogProps) {
  const [paymentState, setPaymentState] = useState<PaymentState>('loading');
  const [paymentStatus, setPaymentStatus] = useState<PesaflowPaymentStatusResponse | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const startStatusPolling = useCallback(() => {
    if (!invoiceId || !pesaflowInvoiceNumber) return;

    pollingRef.current = setInterval(async () => {
      try {
        const status = await queryPaymentStatus(invoiceId, pesaflowInvoiceNumber);
        if (status.status === 'PAID' || status.amountPaid > 0) {
          setPaymentStatus(status);
          setPaymentState('paid');
          if (pollingRef.current) clearInterval(pollingRef.current);
          toast.success('Payment confirmed!');
          onPaymentConfirmed?.();
        }
      } catch {
        // Silently retry — polling will continue
      }
    }, 10000);
  }, [invoiceId, pesaflowInvoiceNumber, onPaymentConfirmed]);

  const handleIframeLoad = useCallback(() => {
    setPaymentState('checkout');
  }, []);

  const handleCheckStatus = useCallback(async () => {
    if (!invoiceId || !pesaflowInvoiceNumber) return;
    setPaymentState('checking');
    try {
      const status = await queryPaymentStatus(invoiceId, pesaflowInvoiceNumber);
      setPaymentStatus(status);
      if (status.status === 'PAID' || status.amountPaid > 0) {
        setPaymentState('paid');
        if (pollingRef.current) clearInterval(pollingRef.current);
        toast.success('Payment confirmed!');
        onPaymentConfirmed?.();
      } else {
        setPaymentState('checkout');
        toast.info('Payment not yet received. Please complete the payment.');
      }
    } catch {
      setPaymentState('checkout');
      toast.error('Could not check payment status');
    }
  }, [invoiceId, pesaflowInvoiceNumber, onPaymentConfirmed]);

  useEffect(() => {
    if (open && paymentLink) {
      setPaymentState('loading');
      setPaymentStatus(null);
      startStatusPolling();
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [open, paymentLink, startStatusPolling]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-purple-600" />
            eCitizen / Pesaflow Payment
          </DialogTitle>
          <DialogDescription>
            Complete payment for invoice {invoiceNo}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-2 bg-gray-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            {paymentState === 'paid' ? (
              <Badge className="bg-green-100 text-green-700">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Payment Confirmed
              </Badge>
            ) : paymentState === 'checking' ? (
              <Badge className="bg-blue-100 text-blue-700">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Checking Status...
              </Badge>
            ) : (
              <Badge className="bg-yellow-100 text-yellow-700">
                Awaiting Payment
              </Badge>
            )}
            {pesaflowInvoiceNumber && (
              <span className="text-xs text-gray-500 font-mono">{pesaflowInvoiceNumber}</span>
            )}
          </div>
          {paymentState !== 'paid' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCheckStatus}
              disabled={paymentState === 'checking'}
            >
              <RefreshCcw className={`h-4 w-4 mr-1 ${paymentState === 'checking' ? 'animate-spin' : ''}`} />
              Check Status
            </Button>
          )}
        </div>

        <div className="flex-1 min-h-0 relative">
          {paymentState === 'paid' && paymentStatus ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Successful</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Amount: <span className="font-medium text-gray-900">KES {paymentStatus.amountPaid?.toLocaleString()}</span></p>
                {paymentStatus.paymentReference && (
                  <p>Reference: <span className="font-mono text-gray-900">{paymentStatus.paymentReference}</span></p>
                )}
                {paymentStatus.paymentChannel && (
                  <p>Channel: <span className="text-gray-900">{paymentStatus.paymentChannel}</span></p>
                )}
              </div>
              <Button
                className="mt-6"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div>
          ) : !paymentLink ? (
            <div className="flex items-center justify-center py-12">
              <XCircle className="h-8 w-8 text-red-400 mr-2" />
              <span className="text-gray-600">No payment link available</span>
            </div>
          ) : (
            <>
              {paymentState === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                    <p className="text-sm text-gray-500">Loading payment page...</p>
                  </div>
                </div>
              )}
              <iframe
                ref={iframeRef}
                src={paymentLink}
                className="w-full h-[500px] border-0"
                title="Pesaflow Payment"
                onLoad={handleIframeLoad}
                sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-top-navigation"
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
