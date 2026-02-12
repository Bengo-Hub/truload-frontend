/**
 * File Upload API
 *
 * Handles multipart file uploads for case subfiles and other attachments.
 */

import { apiClient } from '@/lib/api/client';

export interface FileUploadResponse {
  filePath: string;
  fileUrl: string;
  mimeType: string;
  fileSizeBytes: number;
  originalFileName: string;
}

/**
 * Upload a file for a case subfile.
 * Uses multipart/form-data to send the file to the backend.
 */
export async function uploadSubfileDocument(
  caseId: string,
  file: File
): Promise<FileUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('caseId', caseId);

  const { data } = await apiClient.post<FileUploadResponse>(
    `/case/subfiles/upload`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return data;
}
