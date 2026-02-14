'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCaseDocuments, useCaseDocumentSummary } from '@/hooks/queries/useCaseDocumentQueries';
import type { CaseDocumentDto } from '@/lib/api/caseDocuments';
import { apiClient } from '@/lib/api/client';
import {
  Download,
  FileCheck,
  FileText,
  FileWarning,
  Gavel,
  Receipt,
  Scale,
  Shield,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';

const DOCUMENT_TYPE_CONFIG: Record<string, { icon: typeof FileText; color: string; label: string }> = {
  WeightTicket: { icon: Scale, color: 'text-blue-600 bg-blue-50', label: 'Weight Ticket' },
  ChargeSheet: { icon: Gavel, color: 'text-red-600 bg-red-50', label: 'Charge Sheet' },
  Invoice: { icon: FileText, color: 'text-purple-600 bg-purple-50', label: 'Invoice' },
  Receipt: { icon: Receipt, color: 'text-green-600 bg-green-50', label: 'Receipt' },
  CourtMinutes: { icon: FileCheck, color: 'text-amber-600 bg-amber-50', label: 'Court Minutes' },
  SpecialReleaseCertificate: { icon: Shield, color: 'text-orange-600 bg-orange-50', label: 'Special Release' },
  Subfile: { icon: Upload, color: 'text-gray-600 bg-gray-50', label: 'Subfile' },
};

function getDocConfig(type: string) {
  return DOCUMENT_TYPE_CONFIG[type] ?? { icon: FileWarning, color: 'text-gray-500 bg-gray-50', label: type };
}

interface DocumentsTabProps {
  caseId: string;
}

export function DocumentsTab({ caseId }: DocumentsTabProps) {
  const { data: documents, isLoading } = useCaseDocuments(caseId);
  const { data: summary } = useCaseDocumentSummary(caseId);

  const handleDownload = async (doc: CaseDocumentDto) => {
    try {
      // For subfiles with external URLs, open in new tab
      if (doc.documentType === 'Subfile' && doc.downloadUrl && !doc.downloadUrl.startsWith('/api')) {
        window.open(doc.downloadUrl, '_blank');
        return;
      }

      const response = await apiClient.get(doc.downloadUrl, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.displayName}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download document');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label="Total" count={summary.totalDocuments} />
          <SummaryCard label="Weight Tickets" count={summary.weightTickets} />
          <SummaryCard label="Charge Sheets" count={summary.chargeSheets} />
          <SummaryCard label="Invoices" count={summary.invoices + summary.receipts} />
        </div>
      )}

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Case Documents ({documents?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!documents || documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileWarning className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>No documents found for this case.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => {
                    const config = getDocConfig(doc.documentType);
                    const Icon = config.icon;
                    return (
                      <TableRow key={`${doc.documentType}-${doc.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded ${config.color}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-xs font-medium">{config.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{doc.displayName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {doc.referenceNo ?? '-'}
                        </TableCell>
                        <TableCell>
                          {doc.status ? (
                            <Badge variant="outline" className="text-xs">
                              {doc.status}
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {doc.downloadUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDownload(doc)}
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, count }: { label: string; count: number }) {
  return (
    <Card className="p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{count}</p>
    </Card>
  );
}
