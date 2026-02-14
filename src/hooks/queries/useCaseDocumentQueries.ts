/**
 * TanStack Query hooks for case document aggregation.
 * Documents are dynamic (change when related entities change).
 */

import { useQuery } from '@tanstack/react-query';
import { QUERY_OPTIONS } from '@/lib/query/config';
import * as caseDocumentsApi from '@/lib/api/caseDocuments';

export const CASE_DOCUMENT_QUERY_KEYS = {
  DOCUMENTS: (caseId: string) => ['case-documents', caseId] as const,
  SUMMARY: (caseId: string) => ['case-documents', caseId, 'summary'] as const,
};

export function useCaseDocuments(caseId: string) {
  return useQuery({
    queryKey: CASE_DOCUMENT_QUERY_KEYS.DOCUMENTS(caseId),
    queryFn: () => caseDocumentsApi.getCaseDocuments(caseId),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!caseId,
  });
}

export function useCaseDocumentSummary(caseId: string) {
  return useQuery({
    queryKey: CASE_DOCUMENT_QUERY_KEYS.SUMMARY(caseId),
    queryFn: () => caseDocumentsApi.getCaseDocumentSummary(caseId),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!caseId,
  });
}
