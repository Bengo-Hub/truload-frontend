"use client";

import { PesaflowCheckoutDialog } from '@/components/payments/PesaflowCheckoutDialog';
import { ReconcileDialog } from '@/components/payments/ReconcileDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    useChargeCalculation,
    useCreateProsecution,
    useDownloadChargeSheet,
    useDownloadInvoice,
    useDownloadReceipt,
    useGenerateInvoice,
    useInvoicesByProsecutionId,
    useProsecutionByCaseId,
    useReceiptsByInvoiceId,
    useRecordPayment,
} from '@/hooks/queries';
import { useAllActs } from '@/hooks/queries/useActQueries';
import {
    useCreatePesaflowInvoice,
} from '@/hooks/queries/useIntegrationQueries';
import { useCurrency } from '@/hooks/useCurrency';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import type { InvoiceDto } from '@/lib/api/invoice';
import type { ChargeCalculationResult } from '@/lib/api/prosecution';
import { generateIdempotencyKey } from '@/lib/api/receipt';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import {
    AlertTriangle,
    Calculator,
    CheckCircle2,
    CreditCard,
    DollarSign,
    Download,
    FileText,
    Globe,
    Loader2,
    Plus,
    Receipt,
    Scale,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FinancialSummary } from './FinancialSummary';

const pesaflowSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  clientEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  clientMsisdn: z.string().optional(),
  clientIdNumber: z.string().optional(),
});

type PesaflowFormValues = z.infer<typeof pesaflowSchema>;

interface ProsecutionSectionProps {
  caseId: string;
  caseNo: string;
  weighingId?: string;
  /** When true (e.g. case opened from Case management), hide create prosecution and pay actions. */
  readOnly?: boolean;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'mobile_money', label: 'M-Pesa / Mobile Money' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card Payment' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'pesaflow', label: 'Pesaflow (eCitizen)' },
];

export function ProsecutionSection({ caseId, caseNo: _caseNo, weighingId, readOnly = false }: ProsecutionSectionProps) {
  const isOnline = useOnlineStatus();
  const { data: acts } = useAllActs();

  // Queries
  const { data: prosecution, isLoading, refetch } = useProsecutionByCaseId(caseId);
  const { data: invoices = [] } = useInvoicesByProsecutionId(prosecution?.id);

  // Get the primary invoice (most recent unpaid or latest)
  const primaryInvoice = invoices.find((i) => i.status === 'pending') || invoices[0];
  const { data: receipts = [] } = useReceiptsByInvoiceId(primaryInvoice?.id);

  // Charge calculation (only when no prosecution exists and we have weighingId)
  const [legalFramework, setLegalFramework] = useState('TRAFFIC_ACT');
  const {
    data: chargeCalc,
    isLoading: isCalculating,
    refetch: recalculate,
  } = useChargeCalculation(
    !prosecution && weighingId ? weighingId : undefined,
    legalFramework
  );

  // Mutations
  const createProsecutionMutation = useCreateProsecution();
  const downloadChargeSheetMutation = useDownloadChargeSheet();
  const generateInvoiceMutation = useGenerateInvoice();
  const downloadInvoiceMutation = useDownloadInvoice();
  const recordPaymentMutation = useRecordPayment();
  const downloadReceiptMutation = useDownloadReceipt();
  const createPesaflowInvoiceMutation = useCreatePesaflowInvoice();

  // Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPesaflowModal, setShowPesaflowModal] = useState(false);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [showReconcileDialog, setShowReconcileDialog] = useState(false);
  const [checkoutPaymentLink, setCheckoutPaymentLink] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDto | null>(null);

  // Payment form states
  const [paymentForm, setPaymentForm] = useState({
    amountPaid: '',
    paymentMethod: '',
    transactionReference: '',
  });

  // Get status badge
  const getStatusBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'invoiced':
        return <Badge className="bg-blue-100 text-blue-800">Invoiced</Badge>;
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case 'court':
        return <Badge className="bg-purple-100 text-purple-800">Court</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
    }
  };

  const { formatAmount: formatCurrency } = useCurrency();

  // Handle create prosecution from charges — use real act ID from GET /acts
  const handleCreateProsecution = useCallback(
    async (charges: ChargeCalculationResult) => {
      const actCode = charges.legalFramework === 'EAC_ACT' ? 'EAC_ACT' : 'TRAFFIC_ACT';
      const act = acts?.find((a) => a.code === actCode);
      if (!act?.id) {
        toast.error(`No act found for ${actCode}. Configure acts in Setup → Acts.`);
        return;
      }
      try {
        await createProsecutionMutation.mutateAsync({
          caseId,
          request: {
            actId: act.id,
            caseNotes: undefined,
          },
        });
        toast.success('Prosecution case created successfully');
        refetch();
      } catch (_error) {
        toast.error('Failed to create prosecution case');
      }
    },
    [caseId, acts, createProsecutionMutation, refetch]
  );

  // Handle generate invoice
  const handleGenerateInvoice = useCallback(async () => {
    if (!prosecution) return;

    try {
      await generateInvoiceMutation.mutateAsync(prosecution.id);
      toast.success('Invoice generated successfully');
      refetch();
    } catch (_error) {
      toast.error('Failed to generate invoice');
    }
  }, [prosecution, generateInvoiceMutation, refetch]);

  // Handle record payment
  const handleRecordPayment = useCallback(async () => {
    if (!selectedInvoice || !paymentForm.amountPaid || !paymentForm.paymentMethod) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await recordPaymentMutation.mutateAsync({
        invoiceId: selectedInvoice.id,
        request: {
          amountPaid: parseFloat(paymentForm.amountPaid),
          currency: selectedInvoice.currency,
          paymentMethod: paymentForm.paymentMethod,
          transactionReference: paymentForm.transactionReference || undefined,
          idempotencyKey: generateIdempotencyKey(),
        },
      });
      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      setSelectedInvoice(null);
      setPaymentForm({ amountPaid: '', paymentMethod: '', transactionReference: '' });
      refetch();
    } catch (_error) {
      toast.error('Failed to record payment');
    }
  }, [selectedInvoice, paymentForm, recordPaymentMutation, refetch]);

  // Open payment modal
  const openPaymentModal = (invoice: InvoiceDto) => {
    setSelectedInvoice(invoice);
    setPaymentForm({
      amountPaid: invoice.balanceRemaining.toString(),
      paymentMethod: '',
      transactionReference: '',
    });
    setShowPaymentModal(true);
  };

  // Pesaflow payment form
  const pesaflowForm = useForm<PesaflowFormValues>({
    resolver: zodResolver(pesaflowSchema),
    defaultValues: {
      clientName: '',
      clientEmail: '',
      clientMsisdn: '',
      clientIdNumber: '',
    },
  });

  const watchedClientMsisdn = pesaflowForm.watch('clientMsisdn');

  // Handle Pesaflow invoice creation → open checkout iframe
  const handlePesaflowPayment = useCallback(async (data: PesaflowFormValues) => {
    if (!selectedInvoice) return;

    try {
      // Create Pesaflow invoice — backend POSTs to Pesaflow iframe endpoint
      // and returns paymentLink (checkout URL)
      const result = await createPesaflowInvoiceMutation.mutateAsync({
        invoiceId: selectedInvoice.id,
        request: {
          clientName: data.clientName,
          clientEmail: data.clientEmail || undefined,
          clientMsisdn: data.clientMsisdn || undefined,
          clientIdNumber: data.clientIdNumber || undefined,
        },
      });

      if (result.paymentLink) {
        setCheckoutPaymentLink(result.paymentLink);
        setShowPesaflowModal(false);
        setShowCheckoutDialog(true);
      } else {
        toast.success('Pesaflow invoice created — awaiting payment link');
        setShowPesaflowModal(false);
        refetch();
      }
    } catch {
      toast.error('Failed to create Pesaflow invoice');
    }
  }, [
    selectedInvoice,
    createPesaflowInvoiceMutation,
    refetch,
  ]);

  // Open Pesaflow payment modal
  const openPesaflowModal = (invoice: InvoiceDto) => {
    setSelectedInvoice(invoice);
    pesaflowForm.reset({ clientName: '', clientEmail: '', clientMsisdn: '', clientIdNumber: '' });
    setShowPesaflowModal(true);
  };

  // Handle framework change
  const handleFrameworkChange = (value: string) => {
    setLegalFramework(value);
    recalculate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  // No prosecution exists - show charge calculation or read-only message
  if (!prosecution) {
    if (readOnly) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-orange-500" />
              Prosecution & Charges
            </CardTitle>
            <CardDescription>Prosecution and payment actions are done from Case register</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              To create a prosecution case or record payment, open this case from <Link href="/cases" className="text-primary underline">Case register</Link>.
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-orange-500" />
            Prosecution & Charges
          </CardTitle>
          <CardDescription>Calculate charges and create prosecution case</CardDescription>
        </CardHeader>
        <CardContent>
          {!weighingId ? (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No weighing transaction linked to this case</p>
              <p className="text-sm mt-1">Link a weighing transaction to calculate charges</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Legal Framework Selection */}
              <div className="flex items-center gap-4">
                <Label>Legal Framework:</Label>
                <Select value={legalFramework} onValueChange={handleFrameworkChange}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRAFFIC_ACT">Kenya Traffic Act (0% tolerance)</SelectItem>
                    <SelectItem value="EAC_ACT">EAC Vehicle Load Control (5% tolerance)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isCalculating ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-2">Calculating charges...</span>
                </div>
              ) : chargeCalc ? (
                <div className="space-y-4">
                  {/* Charge Breakdown Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Charge Type</TableHead>
                        <TableHead className="text-right">Overload (kg)</TableHead>
                        <TableHead className="text-right">Fee (USD)</TableHead>
                        <TableHead className="text-right">Fee (KES)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>GVW Overload</TableCell>
                        <TableCell className="text-right font-mono">
                          {chargeCalc.gvwOverloadKg.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(chargeCalc.gvwFeeUsd, 'USD')}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(chargeCalc.gvwFeeKes, 'KES')}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Max Axle Overload</TableCell>
                        <TableCell className="text-right font-mono">
                          {chargeCalc.maxAxleOverloadKg.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(chargeCalc.maxAxleFeeUsd, 'USD')}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(chargeCalc.maxAxleFeeKes, 'KES')}
                        </TableCell>
                      </TableRow>
                      {chargeCalc.penaltyMultiplier > 1 && (
                        <TableRow className="bg-red-50">
                          <TableCell colSpan={2}>
                            <span className="text-red-600 font-medium">
                              Repeat Offender Penalty ({chargeCalc.penaltyMultiplier}x)
                            </span>
                          </TableCell>
                          <TableCell colSpan={2} className="text-right">
                            <Badge className="bg-red-100 text-red-800">
                              {chargeCalc.priorOffenseCount} prior offense(s)
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow className="font-bold bg-gray-50">
                        <TableCell>
                          TOTAL ({chargeCalc.bestChargeBasis.toUpperCase()} basis)
                        </TableCell>
                        <TableCell />
                        <TableCell className="text-right font-mono text-lg">
                          {formatCurrency(chargeCalc.totalFeeUsd, 'USD')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-lg">
                          {formatCurrency(chargeCalc.totalFeeKes, 'KES')}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  <div className="text-sm text-gray-500">
                    Exchange Rate: 1 USD = {chargeCalc.forexRate.toFixed(2)} KES
                  </div>

                  <Button
                    onClick={() => handleCreateProsecution(chargeCalc)}
                    disabled={createProsecutionMutation.isPending}
                    className="w-full"
                  >
                    {createProsecutionMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Create Prosecution Case
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No charges calculated</p>
                  <p className="text-sm mt-1">Vehicle may not be overloaded</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Prosecution exists - show details
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-orange-500" />
                Prosecution Case
              </CardTitle>
              <CardDescription>
                {prosecution.certificateNo || prosecution.id}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(prosecution.status)}
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadChargeSheetMutation.mutate(prosecution.id)}
                disabled={downloadChargeSheetMutation.isPending}
              >
                <Download className="h-4 w-4 mr-2" />
                Charge Sheet
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {readOnly && (
            <p className="text-sm text-muted-foreground rounded-md bg-muted/50 p-3">
              Create prosecution and payment are done from Case register. Open this case from <Link href="/cases" className="text-primary underline">Case register</Link> to create or pay.
            </p>
          )}
          {/* Charge Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <Label className="text-sm text-gray-500">Best Charge Basis</Label>
              <p className="font-semibold uppercase">{prosecution.bestChargeBasis}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <Label className="text-sm text-gray-500">Penalty Multiplier</Label>
              <p className="font-semibold">{prosecution.penaltyMultiplier}x</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Label className="text-sm text-gray-500">Total Fee (USD)</Label>
              <p className="font-semibold text-lg">{formatCurrency(prosecution.totalFeeUsd, 'USD')}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Label className="text-sm text-gray-500">Total Fee (KES)</Label>
              <p className="font-semibold text-lg">
                {formatCurrency(prosecution.totalFeeKes, 'KES')}
              </p>
            </div>
          </div>

          {/* Financial Summary */}
          <FinancialSummary prosecutionId={prosecution.id} />

          {/* Invoice Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Invoices
              </h4>
              {!readOnly && prosecution.status === 'pending' && (
                <Button
                  size="sm"
                  onClick={handleGenerateInvoice}
                  disabled={generateInvoiceMutation.isPending}
                >
                  {generateInvoiceMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Generate Invoice
                </Button>
              )}
            </div>

            {invoices.length === 0 ? (
              <p className="text-gray-500 text-sm">No invoices generated yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Amount Due</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <div>
                          <span className="font-mono">{invoice.invoiceNo}</span>
                          {invoice.pesaflowInvoiceNumber && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Globe className="h-3 w-3 text-purple-500" />
                              <span className="text-[10px] text-purple-600 font-mono">
                                {invoice.pesaflowInvoiceNumber}
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(invoice.amountDue, invoice.currency)}</TableCell>
                      <TableCell className="text-green-600">
                        {formatCurrency(invoice.amountPaid, invoice.currency)}
                      </TableCell>
                      <TableCell className={invoice.balanceRemaining > 0 ? 'text-red-600' : ''}>
                        {formatCurrency(invoice.balanceRemaining, invoice.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge
                            className={
                              invoice.status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }
                          >
                            {invoice.status}
                          </Badge>
                          {invoice.pesaflowPaymentReference && (
                            <Badge className="bg-purple-50 text-purple-700 text-[10px]">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Pesaflow
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {!readOnly && invoice.status !== 'paid' && invoice.balanceRemaining > 0 && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openPaymentModal(invoice)}
                              >
                                <CreditCard className="h-4 w-4 mr-1.5" />
                                Pay
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-purple-200 text-purple-700 hover:bg-purple-50"
                                onClick={() => openPesaflowModal(invoice)}
                              >
                                <Globe className="h-4 w-4 mr-1.5" />
                                Pay Online
                              </Button>
                              {isOnline && !invoice.pesaflowPaymentReference && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-amber-200 text-amber-700 hover:bg-amber-50"
                                  onClick={() => {
                                    setSelectedInvoice(invoice);
                                    setShowReconcileDialog(true);
                                  }}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                  Reconcile
                                </Button>
                              )}
                            </>
                          )}
                          {!readOnly && invoice.pesaflowPaymentLink && invoice.status !== 'paid' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-purple-600"
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setCheckoutPaymentLink(invoice.pesaflowPaymentLink!);
                                setShowCheckoutDialog(true);
                              }}
                            >
                              <Globe className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => downloadInvoiceMutation.mutate(invoice.id)}
                            disabled={downloadInvoiceMutation.isPending}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Receipts Section */}
          {receipts.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-semibold flex items-center gap-2 mb-4">
                <Receipt className="h-4 w-4" />
                Payment History
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell className="font-mono">{receipt.receiptNo}</TableCell>
                      <TableCell>
                        {format(new Date(receipt.paymentDate), 'dd MMM yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        {PAYMENT_METHODS.find((m) => m.value === receipt.paymentMethod)?.label ||
                          receipt.paymentMethod}
                      </TableCell>
                      <TableCell className="text-green-600 font-semibold">
                        {formatCurrency(receipt.amountPaid, receipt.currency)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {receipt.transactionReference || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => downloadReceiptMutation.mutate(receipt.id)}
                          disabled={downloadReceiptMutation.isPending}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent>
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record payment for invoice {selectedInvoice?.invoiceNo}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0 space-y-4 -mx-4 sm:-mx-6 px-4 sm:px-6 py-1">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between">
                <span className="text-gray-500">Amount Due:</span>
                <span className="font-semibold">
                  {formatCurrency(selectedInvoice?.amountDue || 0, selectedInvoice?.currency || 'USD')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Already Paid:</span>
                <span className="text-green-600">
                  {formatCurrency(selectedInvoice?.amountPaid || 0, selectedInvoice?.currency || 'USD')}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="text-gray-500 font-semibold">Balance:</span>
                <span className="font-bold text-red-600">
                  {formatCurrency(selectedInvoice?.balanceRemaining || 0, selectedInvoice?.currency || 'USD')}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Amount to Pay *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedInvoice?.balanceRemaining}
                  value={paymentForm.amountPaid}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({ ...prev, amountPaid: e.target.value }))
                  }
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Method *</Label>
              <Select
                value={paymentForm.paymentMethod}
                onValueChange={(value) =>
                  setPaymentForm((prev) => ({ ...prev, paymentMethod: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.filter((m) => m.value !== 'pesaflow').map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Transaction Reference</Label>
              <Input
                value={paymentForm.transactionReference}
                onChange={(e) =>
                  setPaymentForm((prev) => ({ ...prev, transactionReference: e.target.value }))
                }
                placeholder="e.g., M-Pesa code, bank ref"
              />
            </div>
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={recordPaymentMutation.isPending}
            >
              {recordPaymentMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pesaflow Online Payment Modal */}
      <Dialog open={showPesaflowModal} onOpenChange={(open) => { setShowPesaflowModal(open); if (!open) pesaflowForm.reset(); }}>
        <DialogContent>
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-purple-600" />
              Pay via eCitizen / Pesaflow
            </DialogTitle>
            <DialogDescription>
              Initiate online payment for invoice {selectedInvoice?.invoiceNo}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={pesaflowForm.handleSubmit(handlePesaflowPayment)}>
            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 -mx-4 sm:-mx-6 px-4 sm:px-6 py-1">
              {/* Invoice Summary */}
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-bold text-lg">
                    {formatCurrency(selectedInvoice?.balanceRemaining || 0, selectedInvoice?.currency || 'USD')}
                  </span>
                </div>
                {selectedInvoice?.pesaflowInvoiceNumber && (
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-500 text-sm">Pesaflow Ref:</span>
                    <span className="font-mono text-sm text-purple-700">
                      {selectedInvoice.pesaflowInvoiceNumber}
                    </span>
                  </div>
                )}
              </div>

              {/* Client Details */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Client Name *</Label>
                  <Input
                    {...pesaflowForm.register('clientName')}
                    placeholder="Full name of the payer"
                  />
                  {pesaflowForm.formState.errors.clientName && <p className="text-sm text-red-500">{pesaflowForm.formState.errors.clientName.message}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input
                      {...pesaflowForm.register('clientMsisdn')}
                      placeholder="e.g., 254712345678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      {...pesaflowForm.register('clientEmail')}
                      placeholder="client@example.com"
                    />
                    {pesaflowForm.formState.errors.clientEmail && <p className="text-sm text-red-500">{pesaflowForm.formState.errors.clientEmail.message}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>ID Number</Label>
                  <Input
                    {...pesaflowForm.register('clientIdNumber')}
                    placeholder="National ID or Passport number"
                  />
                </div>
              </div>

              {watchedClientMsisdn && (
                <p className="text-xs text-purple-600 bg-purple-50 p-2 rounded">
                  An M-Pesa STK push will be sent to {watchedClientMsisdn} for direct payment.
                </p>
              )}
            </div>
            <DialogFooter className="flex-shrink-0">
              <Button type="button" variant="outline" onClick={() => setShowPesaflowModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPesaflowInvoiceMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {createPesaflowInvoiceMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Globe className="h-4 w-4 mr-2" />
                )}
                Proceed to Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pesaflow Checkout Iframe Dialog */}
      <PesaflowCheckoutDialog
        open={showCheckoutDialog}
        onOpenChange={setShowCheckoutDialog}
        paymentLink={checkoutPaymentLink}
        invoiceId={selectedInvoice?.id || ''}
        invoiceNo={selectedInvoice?.invoiceNo || ''}
        pesaflowInvoiceNumber={selectedInvoice?.pesaflowInvoiceNumber}
        onPaymentConfirmed={() => {
          refetch();
        }}
      />

      {/* Reconcile Offline Invoice Dialog */}
      <ReconcileDialog
        open={showReconcileDialog}
        onOpenChange={setShowReconcileDialog}
        invoiceId={selectedInvoice?.id || ''}
        invoiceNo={selectedInvoice?.invoiceNo || ''}
        pesaflowInvoiceNumber={selectedInvoice?.pesaflowInvoiceNumber}
        amountDue={selectedInvoice?.balanceRemaining || 0}
        currency={selectedInvoice?.currency || 'KES'}
        onReconciled={() => {
          refetch();
        }}
      />
    </>
  );
}
