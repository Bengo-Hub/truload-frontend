"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer, X, FileText, ExternalLink, Loader2 } from 'lucide-react';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  pdfUrl?: string;
  pdfBlob?: Blob;
  downloadFileName?: string;
  isLoading?: boolean;
}

export function PdfPreviewModal({
  isOpen,
  onClose,
  title,
  pdfUrl,
  pdfBlob,
  downloadFileName = 'document.pdf',
  isLoading = false,
}: PdfPreviewModalProps) {
  const [blobUrl, setBlobUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      setBlobUrl(url);
      return () => {
        if (url) URL.revokeObjectURL(url);
      };
    } else {
      setBlobUrl(null);
    }
  }, [pdfBlob]);

  const displayUrl = pdfUrl || blobUrl;

  const handleDownload = () => {
    if (!displayUrl) return;
    const link = document.createElement('a');
    link.href = displayUrl;
    link.download = downloadFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!displayUrl) return;
    const printWindow = window.open(displayUrl, '_blank');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.print();
      }, true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-4 bg-white border-b flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">{title}</DialogTitle>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Document Preview</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pr-8">
            {!isLoading && displayUrl && (
              <>
                <Button variant="outline" size="sm" onClick={handlePrint} className="hidden sm:flex border-gray-200">
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload} className="border-gray-200">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-gray-100">
              <X className="h-5 w-5 text-gray-500" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 bg-gray-200 relative overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 bg-white/50 backdrop-blur-sm">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
              <p className="text-sm font-medium text-gray-600">Generating preview...</p>
            </div>
          ) : displayUrl ? (
            <iframe
              src={`${displayUrl}#toolbar=0`}
              className="w-full h-full border-none bg-gray-200"
              title={title}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4 bg-white">
              <div className="p-6 bg-gray-50 rounded-full">
                <FileText className="h-16 w-16 opacity-20" />
              </div>
              <p className="font-medium">No document available to preview</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 flex items-center justify-between sm:justify-end gap-3">
          <div className="sm:hidden">
            {displayUrl && (
               <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} className="font-semibold text-gray-600">
              Discard
            </Button>
            {displayUrl && (
              <Button asChild className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200">
                <a href={displayUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
