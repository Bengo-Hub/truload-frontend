'use client';

import { PdfPreviewDialog } from '@/components/shared/PdfPreviewDialog';

interface ReportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blob: Blob | null;
  fileName: string;
  isLoading?: boolean;
}

export function ReportPreviewDialog({
  open,
  onOpenChange,
  blob,
  fileName,
  isLoading,
}: ReportPreviewDialogProps) {
  return (
    <PdfPreviewDialog
      open={open}
      onOpenChange={onOpenChange}
      blob={blob}
      fileName={fileName}
      title="Report Preview"
      isLoading={isLoading}
      orientation="landscape"
    />
  );
}
