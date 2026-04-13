'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { StationSelectFilter } from '@/components/filters/StationSelectFilter';
import { AppShell } from '@/components/layout/AppShell';
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
import { Pagination } from '@/components/ui/pagination';
import { PermissionActionButton } from '@/components/ui/permission-action-button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    useDownloadInvoice,
    useInvoiceSearch,
    useInvoiceStatistics,
    useUpdateInvoiceStatus,
    useVoidInvoice,
} from '@/hooks/queries/useInvoiceQueries';
import { useHasPermission } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { createPesaflowInvoice } from '@/lib/api/integration';
import type { InvoiceDto, InvoiceSearchCriteria } from '@/lib/api/invoice';
import { useQueryClient } from '@tanstack/react-query';
import {
    AlertCircle,
    Ban,
    CheckCircle2,
    Clock,
    CreditCard,
    DollarSign,
    Download,
    Eye,
    FileText,
    Search,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const canRead = useHasPermission('invoice.read');
  const canUpdate = useHasPermission('invoice.update');
  const canVoid = useHasPermission('invoice.void');

  // Search state
  const [searchCriteria, setSearchCriteria] = useState<InvoiceSearchCriteria>({
    pageNumber: 1,
    pageSize: 20,
  });

  // Dialog state
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDto | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [showReconcileDialog, setShowReconcileDialog] = useState(false);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  // Queries
  const { data: invoices, isLoading: isLoadingInvoices, refetch: refetchInvoices } = useInvoiceSearch(searchCriteria);
  const { data: statistics, isLoading: isLoadingStats } = useInvoiceStatistics(searchCriteria.stationId);

  // Mutations
  const updateStatusMutation = useUpdateInvoiceStatus();
  const voidInvoiceMutation = useVoidInvoice();
  const downloadPdfMutation = useDownloadInvoice();

  // Handlers
  const handleSearch = (field: keyof InvoiceSearchCriteria, value: string | number | undefined) => {
    setSearchCriteria((prev) => ({
      ...prev,
      [field]: value,
      pageNumber: 1, // Reset to first page on new search
    }));
  };

  const handlePageChange = (page: number) => {
    setSearchCriteria((prev) => ({ ...prev, pageNumber: page }));
  };

  const handleViewDetails = (invoice: InvoiceDto) => {
    setSelectedInvoice(invoice);
    setShowDetailsDialog(true);
  };

  const handleMarkAsPaid = (invoice: InvoiceDto) => {
    setSelectedInvoice(invoice);
    setShowReconcileDialog(true);
  };

  const handlePay = async (invoice: InvoiceDto) => {
    setSelectedInvoice(invoice);

    if (invoice.pesaflowPaymentLink) {
      setShowCheckoutDialog(true);
      return;
    }

    // Generate link if missing
    try {
      setIsGeneratingLink(true);
      const result = await createPesaflowInvoice(invoice.id, {
        clientName: 'Client', // Ideally pull from case details if available
      });

      if (result.success && result.paymentLink) {
        // Update local state temporarily or refetch
        invoice.pesaflowPaymentLink = result.paymentLink;
        invoice.pesaflowInvoiceNumber = result.pesaflowInvoiceNumber || undefined;
        setShowCheckoutDialog(true);
      } else {
        toast.error(result.message || 'Failed to generate payment link');
      }
    } catch (_err) {
      toast.error('Failed to connect to Pesaflow');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleVoidInvoice = async () => {
    if (!selectedInvoice || !voidReason.trim()) {
      toast.error('Please provide a void reason');
      return;
    }

    try {
      await voidInvoiceMutation.mutateAsync({
        id: selectedInvoice.id,
        reason: voidReason,
      });
      toast.success('Invoice voided successfully');
      setShowVoidDialog(false);
      setVoidReason('');
      setSelectedInvoice(null);
    } catch (_error) {
      toast.error('Failed to void invoice');
    }
  };

  const handleDownloadPdf = async (invoice: InvoiceDto) => {
    try {
      await downloadPdfMutation.mutateAsync(invoice.id);
      toast.success('Invoice downloaded');
    } catch (_error) {
      toast.error('Failed to download invoice');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return <Badge className="bg-green-500">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'overdue':
        return <Badge className="bg-red-500">Overdue</Badge>;
      case 'voided':
        return <Badge variant="outline" className="text-gray-500">Voided</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const { formatAmount: formatCurrency, selectedCurrency } = useCurrency();
  const totalPaidKes = statistics?.totalAmountPaidKes ?? 0;
  const totalPaidUsd = statistics?.totalAmountPaidUsd ?? 0;
  const totalPaidLegacy = statistics?.totalAmountPaid ?? 0;
  const hasDualRevenue = totalPaidKes > 0 && totalPaidUsd > 0;
  const singleRevenueAmount = totalPaidKes > 0
    ? { amount: totalPaidKes, currency: 'KES' }
    : totalPaidUsd > 0
      ? { amount: totalPaidUsd, currency: 'USD' }
      : { amount: totalPaidLegacy, currency: selectedCurrency };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!canRead) {
    return (
      <ProtectedRoute requiredPermissions={['invoice.read']} moduleKey="financial_invoices">
        <div className="flex h-[50vh] items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Access Denied</h3>
            <p className="text-sm text-muted-foreground">
              You don&apos;t have permission to view invoices.
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <AppShell title="Invoice Management" subtitle="Manage prosecution invoices, payments, and billing">
      <ProtectedRoute requiredPermissions={['invoice.read']} moduleKey="financial_invoices">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Invoice Management</h1>
              <p className="text-muted-foreground">
                Manage prosecution invoices, payments, and billing
              </p>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {isLoadingStats ? (
              <>
                {[...Array(4)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="mt-2 h-3 w-32" />
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{statistics?.totalInvoices || 0}</div>
                    <p className="text-xs text-muted-foreground">All time</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending</CardTitle>
                    <Clock className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{statistics?.pendingInvoices || 0}</div>
                    <p className="text-xs text-muted-foreground">Awaiting payment</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Paid</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{statistics?.paidInvoices || 0}</div>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    {hasDualRevenue ? (
                      <div className="space-y-1">
                        <div className="text-xl font-bold">{formatCurrency(totalPaidKes, 'KES')}</div>
                        <div className="text-sm font-semibold text-muted-foreground">{formatCurrency(totalPaidUsd, 'USD')}</div>
                      </div>
                    ) : (
                      <div className="text-2xl font-bold">
                        {formatCurrency(singleRevenueAmount.amount, singleRevenueAmount.currency)}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">All time collections</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Search Invoices</CardTitle>
              <CardDescription>Filter invoices by number, status, or date range</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-2">
                  <Label>Invoice Number</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by number..."
                      value={searchCriteria.invoiceNo || ''}
                      onChange={(e) => handleSearch('invoiceNo', e.target.value || undefined)}
                      className="pl-8"
                    />
                  </div>
                </div>

                <StationSelectFilter
                  value={searchCriteria.stationId ?? undefined}
                  onValueChange={(v) => handleSearch('stationId', v)}
                  label="Station"
                  placeholder="All Stations"
                  onStationChange={refetchInvoices}
                />

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={searchCriteria.status || 'all'}
                    onValueChange={(value) => handleSearch('status', value === 'all' ? undefined : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Overdue">Overdue</SelectItem>
                      <SelectItem value="Voided">Voided</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>From Date</Label>
                  <Input
                    type="date"
                    value={searchCriteria.dateFrom || ''}
                    onChange={(e) => handleSearch('dateFrom', e.target.value || undefined)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>To Date</Label>
                  <Input
                    type="date"
                    value={searchCriteria.dateTo || ''}
                    onChange={(e) => handleSearch('dateTo', e.target.value || undefined)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoices Table */}
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>
                {invoices?.totalCount || 0} invoice(s) found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingInvoices ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (invoices?.items?.length ?? 0) === 0 ? (
                <div className="flex h-40 items-center justify-center text-center">
                  <div>
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No invoices found</h3>
                    <p className="text-sm text-muted-foreground">
                      Try adjusting your search criteria
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice No</TableHead>
                          <TableHead>Prosecution Case</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Paid Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices?.items.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">{invoice.invoiceNo}</TableCell>
                            <TableCell>{invoice.caseNo || 'N/A'}</TableCell>
                            <TableCell>{formatCurrency(invoice.amountDue, invoice.currency)}</TableCell>
                            <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                            <TableCell>
                              {invoice.dueDate ? formatDate(invoice.dueDate) : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {invoice.paidAt ? formatDate(invoice.paidAt) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <PermissionActionButton
                                  permission="invoice.read"
                                  icon={Eye}
                                  label="View"
                                  onClick={() => handleViewDetails(invoice)}
                                />
                                <PermissionActionButton
                                  permission="invoice.read"
                                  icon={Download}
                                  label="Download"
                                  onClick={() => handleDownloadPdf(invoice)}
                                  disabled={downloadPdfMutation.isPending}
                                />
                                <PermissionActionButton
                                  permission="invoice.update"
                                  icon={CreditCard}
                                  label="Pay"
                                  onClick={() => handlePay(invoice)}
                                  disabled={isGeneratingLink}
                                  condition={invoice.status.toLowerCase() === 'pending'}
                                />
                                <PermissionActionButton
                                  permission="invoice.update"
                                  icon={DollarSign}
                                  label="Reconcile"
                                  onClick={() => handleMarkAsPaid(invoice)}
                                  condition={invoice.status.toLowerCase() === 'pending'}
                                  size="sm"
                                />
                                <PermissionActionButton
                                  permission="invoice.void"
                                  icon={Ban}
                                  label="Void"
                                  onClick={() => {
                                    setSelectedInvoice(invoice);
                                    setShowVoidDialog(true);
                                  }}
                                  destructive
                                  condition={invoice.status.toLowerCase() !== 'voided'}
                                  size="sm"
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Reconcile Dialog */}
                  {selectedInvoice && (
                    <ReconcileDialog
                      open={showReconcileDialog}
                      onOpenChange={setShowReconcileDialog}
                      invoiceId={selectedInvoice.id}
                      invoiceNo={selectedInvoice.invoiceNo}
                      pesaflowInvoiceNumber={selectedInvoice.pesaflowInvoiceNumber}
                      amountDue={selectedInvoice.amountDue}
                      currency={selectedInvoice.currency}
                      onReconciled={() => {
                        queryClient.invalidateQueries({ queryKey: ['invoices'] });
                        queryClient.invalidateQueries({ queryKey: ['invoices', 'statistics'] });
                      }}
                    />
                  )}

                  {/* Checkout Dialog */}
                  {selectedInvoice && (
                    <PesaflowCheckoutDialog
                      open={showCheckoutDialog}
                      onOpenChange={setShowCheckoutDialog}
                      paymentLink={selectedInvoice.pesaflowPaymentLink || null}
                      invoiceId={selectedInvoice.id}
                      invoiceNo={selectedInvoice.invoiceNo}
                      pesaflowInvoiceNumber={selectedInvoice.pesaflowInvoiceNumber}
                      onPaymentConfirmed={() => {
                        queryClient.invalidateQueries({ queryKey: ['invoices'] });
                        queryClient.invalidateQueries({ queryKey: ['invoices', 'statistics'] });
                      }}
                    />
                  )}

                  {/* Pagination */}
                  {invoices && invoices.totalCount > 0 && (
                    <Pagination
                      page={searchCriteria.pageNumber || 1}
                      pageSize={searchCriteria.pageSize || 20}
                      totalItems={invoices.totalCount}
                      onPageChange={handlePageChange}
                      onPageSizeChange={(size) => setSearchCriteria((prev) => ({ ...prev, pageSize: size, pageNumber: 1 }))}
                      isLoading={isLoadingInvoices}
                      className="mt-4"
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Details Dialog */}
          <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Invoice Details</DialogTitle>
                <DialogDescription>
                  Invoice #{selectedInvoice?.invoiceNo}
                </DialogDescription>
              </DialogHeader>
              {selectedInvoice && (
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Invoice Number</Label>
                      <p className="font-medium">{selectedInvoice.invoiceNo}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <div className="mt-1">{getStatusBadge(selectedInvoice.status)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Amount</Label>
                      <p className="text-xl font-bold">{formatCurrency(selectedInvoice.amountDue, selectedInvoice.currency)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Due Date</Label>
                      <p className="font-medium">
                        {selectedInvoice.dueDate ? formatDate(selectedInvoice.dueDate) : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Created</Label>
                      <p className="font-medium">{formatDate(selectedInvoice.createdAt)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Paid Date</Label>
                      <p className="font-medium">
                        {selectedInvoice.paidAt ? formatDate(selectedInvoice.paidAt) : 'Not paid'}
                      </p>
                    </div>
                  </div>
                  {selectedInvoice.voidedAt && (
                    <div>
                      <Label className="text-muted-foreground">Void Reason</Label>
                      <p className="font-medium">{selectedInvoice.voidReason || 'N/A'}</p>
                    </div>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                  Close
                </Button>
                {selectedInvoice && (
                  <Button onClick={() => handleDownloadPdf(selectedInvoice)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Void Dialog */}
          <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Void Invoice</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. Please provide a reason for voiding this invoice.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Void Reason</Label>
                  <Input
                    placeholder="Enter reason for voiding..."
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowVoidDialog(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleVoidInvoice}
                  disabled={voidInvoiceMutation.isPending || !voidReason.trim()}
                >
                  {voidInvoiceMutation.isPending ? 'Voiding...' : 'Void Invoice'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </ProtectedRoute>
    </AppShell>
  );
}
