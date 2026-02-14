'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useHasPermission } from '@/hooks/useAuth';
import {
  useReceiptSearch,
  useReceiptStatistics,
  useVoidReceipt,
  useDownloadReceipt,
} from '@/hooks/queries/useReceiptQueries';
import type { ReceiptDto, ReceiptSearchCriteria } from '@/lib/api/receipt';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Download,
  FileText,
  Search,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ReceiptsPage() {
  const canRead = useHasPermission('receipt.read');
  const canVoid = useHasPermission('receipt.void');

  // Search state
  const [searchCriteria, setSearchCriteria] = useState<ReceiptSearchCriteria>({
    pageNumber: 1,
    pageSize: 20,
  });

  // Dialog state
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptDto | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  // Queries
  const { data: receipts, isLoading: isLoadingReceipts } = useReceiptSearch(searchCriteria);
  const { data: statistics, isLoading: isLoadingStats } = useReceiptStatistics();

  // Mutations
  const voidReceiptMutation = useVoidReceipt();
  const downloadPdfMutation = useDownloadReceipt();

  // Handlers
  const handleSearch = (field: keyof ReceiptSearchCriteria, value: string | number | undefined) => {
    setSearchCriteria((prev) => ({
      ...prev,
      [field]: value,
      pageNumber: 1,
    }));
  };

  const handlePageChange = (page: number) => {
    setSearchCriteria((prev) => ({ ...prev, pageNumber: page }));
  };

  const handleViewDetails = (receipt: ReceiptDto) => {
    setSelectedReceipt(receipt);
    setShowDetailsDialog(true);
  };

  const handleVoidReceipt = async () => {
    if (!selectedReceipt || !voidReason.trim()) {
      toast.error('Please provide a void reason');
      return;
    }

    try {
      await voidReceiptMutation.mutateAsync({
        id: selectedReceipt.id,
        reason: voidReason,
      });
      toast.success('Receipt voided successfully');
      setShowVoidDialog(false);
      setVoidReason('');
      setSelectedReceipt(null);
    } catch (_error) {
      toast.error('Failed to void receipt');
    }
  };

  const handleDownloadPdf = async (receipt: ReceiptDto) => {
    try {
      await downloadPdfMutation.mutateAsync(receipt.id);
      toast.success('Receipt downloaded');
    } catch (_error) {
      toast.error('Failed to download receipt');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'valid':
        return <Badge className="bg-green-500">Valid</Badge>;
      case 'voided':
        return <Badge variant="outline" className="text-gray-500">Voided</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'cash':
        return <Badge variant="outline" className="bg-green-50">Cash</Badge>;
      case 'mpesa':
        return <Badge variant="outline" className="bg-blue-50">M-Pesa</Badge>;
      case 'card':
        return <Badge variant="outline" className="bg-purple-50">Card</Badge>;
      case 'bank':
        return <Badge variant="outline" className="bg-orange-50">Bank Transfer</Badge>;
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!canRead) {
    return (
      <ProtectedRoute requiredPermissions={['receipt.read']}>
        <div className="flex h-[50vh] items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Access Denied</h3>
            <p className="text-sm text-muted-foreground">
              You don&apos;t have permission to view receipts.
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredPermissions={['receipt.read']}>
      <div className="container mx-auto space-y-6 p-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Receipt Management</h1>
            <p className="text-muted-foreground">
              View and manage payment receipts
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoadingStats ? (
            <>
              {[...Array(3)].map((_, i) => (
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
                  <CardTitle className="text-sm font-medium">Total Receipts</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statistics?.total || 0}</div>
                  <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(statistics?.totalCollected || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Total collected</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
                  <CreditCard className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statistics?.byPaymentMethod?.length ?? 0}</div>
                  <p className="text-xs text-muted-foreground">Different methods</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Search Receipts</CardTitle>
            <CardDescription>Filter receipts by number, payment method, or date range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Receipt Number</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by number..."
                    value={searchCriteria.receiptNo || ''}
                    onChange={(e) => handleSearch('receiptNo', e.target.value || undefined)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={searchCriteria.paymentMethod || 'all'}
                  onValueChange={(value) => handleSearch('paymentMethod', value === 'all' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="MPesa">M-Pesa</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Bank">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={searchCriteria.paymentDateFrom || ''}
                  onChange={(e) => handleSearch('paymentDateFrom', e.target.value || undefined)}
                />
              </div>

              <div className="space-y-2">
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={searchCriteria.paymentDateTo || ''}
                  onChange={(e) => handleSearch('paymentDateTo', e.target.value || undefined)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Receipts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Receipts</CardTitle>
            <CardDescription>
              {receipts?.totalCount || 0} receipt(s) found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingReceipts ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : receipts?.items.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-center">
                <div>
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No receipts found</h3>
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
                        <TableHead>Receipt No</TableHead>
                        <TableHead>Invoice No</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receipts?.items.map((receipt) => (
                        <TableRow key={receipt.id}>
                          <TableCell className="font-medium">{receipt.receiptNo}</TableCell>
                          <TableCell>{receipt.invoiceNo || 'N/A'}</TableCell>
                          <TableCell>{formatCurrency(receipt.amountPaid)}</TableCell>
                          <TableCell>{getPaymentMethodBadge(receipt.paymentMethod)}</TableCell>
                          <TableCell>{formatDate(receipt.createdAt)}</TableCell>
                          <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(receipt)}
                              >
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadPdf(receipt)}
                                disabled={downloadPdfMutation.isPending}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              {canVoid && receipt.status.toLowerCase() !== 'voided' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedReceipt(receipt);
                                    setShowVoidDialog(true);
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  Void
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {receipts && receipts.totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {((searchCriteria.pageNumber || 1) - 1) * (searchCriteria.pageSize || 20) + 1} to{' '}
                      {Math.min(
                        (searchCriteria.pageNumber || 1) * (searchCriteria.pageSize || 20),
                        receipts.totalCount
                      )}{' '}
                      of {receipts.totalCount} results
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange((searchCriteria.pageNumber || 1) - 1)}
                        disabled={(searchCriteria.pageNumber || 1) === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange((searchCriteria.pageNumber || 1) + 1)}
                        disabled={(searchCriteria.pageNumber || 1) >= receipts.totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Receipt Details</DialogTitle>
              <DialogDescription>
                Receipt #{selectedReceipt?.receiptNo}
              </DialogDescription>
            </DialogHeader>
            {selectedReceipt && (
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Receipt Number</Label>
                    <p className="font-medium">{selectedReceipt.receiptNo}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedReceipt.status)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Amount</Label>
                    <p className="text-xl font-bold">{formatCurrency(selectedReceipt.amountPaid)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Payment Method</Label>
                    <div className="mt-1">{getPaymentMethodBadge(selectedReceipt.paymentMethod)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Invoice Number</Label>
                    <p className="font-medium">{selectedReceipt.invoiceNo || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Payment Date</Label>
                    <p className="font-medium">{formatDate(selectedReceipt.createdAt)}</p>
                  </div>
                </div>
                {selectedReceipt.transactionReference && (
                  <div>
                    <Label className="text-muted-foreground">Transaction Reference</Label>
                    <p className="font-mono text-sm">{selectedReceipt.transactionReference}</p>
                  </div>
                )}
                {selectedReceipt.voidedAt && (
                  <div>
                    <Label className="text-muted-foreground">Void Reason</Label>
                    <p className="font-medium">{selectedReceipt.voidReason || 'N/A'}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                Close
              </Button>
              {selectedReceipt && (
                <Button onClick={() => handleDownloadPdf(selectedReceipt)}>
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
              <DialogTitle>Void Receipt</DialogTitle>
              <DialogDescription>
                This action cannot be undone. Please provide a reason for voiding this receipt.
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
                onClick={handleVoidReceipt}
                disabled={voidReceiptMutation.isPending || !voidReason.trim()}
              >
                {voidReceiptMutation.isPending ? 'Voiding...' : 'Void Receipt'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
