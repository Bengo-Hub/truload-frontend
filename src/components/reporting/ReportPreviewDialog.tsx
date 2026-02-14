'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, X } from 'lucide-react';
import { triggerBlobDownload, revokeBlobUrl, createBlobUrl } from '@/lib/api/reports';

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (blob && blob.type === 'application/pdf') {
      const url = createBlobUrl(blob);
      setPreviewUrl(url);
      return () => {
        revokeBlobUrl(url);
        setPreviewUrl(null);
      };
    }
    setPreviewUrl(null);
  }, [blob]);

  const handleDownload = () => {
    if (blob) {
      triggerBlobDownload(blob, fileName);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Report Preview
          </DialogTitle>
          <DialogDescription>{fileName}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 rounded-lg border bg-muted/30 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Generating report...</p>
              </div>
            </div>
          ) : previewUrl ? (
            <iframe
              src={previewUrl}
              className="w-full h-full"
              title="Report Preview"
            />
          ) : blob ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3 text-center">
                <Download className="h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Preview not available for this format.
                </p>
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download {fileName}
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          <Button onClick={handleDownload} disabled={!blob || isLoading}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
