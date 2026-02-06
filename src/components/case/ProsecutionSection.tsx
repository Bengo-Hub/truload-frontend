"use client";

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  useProsecutionByCaseId,
  useChargeCalculation,
  useCreateProsecution,
  useDownloadChargeSheet,
  useGenerateInvoice,
  useInvoicesByProsecutionId,
  useDownloadInvoice,
  useReceiptsByInvoiceId,
  useRecordPayment,
  useDownloadReceipt,
} from '@/hooks/queries';
import { generateIdempotencyKey } from '@/lib/api/receipt';
import type { ChargeCalculationResult } from '@/lib/api/prosecution';
import type { InvoiceDto } from '@/lib/api/invoice';
import {
  AlertTriangle,
  Calculator,
  CreditCard,
  DollarSign,
  Download,
  FileText,
  Loader2,
  Plus,
  Receipt,
  Scale,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ProsecutionSectionProps {
  caseId: string;
  caseNo: string;
  weighingId?: string;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'mobile_money', label: 'M-Pesa / Mobile Money' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card Payment' },
  { value: 'cheque', label: 'Cheque' },
];

export function ProsecutionSection({ caseId, caseNo, weighingId }: ProsecutionSectionProps) {
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

  // Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
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

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  // Handle create prosecution from charges
  const handleCreateProsecution = useCallback(
    async (charges: ChargeCalculationResult) => {
      try {
        await createProsecutionMutation.mutateAsync({
          caseId,
          request: {
            weighingId: charges.weighingId,
            actId: charges.legalFramework === 'EAC_ACT' ? 'eac-act-id' : 'traffic-act-id', // These should come from lookup
            gvwOverloadKg: charges.gvwOverloadKg,
            gvwFeeUsd: charges.gvwFeeUsd,
            gvwFeeKes: charges.gvwFeeKes,
            maxAxleOverloadKg: charges.maxAxleOverloadKg,
            maxAxleFeeUsd: charges.maxAxleFeeUsd,
            maxAxleFeeKes: charges.maxAxleFeeKes,
            bestChargeBasis: charges.bestChargeBasis,
            penaltyMultiplier: charges.penaltyMultiplier,
            totalFeeUsd: charges.totalFeeUsd,
            totalFeeKes: charges.totalFeeKes,
            forexRate: charges.forexRate,
          },
        });
        toast.success('Prosecution case created successfully');
        refetch();
      } catch (error) {
        toast.error('Failed to create prosecution case');
      }
    },
    [caseId, createProsecutionMutation, refetch]
  );

  // Handle generate invoice
  const handleGenerateInvoice = useCallback(async () => {
    if (!prosecution) return;

    try {
      await generateInvoiceMutation.mutateAsync(prosecution.id);
      toast.success('Invoice generated successfully');
      refetch();
    } catch (error) {
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
    } catch (error) {
      toast.error('Failed to record payment');
    }
  }, [selectedInvoice, paymentForm, recordPaymentMutation, refetch]);

  // Open payment modal
  const openPaymentModal = (invoice: InvoiceDto) => {
    setSelectedInvoice(invoice);
    setPaymentForm({
      amountPaid: invoice.balance.toString(),
      paymentMethod: '',
      transactionReference: '',
    });
    setShowPaymentModal(true);
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

  // No prosecution exists - show charge calculation
  if (!prosecution) {
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
                          {formatCurrency(chargeCalc.gvwFeeUsd)}
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
                          {formatCurrency(chargeCalc.maxAxleFeeUsd)}
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
                          {formatCurrency(chargeCalc.totalFeeUsd)}
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
              <p className="font-semibold text-lg">{formatCurrency(prosecution.totalFeeUsd)}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Label className="text-sm text-gray-500">Total Fee (KES)</Label>
              <p className="font-semibold text-lg">
                {formatCurrency(prosecution.totalFeeKes, 'KES')}
              </p>
            </div>
          </div>

          {/* Invoice Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Invoices
              </h4>
              {prosecution.status === 'pending' && (
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
                      <TableCell className="font-mono">{invoice.invoiceNo}</TableCell>
                      <TableCell>{formatCurrency(invoice.amountDue, invoice.currency)}</TableCell>
                      <TableCell className="text-green-600">
                        {formatCurrency(invoice.totalPaid, invoice.currency)}
                      </TableCell>
                      <TableCell className={invoice.balance > 0 ? 'text-red-600' : ''}>
                        {formatCurrency(invoice.balance, invoice.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            invoice.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {invoice.status !== 'paid' && invoice.balance > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openPaymentModal(invoice)}
                            >
                              <CreditCard className="h-4 w-4 mr-2" />
                              Pay
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
                  {formatCurrency(selectedInvoice?.amountDue || 0, selectedInvoice?.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Already Paid:</span>
                <span className="text-green-600">
                  {formatCurrency(selectedInvoice?.totalPaid || 0, selectedInvoice?.currency)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="text-gray-500 font-semibold">Balance:</span>
                <span className="font-bold text-red-600">
                  {formatCurrency(selectedInvoice?.balance || 0, selectedInvoice?.currency)}
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
                  max={selectedInvoice?.balance}
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
                  {PAYMENT_METHODS.map((method) => (
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
    </>
  );
}
