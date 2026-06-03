'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';

interface PreviewState {
  open: boolean;
  blob: Blob | null;
  isLoading: boolean;
  title: string;
  fileName: string;
  orientation: 'portrait' | 'landscape';
}

const INITIAL: PreviewState = {
  open: false,
  blob: null,
  isLoading: false,
  title: 'Document Preview',
  fileName: 'document.pdf',
  orientation: 'portrait',
};

/**
 * Uniform "preview-first" handling for generated PDFs (tickets, charge sheets, invoices,
 * receipts, special releases, prohibition orders). Fetches the blob and opens the shared
 * PdfPreviewDialog (which provides Download + Print), instead of triggering a direct download.
 *
 * Usage:
 *   const { openPreview, previewProps } = useDocumentPreview();
 *   <Button onClick={() => openPreview(() => downloadInvoicePdf(id), { fileName: `Invoice_${no}.pdf`, title: 'Invoice' })}/>
 *   <PdfPreviewDialog {...previewProps} />
 */
export function useDocumentPreview() {
  const [state, setState] = useState<PreviewState>(INITIAL);

  const openPreview = useCallback(
    async (
      fetchFn: () => Promise<Blob>,
      opts: { fileName: string; title?: string; orientation?: 'portrait' | 'landscape' }
    ) => {
      setState({
        open: true,
        blob: null,
        isLoading: true,
        title: opts.title ?? 'Document Preview',
        fileName: opts.fileName,
        orientation: opts.orientation ?? 'portrait',
      });
      try {
        const blob = await fetchFn();
        setState((s) => ({ ...s, blob, isLoading: false }));
      } catch {
        toast.error('Failed to load document');
        setState((s) => ({ ...s, open: false, isLoading: false }));
      }
    },
    []
  );

  const onOpenChange = useCallback((open: boolean) => setState((s) => ({ ...s, open })), []);

  return {
    openPreview,
    previewProps: {
      open: state.open,
      onOpenChange,
      blob: state.blob,
      fileName: state.fileName,
      title: state.title,
      isLoading: state.isLoading,
      orientation: state.orientation,
    },
  };
}
