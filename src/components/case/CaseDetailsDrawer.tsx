'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useCaseById, useSpecialReleasesByCase } from '@/hooks/queries';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import { ArrowRight, Loader2, Scale, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { CaseOverviewCards } from './CaseOverviewCards';
import { PdfPreviewDialog } from '@/components/shared/PdfPreviewDialog';
import { useDocumentPreview } from '@/hooks/useDocumentPreview';
import { downloadProhibitionOrderPdf, downloadSpecialReleaseCertificate } from '@/lib/api/caseRegister';
import { downloadWeightTicketPdf } from '@/lib/api/weighing';

interface CaseDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string | null;
  /** Opens the escalation chooser for this case. */
  onEscalate?: (caseId: string) => void;
}

const statusBadge = (status?: string) => {
  switch (status?.toUpperCase()) {
    case 'OPEN': return <Badge className="bg-blue-100 text-blue-800">Open</Badge>;
    case 'PENDING': return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    case 'ESCALATED': return <Badge className="bg-orange-100 text-orange-800">Escalated</Badge>;
    case 'CLOSED': return <Badge className="bg-green-100 text-green-800">Closed</Badge>;
    default: return <Badge variant="secondary">{status}</Badge>;
  }
};

/**
 * Read-only case details drawer opened from the case-register list "View" action.
 * Reuses CaseOverviewCards so layout stays in sync with the full detail page.
 */
export function CaseDetailsDrawer({ open, onOpenChange, caseId, onEscalate }: CaseDetailsDrawerProps) {
  const orgSlug = useOrgSlug();
  const { data: caseData, isLoading } = useCaseById(open && caseId ? caseId : undefined);
  const { data: specialReleases = [] } = useSpecialReleasesByCase(open && caseId ? caseId : undefined);
  const { openPreview, previewProps } = useDocumentPreview();

  const isEscalated = !!caseData?.escalatedToCaseManager || !!caseData?.hasProsecution
    || caseData?.caseStatus?.toUpperCase() === 'ESCALATED';
  const isClosed = caseData?.caseStatus?.toUpperCase() === 'CLOSED';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <span className="font-mono">{caseData?.caseNo ?? 'Case'}</span>
            {caseData && statusBadge(caseData.caseStatus)}
            {caseData?.hasProsecution && (
              <Badge className="bg-orange-100 text-orange-800">Escalated to Prosecution</Badge>
            )}
          </SheetTitle>
          <SheetDescription>{caseData?.vehicleRegNumber}</SheetDescription>
        </SheetHeader>

        <SheetBody className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading || !caseData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <CaseOverviewCards
              caseData={caseData}
              specialReleases={specialReleases}
              onViewWeightTicket={(weighingId) =>
                openPreview(() => downloadWeightTicketPdf(weighingId), {
                  fileName: `WeightTicket_${caseData.weighingTicketNo || weighingId}.pdf`,
                  title: 'Weight Ticket',
                })}
              onDownloadCertificate={(releaseId, certificateNo) =>
                openPreview(() => downloadSpecialReleaseCertificate(releaseId), {
                  fileName: `SpecialRelease_${certificateNo}.pdf`,
                  title: `Special Release ${certificateNo}`,
                })}
              onViewProhibition={(prohibitionOrderId) =>
                openPreview(() => downloadProhibitionOrderPdf(prohibitionOrderId), {
                  fileName: `ProhibitionOrder_${caseData.prohibitionNo || prohibitionOrderId}.pdf`,
                  title: 'Prohibition Order',
                })}
            />
          )}
        </SheetBody>

        <PdfPreviewDialog {...previewProps} />

        <SheetFooter className="px-6 py-4 border-t flex-row gap-2 sm:justify-between">
          {caseId && !isEscalated && !isClosed && onEscalate && (
            <Button variant="outline" onClick={() => onEscalate(caseId)}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Escalate
            </Button>
          )}
          {caseId && caseData?.hasProsecution && (
            <Button variant="outline" asChild>
              <Link href={`/${orgSlug}/cases/${caseId}?tab=prosecution`}>
                <Scale className="h-4 w-4 mr-2" />
                View Prosecution
              </Link>
            </Button>
          )}
          {caseId && (
            <Button asChild className="ml-auto">
              <Link href={`/${orgSlug}/cases/${caseId}`}>
                Open full page
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
