/**
 * Media upload and URL helpers for organisation branding (logos, login page image).
 * Uploads go to backend; in production backend uses tuload-backend-media storage.
 */

import { apiClient } from '@/lib/api/client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

/** Full URL for a media path returned by the backend (e.g. /media/organisation-branding/xxx.png). */
export function getMediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  const base = API_BASE.replace(/\/api\/v1\/?$/, '') || (typeof window !== 'undefined' ? window.location.origin : '');
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export interface UploadMediaResponse {
  url: string;
}

export async function uploadMedia(file: File, folder = 'organisation-branding'): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  const { data } = await apiClient.post<UploadMediaResponse>('/Media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data?.url ?? '';
}
