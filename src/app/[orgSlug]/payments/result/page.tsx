'use client';

/**
 * eCitizen / Pesaflow payment result page.
 *
 * Pesaflow redirects the payer here after checkout (callBackURLOnSuccess/Failure/Timeout),
 * carrying `invoice_ref` (our invoice number) and `status`. We resolve the invoice, reconcile
 * it against Pesaflow to persist the receipt + mark it paid, then show the outcome. This is the
 * authoritative client-side confirmation when the IPN webhook is delayed or missed.
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useReconcileInvoice } from '@/hooks/queries';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import { searchInvoices, type InvoiceDto } from '@/lib/api/invoice';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type ResultState = 'processing' | 'paid' | 'pending' | 'failed' | 'not_found';

export default function PaymentResultPage() {
  const orgSlug = useOrgSlug();
  const params = useParams();
  const searchParams = useSearchParams();
  const invoiceRef = searchParams.get('invoice_ref') ?? '';
  const gatewayStatus = (searchParams.get('status') ?? '').toLowerCase();

  const reconcileInvoiceMutation = useReconcileInvoice();
  const [state, setState] = useState<ResultState>('processing');
  const [invoice, setInvoice] = useState<InvoiceDto | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    // Guard against double-invocation (React strict mode / re-renders).
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      if (!invoiceRef) {
        setState('not_found');
        return;
      }
      try {
        const result = await searchInvoices({ invoiceNo: invoiceRef, pageSize: 1 });
        const found = result.items?.[0] ?? null;
        setInvoice(found);
        if (!found) {
          setState('not_found');
          return;
        }
        if (found.status === 'paid') {
          setState('paid');
          return;
        }
        if (gatewayStatus && gatewayStatus !== 'success') {
          // Payment failed/timed out at the gateway — don't attempt to reconcile.
          setState('failed');
          return;
        }

        // Reconcile against Pesaflow — records the receipt + marks the invoice paid.
        const reconcile = await reconcileInvoiceMutation.mutateAsync({
          invoiceId: found.id,
          request: {},
        });
        if (reconcile.success) {
          setState('paid');
          toast.success('Payment confirmed and receipt generated.');
        } else {
          setState('pending');
        }
      } catch {
        setState('failed');
        toast.error('Could not confirm payment automatically. Use Reconcile on the invoice.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const caseHref = invoice?.caseRegisterId
    ? `/${orgSlug}/cases/${invoice.caseRegisterId}`
    : `/${orgSlug}/cases`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {state === 'processing' && <Loader2 className="h-5 w-5 animate-spin text-purple-600" />}
            {state === 'paid' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
            {(state === 'failed' || state === 'not_found') && <XCircle className="h-5 w-5 text-red-500" />}
            {state === 'pending' && <Loader2 className="h-5 w-5 text-amber-500" />}
            Payment {state === 'paid' ? 'Successful' : state === 'processing' ? 'Processing' : state === 'pending' ? 'Pending' : 'Result'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {state === 'processing' && (
            <p className="text-sm text-gray-600">Confirming your payment with eCitizen…</p>
          )}

          {state === 'paid' && (
            <div className="space-y-2 text-sm">
              <p className="text-gray-700">Your payment has been received and a receipt has been generated.</p>
              {invoice && (
                <div className="rounded-lg bg-green-50 p-3 text-gray-800">
                  <div className="flex justify-between"><span className="text-gray-500">Invoice</span><span className="font-mono">{invoice.invoiceNo}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Amount</span><span className="font-semibold">{invoice.currency} {invoice.amountDue.toLocaleString()}</span></div>
                  {invoice.pesaflowInvoiceNumber && (
                    <div className="flex justify-between"><span className="text-gray-500">eCitizen Ref</span><span className="font-mono">{invoice.pesaflowInvoiceNumber}</span></div>
                  )}
                </div>
              )}
            </div>
          )}

          {state === 'pending' && (
            <p className="text-sm text-gray-600">
              We haven&apos;t received confirmation from eCitizen yet. If you completed payment, it will
              reconcile automatically shortly — or use <strong>Reconcile</strong> on the invoice.
            </p>
          )}

          {state === 'failed' && (
            <p className="text-sm text-gray-600">
              The payment was not completed. You can try again from the case, or use
              <strong> Reconcile</strong> if you have a payment reference.
            </p>
          )}

          {state === 'not_found' && (
            <p className="text-sm text-gray-600">
              {invoiceRef
                ? `We couldn't find invoice ${invoiceRef}.`
                : 'No invoice reference was provided in the payment redirect.'}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button asChild className="flex-1">
              <Link href={caseHref}>{invoice?.caseRegisterId ? 'Back to Case' : 'Go to Cases'}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
